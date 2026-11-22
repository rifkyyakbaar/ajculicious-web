'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '../lib/supabase/server';
import {
  ActionResponse,
  CreateOrderInput,
  CreateOrderSuccessData,
  DbPaymentMethod,
  OrderWithItems,
} from '../types/database';
import { OFFICIAL_INFO } from '../data/initial_data';
import {
  formatRupiah,
  inspectIndonesianPhoneNumber,
} from '../utils/formatters';
import {
  verifyWhatsAppNumberViaFonnte,
  sendFonnteWhatsAppMessage,
} from '../lib/fonnte';
import { evaluateBatchOpenStatus } from '../utils/batchSchedule';

/**
 * Server Action: createOrder (Hybrid Checkout)
 * ----------------------------------------------------------------------------
 * 1. Validasi input (customer_name wajib diisi, payment_method: 'COD' | 'QRIS', items > 0).
 * 2. Menjalankan transaksi atomik `create_hybrid_order` di PostgreSQL:
 *    - Mengunci baris produk (`FOR UPDATE`) dan mengambil harga asli dari tabel `products`.
 *    - Memastikan `is_available = true` dan `stock >= quantity`.
 *    - Menghitung `subtotal` & `total_price` murni di sisi server.
 *    - Membuat `invoice_code` unik harian (`AJC-YYMMDD-XXX`).
 *    - Menyimpan ke `orders` (status `'PENDING'`) & `order_items`, lalu mengurangi `stock`.
 * 3. Menyusun pesan WhatsApp terformat dan mengembalikan `whatsapp_url` + data invoice.
 */
const MAX_COD_TOTAL_PRICE = 100000;
const MAX_COD_TOTAL_ITEMS = 6;
const MAX_ACTIVE_COD_ORDERS_PER_PHONE = 2;

export async function createOrder(
  input: CreateOrderInput
): Promise<ActionResponse<CreateOrderSuccessData>> {
  try {
    const supabasePreCheck = createSupabaseServerClient();
    const { data: batchStatus } = await supabasePreCheck
      .from('batch_settings')
      .select('is_open, order_open_at, order_close_at')
      .eq('id', 1)
      .maybeSingle();

    if (batchStatus) {
      const evalSchedule = evaluateBatchOpenStatus(
        {
          isOpen: batchStatus.is_open,
          orderOpenAt: batchStatus.order_open_at,
          orderCloseAt: batchStatus.order_close_at,
        },
        Date.now()
      );
      if (!evalSchedule.effectiveIsOpen) {
        return {
          success: false,
          error: `${evalSchedule.statusLabel}. Pesanan baru belum dapat diterima.`,
        };
      }
    }

    // 1. Validasi Input Dasar & Anti-Pengguna Iseng
    const customerName = (input?.customer_name ?? '').trim();
    if (!customerName || customerName.length < 2) {
      return {
        success: false,
        error: 'Nama pemesan wajib diisi (minimal 2 karakter).',
      };
    }

    if (/^(.)\1{2,}$/i.test(customerName.replace(/\s+/g, ''))) {
      return {
        success: false,
        error: 'Mohon masukkan nama asli pemesan dengan benar.',
      };
    }

    // Validasi Prefix Operator Seluler Resmi Indonesia + Pola Angka
    const phoneValidation = inspectIndonesianPhoneNumber(
      input?.customer_phone ?? ''
    );
    if (!phoneValidation.valid) {
      return {
        success: false,
        error: phoneValidation.error || 'Nomor WhatsApp wajib diisi.',
      };
    }
    const normalizedPhone = phoneValidation.normalized;

    // Validasi Keaktifan Nomor di Server WhatsApp melalui Fonnte API Gateway
    const fonnteValidation = await verifyWhatsAppNumberViaFonnte(
      normalizedPhone
    );
    if (!fonnteValidation.isRegistered) {
      return {
        success: false,
        error:
          fonnteValidation.reason ||
          `Nomor ${normalizedPhone} tidak terdaftar sebagai akun WhatsApp aktif. Periksa kembali apakah ada salah ketik angka.`,
      };
    }

    const paymentMethod: DbPaymentMethod = input?.payment_method ?? 'COD';
    if (
      paymentMethod !== 'COD' &&
      paymentMethod !== 'QRIS' &&
      paymentMethod !== 'TRANSFER'
    ) {
      return {
        success: false,
        error: 'Metode pembayaran tidak valid. Pilih COD, QRIS, atau Transfer Bank.',
      };
    }

    const paymentProofUrl = (input?.payment_proof_url ?? '').trim() || null;
    if (
      (paymentMethod === 'QRIS' || paymentMethod === 'TRANSFER') &&
      !paymentProofUrl
    ) {
      return {
        success: false,
        error: `Silakan upload bukti pembayaran ${
          paymentMethod === 'TRANSFER' ? 'Transfer Bank' : 'QRIS'
        } terlebih dahulu.`,
      };
    }

    if (!Array.isArray(input?.items) || input.items.length === 0) {
      return {
        success: false,
        error: 'Keranjang pesanan masih kosong.',
      };
    }

    // Gabungkan item duplikat jika ada product_id + custom_name yang sama
    const mergedItemsMap = new Map<
      string,
      { product_id: string; quantity: number; custom_name?: string }
    >();
    let totalItemsQty = 0;
    for (const item of input.items) {
      if (!item.product_id || typeof item.quantity !== 'number' || item.quantity <= 0) {
        return {
          success: false,
          error: 'Format item produk atau kuantitas tidak valid.',
        };
      }
      const qty = Math.floor(item.quantity);
      const customName = item.custom_name?.trim() || undefined;
      const key = `${item.product_id}::${customName || ''}`;
      const existing = mergedItemsMap.get(key);
      if (existing) {
        existing.quantity += qty;
      } else {
        mergedItemsMap.set(key, {
          product_id: item.product_id,
          quantity: qty,
          custom_name: customName,
        });
      }
      totalItemsQty += qty;
    }

    if (paymentMethod === 'COD' && totalItemsQty > MAX_COD_TOTAL_ITEMS) {
      return {
        success: false,
        error: `Untuk mencegah pesanan fiktif, metode COD dibatasi maksimal ${MAX_COD_TOTAL_ITEMS} item. Silakan gunakan QRIS atau Transfer Bank.`,
      };
    }

    const normalizedItems = Array.from(mergedItemsMap.values());

    const supabase = createSupabaseServerClient();

    // Proteksi Anti-Spam COD di sisi Server Database:
    if (paymentMethod === 'COD') {
      // Cek harga produk untuk memastikan total COD <= MAX_COD_TOTAL_PRICE
      const productIds = normalizedItems.map((i) => i.product_id);
      const { data: dbProds } = await supabase
        .from('products')
        .select('id, price')
        .in('id', productIds);

      if (dbProds) {
        const priceMap = new Map(
          dbProds.map((p: { id: string; price: number }) => [p.id, p.price])
        );
        const estimatedTotal = normalizedItems.reduce(
          (sum, it) => sum + (priceMap.get(it.product_id) ?? 0) * it.quantity,
          0
        );
        if (estimatedTotal > MAX_COD_TOTAL_PRICE) {
          return {
            success: false,
            error: `Pesanan di atas ${formatRupiah(
              MAX_COD_TOTAL_PRICE
            )} wajib menggunakan metode QRIS atau Transfer Bank (Anti-Spam COD).`,
          };
        }
      }

      // Cek apakah nomor WA ini sudah punya terlalu banyak pesanan COD PENDING yang belum dibayar
      const { count: activeCodCount } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('customer_phone', normalizedPhone)
        .eq('payment_method', 'COD')
        .eq('status', 'PENDING')
        .eq('payment_status', 'BELUM_BAYAR');

      if ((activeCodCount ?? 0) >= MAX_ACTIVE_COD_ORDERS_PER_PHONE) {
        return {
          success: false,
          error: `Nomor WhatsApp ${normalizedPhone} masih memiliki ${activeCodCount} pesanan COD aktif yang belum diambil. Untuk memesan lagi, silakan pilih metode QRIS atau Transfer Bank.`,
        };
      }
    }

    // 2. Eksekusi Transaksi Atomik di Database Supabase
    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      'create_hybrid_order',
      {
        p_customer_name: customerName,
        p_payment_method: paymentMethod,
        p_items: normalizedItems,
        p_customer_phone: normalizedPhone,
        p_payment_proof_url: paymentProofUrl,
        p_bank_info: input?.bank_info?.trim() || null,
        p_customer_notes: input?.customer_notes?.trim() || null,
      }
    );

    if (rpcError || !rpcResult) {
      return {
        success: false,
        error:
          rpcError?.message ||
          'Gagal memproses pesanan. Pastikan produk masih dibuka untuk PO.',
      };
    }

    // 3. Susun Ringkasan Pesanan
    const createdOrder = rpcResult as Omit<
      CreateOrderSuccessData,
      'whatsapp_url' | 'whatsapp_message'
    >;

    const itemsLines = createdOrder.items
      .map(
        (it, idx) =>
          `${idx + 1}. ${it.product_name} (${it.quantity}x @ ${formatRupiah(
            it.price_at_purchase
          )}) = *${formatRupiah(it.subtotal)}*`
      )
      .join('\n');

    const paymentNote =
      createdOrder.payment_method === 'QRIS'
        ? 'QRIS (Bukti bayar telah diunggah melalui web)'
        : createdOrder.payment_method === 'TRANSFER'
        ? `Transfer Bank ${createdOrder.bank_info || ''} (Bukti TF telah diunggah melalui web)`
        : 'COD (Bayar tunai saat ambil pesanan di kampus)';

    const whatsappMessage = [
      `Halo Admin ${OFFICIAL_INFO.brandName},`,
      `Berikut detail pesanan saya melalui Web:`,
      ``,
      `Kode Invoice: #${createdOrder.invoice_code}`,
      `Nama Pemesan: ${createdOrder.customer_name}`,
      `No. WhatsApp: ${createdOrder.customer_phone || normalizedPhone}`,
      `Metode Bayar: ${paymentNote}`,
      ``,
      `Rincian Pesanan:`,
      itemsLines,
      ``,
      `Total Pembayaran: ${formatRupiah(createdOrder.total_price)}`,
    ].join('\n');

    const adminWaNumber =
      process.env.NEXT_PUBLIC_ADMIN_WA_NUMBER || OFFICIAL_INFO.whatsappNumber;
    const whatsappUrl = `https://wa.me/${adminWaNumber}?text=${encodeURIComponent(
      whatsappMessage
    )}`;

    // 4. Kirim Notifikasi Struk & Jadwal Pengambilan Otomatis ke WA Pembeli via Fonnte
    const { data: batchRow } = await supabase
      .from('batch_settings')
      .select('ready_pickup_date, ready_pickup_time, pickup_location')
      .eq('id', 1)
      .single();

    const pickupDateStr =
      batchRow?.ready_pickup_date || 'Jumat, 20 Nov 2026';
    const pickupTimeStr =
      batchRow?.ready_pickup_time || '13:00 - 17:00 WITA';
    const pickupLocationStr =
      batchRow?.pickup_location?.trim() || 'Konter Kampus AJCUlicious';

    const customerReceiptWaText = [
      `Halo ${createdOrder.customer_name},`,
      `Terima kasih telah memesan di ${OFFICIAL_INFO.brandName}. Pesanan Anda telah tercatat di sistem kami:`,
      ``,
      `Kode Invoice: #${createdOrder.invoice_code}`,
      `Metode Pembayaran: ${paymentNote}`,
      `Rincian Menu:`,
      itemsLines,
      `Total Pembayaran: ${formatRupiah(createdOrder.total_price)}`,
      ``,
      `Tanggal Pengambilan: ${pickupDateStr}`,
      `Jam Pengambilan: ${pickupTimeStr}`,
      `Lokasi Ambil: ${pickupLocationStr}`,
      ``,
      `Simpan kode invoice #${createdOrder.invoice_code} ini untuk ditunjukkan saat pengambilan pesanan. Terima kasih.`,
    ].join('\n');

    const sendRes = await sendFonnteWhatsAppMessage(
      normalizedPhone,
      customerReceiptWaText
    );

    // Revalidate halaman katalog, cek pesanan, dan admin
    revalidatePath('/');
    revalidatePath('/cek-pesanan');
    revalidatePath('/admin');

    return {
      success: true,
      data: {
        ...createdOrder,
        customer_phone: createdOrder.customer_phone || normalizedPhone,
        payment_proof_url: paymentProofUrl,
        bank_info: input?.bank_info?.trim() || null,
        customer_notes: input?.customer_notes?.trim() || null,
        whatsapp_url: whatsappUrl,
        whatsapp_message: whatsappMessage,
        wa_notification_sent: sendRes.sent,
        wa_verified_by_gateway: fonnteValidation.checkedWithGateway,
      },
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Terjadi kesalahan pada server.';
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Server Action: getOrderByInvoice (Lacak Pesanan Publik)
 * ----------------------------------------------------------------------------
 * Mencari pesanan hanya berdasarkan kecocokan persis (exact match) Kode Invoice
 * lengkap (contoh: AJCU-7K4M9P) agar data pesanan pelanggan lain tetap terjaga privasinya.
 */
export async function getOrderByInvoice(
  searchQuery: string
): Promise<ActionResponse<OrderWithItems[]>> {
  try {
    const cleanCode = (searchQuery ?? '')
      .trim()
      .replace(/^#/, '')
      .toUpperCase();
    if (!cleanCode || cleanCode.length < 6) {
      return {
        success: false,
        error: 'Masukkan Kode Invoice lengkap Anda (contoh: AJCU-7K4M9P).',
      };
    }

    const supabase = createSupabaseServerClient();

    const { data, error } = await supabase
      .from('orders')
      .select(
        `
        id,
        invoice_code,
        customer_name,
        customer_phone,
        payment_method,
        payment_status,
        payment_proof_url,
        bank_info,
        customer_notes,
        batch_number,
        batch_name,
        total_price,
        status,
        created_at,
        order_items (
          id,
          order_id,
          product_id,
          product_name_snapshot,
          quantity,
          price_at_purchase,
          subtotal
        )
      `
      )
      .eq('invoice_code', cleanCode)
      .limit(1);

    if (error) {
      return {
        success: false,
        error: 'Gagal mencari data pesanan.',
      };
    }

    return {
      success: true,
      data: (data as unknown as OrderWithItems[]) ?? [],
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Gagal memuat status pesanan.';
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Server Action: uploadOrderPaymentProof
 * ----------------------------------------------------------------------------
 * Menyimpan atau memperbarui bukti transfer / QRIS pada pesanan di database.
 */
export async function uploadOrderPaymentProof(
  orderId: string,
  paymentProofUrl: string
): Promise<ActionResponse<boolean>> {
  try {
    if (!orderId || !paymentProofUrl.trim()) {
      return {
        success: false,
        error: 'ID pesanan dan file bukti pembayaran wajib diisi.',
      };
    }

    const supabase = createSupabaseServerClient();
    const { error } = await supabase
      .from('orders')
      .update({ payment_proof_url: paymentProofUrl.trim() })
      .eq('id', orderId);

    if (error) {
      return {
        success: false,
        error: error.message || 'Gagal mengunggah bukti pembayaran.',
      };
    }

    revalidatePath('/');
    revalidatePath('/cek-pesanan');
    revalidatePath('/admin');

    return {
      success: true,
      data: true,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : 'Gagal menyimpan bukti pembayaran.',
    };
  }
}

/**
 * Server Action: updateOrderCustomerPhone
 * ----------------------------------------------------------------------------
 * Memungkinkan pembeli memperbaiki nomor WhatsApp jika salah ketik (typo),
 * memvalidasi ulang ke Fonnte & kode operator, lalu mengirim ulang struk WA.
 */
export async function updateOrderCustomerPhone(
  orderId: string,
  newPhoneRaw: string
): Promise<ActionResponse<{ normalizedPhone: string; waSent: boolean }>> {
  try {
    const phoneCheck = inspectIndonesianPhoneNumber(newPhoneRaw);
    if (!phoneCheck.valid) {
      return {
        success: false,
        error: phoneCheck.error || 'Nomor WhatsApp tidak valid.',
      };
    }

    const fonnteCheck = await verifyWhatsAppNumberViaFonnte(
      phoneCheck.normalized
    );
    if (!fonnteCheck.isRegistered) {
      return {
        success: false,
        error:
          fonnteCheck.reason ||
          `Nomor ${phoneCheck.normalized} tidak terdaftar di WhatsApp.`,
      };
    }

    const supabase = createSupabaseServerClient();
    const { data: updatedOrder, error } = await supabase
      .from('orders')
      .update({ customer_phone: phoneCheck.normalized })
      .eq('id', orderId)
      .select('invoice_code, customer_name, total_price, payment_method')
      .single();

    if (error || !updatedOrder) {
      return {
        success: false,
        error: error?.message || 'Gagal memperbarui nomor WhatsApp.',
      };
    }

    const { data: batchRow } = await supabase
      .from('batch_settings')
      .select('ready_pickup_date, ready_pickup_time, pickup_location')
      .eq('id', 1)
      .single();

    const msg = [
      `Halo ${updatedOrder.customer_name},`,
      `Nomor WhatsApp Anda untuk pesanan #${updatedOrder.invoice_code} (${formatRupiah(
        updatedOrder.total_price
      )}) telah diperbarui.`,
      `Tanggal Ambil: ${batchRow?.ready_pickup_date || 'Jumat, 20 Nov 2026'}`,
      `Jam Ambil: ${batchRow?.ready_pickup_time || '13:00 - 17:00 WITA'}`,
      `Lokasi Ambil: ${batchRow?.pickup_location?.trim() || 'Konter Kampus AJCUlicious'}`,
    ].join('\n');

    const sendRes = await sendFonnteWhatsAppMessage(phoneCheck.normalized, msg);

    revalidatePath('/cek-pesanan');
    revalidatePath('/admin');

    return {
      success: true,
      data: {
        normalizedPhone: phoneCheck.normalized,
        waSent: sendRes.sent,
      },
    };
  } catch (err: unknown) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : 'Gagal mengubah nomor WhatsApp.',
    };
  }
}

/**
 * Server Action: getOrdersByInvoiceList
 * ----------------------------------------------------------------------------
 * Mengambil daftar pesanan berdasarkan array kode invoice yang tersimpan
 * di memori browser (localStorage) pembeli tanpa memerlukan login.
 */
export async function getOrdersByInvoiceList(
  invoiceCodes: string[]
): Promise<ActionResponse<OrderWithItems[]>> {
  try {
    const cleanCodes = (invoiceCodes ?? [])
      .map((c) => c.trim().replace(/^#/, '').toUpperCase())
      .filter(Boolean)
      .slice(0, 15);

    if (cleanCodes.length === 0) {
      return { success: true, data: [] };
    }

    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from('orders')
      .select(
        `
        id,
        invoice_code,
        customer_name,
        customer_phone,
        payment_method,
        payment_status,
        payment_proof_url,
        bank_info,
        customer_notes,
        batch_number,
        batch_name,
        total_price,
        status,
        created_at,
        order_items (
          id,
          order_id,
          product_id,
          product_name_snapshot,
          quantity,
          price_at_purchase,
          subtotal
        )
      `
      )
      .in('invoice_code', cleanCodes)
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: 'Gagal memuat riwayat pesanan.' };
    }

    return {
      success: true,
      data: (data as unknown as OrderWithItems[]) ?? [],
    };
  } catch {
    return { success: false, error: 'Gagal memuat riwayat pesanan.' };
  }
}

/**
 * Server Action: verifyInvoiceForReview
 * ----------------------------------------------------------------------------
 * Memvalidasi kode invoice sebelum pelanggan mengisi ulasan dan memastikan
 * 1 kode invoice hanya bisa dipakai untuk 1 ulasan.
 */
export async function verifyInvoiceForReview(invoiceCode: string): Promise<
  ActionResponse<{
    invoiceCode: string;
    customerName: string;
    menuOrdered: string;
    totalPrice: number;
    createdAt: string;
    items: Array<{ productName: string; quantity: number }>;
  }>
> {
  try {
    const cleanInvoice = (invoiceCode ?? '')
      .trim()
      .replace(/^#/, '')
      .toUpperCase();

    if (!cleanInvoice || cleanInvoice.length < 6) {
      return {
        success: false,
        error: 'Masukkan kode invoice lengkap Anda (contoh: AJCU-7K4M9P).',
      };
    }

    const supabase = createSupabaseServerClient();

    const { data: orderRow, error: orderErr } = await supabase
      .from('orders')
      .select(
        `
        id,
        invoice_code,
        customer_name,
        total_price,
        created_at,
        status,
        order_items (
          product_name_snapshot,
          quantity
        )
      `
      )
      .eq('invoice_code', cleanInvoice)
      .maybeSingle();

    if (orderErr || !orderRow) {
      return {
        success: false,
        error: `Kode invoice #${cleanInvoice} tidak ditemukan. Periksa kembali kode pada struk pesanan Anda.`,
      };
    }

    if (orderRow.status === 'BATAL') {
      return {
        success: false,
        error: 'Pesanan yang dibatalkan tidak dapat diberikan ulasan.',
      };
    }

    const { data: existingReview } = await supabase
      .from('reviews')
      .select('id')
      .ilike('invoice_code', cleanInvoice)
      .maybeSingle();

    if (existingReview) {
      return {
        success: false,
        error: `Kode invoice #${cleanInvoice} sudah pernah digunakan untuk memberikan ulasan (1 invoice hanya 1 ulasan).`,
      };
    }

    const items = (orderRow.order_items ?? []) as Array<{
      product_name_snapshot: string;
      quantity: number;
    }>;
    const menuSummary =
      items.map((i) => i.product_name_snapshot).join(', ') || 'Menu AJCUlicious';

    return {
      success: true,
      data: {
        invoiceCode: orderRow.invoice_code,
        customerName: orderRow.customer_name,
        menuOrdered: menuSummary,
        totalPrice: orderRow.total_price,
        createdAt: orderRow.created_at,
        items: items.map((i) => ({
          productName: i.product_name_snapshot,
          quantity: i.quantity,
        })),
      },
    };
  } catch (err: unknown) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : 'Gagal memverifikasi kode invoice.',
    };
  }
}

const MAX_REVIEW_COMMENT_LENGTH = 180;

/**
 * Server Action: submitCustomerReview
 * ----------------------------------------------------------------------------
 * Menyimpan ulasan pelanggan baru langsung ke tabel `public.reviews` di Supabase
 * dengan verifikasi wajib kode invoice (1 kode invoice = 1 ulasan).
 */
export async function submitCustomerReview(input: {
  invoiceCode?: string;
  customerName?: string;
  rating: number;
  menuOrdered?: string;
  comment: string;
}): Promise<
  ActionResponse<{
    id: string;
    invoiceCode?: string;
    customerName: string;
    rating: number;
    menuOrdered: string;
    comment: string;
    date: string;
    isApproved: boolean;
  }>
> {
  try {
    const cleanInvoice = (input.invoiceCode ?? '')
      .trim()
      .replace(/^#/, '')
      .toUpperCase();
    const cleanName = (input.customerName ?? '').trim();
    const cleanComment = (input.comment ?? '').trim();

    if (!cleanInvoice || cleanInvoice.length < 6) {
      return {
        success: false,
        error: 'Kode invoice pesanan wajib diisi untuk memberikan ulasan.',
      };
    }

    if (!cleanComment) {
      return {
        success: false,
        error: 'Isi ulasan wajib diisi.',
      };
    }

    if (cleanComment.length > MAX_REVIEW_COMMENT_LENGTH) {
      return {
        success: false,
        error: `Ulasan maksimal ${MAX_REVIEW_COMMENT_LENGTH} karakter.`,
      };
    }

    const supabase = createSupabaseServerClient();

    // 1. Validasi kode invoice terdaftar & tidak dibatalkan
    const { data: orderRow, error: orderErr } = await supabase
      .from('orders')
      .select(
        `
        id,
        invoice_code,
        customer_name,
        status,
        order_items (
          product_name_snapshot
        )
      `
      )
      .eq('invoice_code', cleanInvoice)
      .maybeSingle();

    if (orderErr || !orderRow) {
      return {
        success: false,
        error: `Kode invoice #${cleanInvoice} tidak valid atau belum terdaftar.`,
      };
    }

    if (orderRow.status === 'BATAL') {
      return {
        success: false,
        error: 'Pesanan yang dibatalkan tidak dapat diberikan ulasan.',
      };
    }

    // 2. Pastikan 1 kode invoice hanya bisa membuat 1 ulasan
    const { data: existingReview } = await supabase
      .from('reviews')
      .select('id')
      .ilike('invoice_code', cleanInvoice)
      .maybeSingle();

    if (existingReview) {
      return {
        success: false,
        error: `Kode invoice #${cleanInvoice} sudah pernah digunakan untuk memberikan ulasan.`,
      };
    }

    const orderedMenus = ((orderRow.order_items ?? []) as Array<{
      product_name_snapshot: string;
    }>)
      .map((i) => i.product_name_snapshot)
      .join(', ');

    const { data, error } = await supabase
      .from('reviews')
      .insert({
        invoice_code: orderRow.invoice_code,
        customer_name: orderRow.customer_name || cleanName,
        rating: Math.min(5, Math.max(1, Math.round(input.rating || 5))),
        menu_ordered:
          orderedMenus ||
          (input.menuOrdered ?? '').trim() ||
          'Menu AJCUlicious',
        comment: cleanComment,
        is_approved: true,
      })
      .select('*')
      .single();

    if (error || !data) {
      if (error?.code === '23505') {
        return {
          success: false,
          error: `Kode invoice #${cleanInvoice} sudah pernah digunakan untuk memberikan ulasan.`,
        };
      }
      return {
        success: false,
        error: error?.message || 'Gagal menyimpan ulasan ke database.',
      };
    }

    revalidatePath('/');

    return {
      success: true,
      data: {
        id: data.id,
        invoiceCode: data.invoice_code || orderRow.invoice_code,
        customerName: data.customer_name,
        rating: data.rating,
        menuOrdered: data.menu_ordered,
        comment: data.comment,
        date: new Date(data.created_at).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
        isApproved: data.is_approved,
      },
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Gagal mengirim ulasan.',
    };
  }
}
