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
import { formatRupiah } from '../utils/formatters';

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
export async function createOrder(
  input: CreateOrderInput
): Promise<ActionResponse<CreateOrderSuccessData>> {
  try {
    // 1. Validasi Input Dasar
    const customerName = (input?.customer_name ?? '').trim();
    if (!customerName || customerName.length < 2) {
      return {
        success: false,
        error: 'Nama pemesan wajib diisi (minimal 2 karakter).',
      };
    }

    const paymentMethod: DbPaymentMethod = input?.payment_method ?? 'COD';
    if (paymentMethod !== 'COD' && paymentMethod !== 'QRIS') {
      return {
        success: false,
        error: 'Metode pembayaran tidak valid. Pilih COD atau QRIS.',
      };
    }

    if (!Array.isArray(input?.items) || input.items.length === 0) {
      return {
        success: false,
        error: 'Keranjang pesanan masih kosong.',
      };
    }

    // Gabungkan item duplikat jika ada product_id yang sama
    const mergedItemsMap = new Map<string, number>();
    for (const item of input.items) {
      if (!item.product_id || typeof item.quantity !== 'number' || item.quantity <= 0) {
        return {
          success: false,
          error: 'Format item produk atau kuantitas tidak valid.',
        };
      }
      const prevQty = mergedItemsMap.get(item.product_id) ?? 0;
      mergedItemsMap.set(item.product_id, prevQty + Math.floor(item.quantity));
    }

    const normalizedItems = Array.from(mergedItemsMap.entries()).map(
      ([product_id, quantity]) => ({
        product_id,
        quantity,
      })
    );

    // 2. Eksekusi Transaksi Atomik di Database Supabase
    const supabase = createSupabaseServerClient();
    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      'create_hybrid_order',
      {
        p_customer_name: customerName,
        p_payment_method: paymentMethod,
        p_items: normalizedItems,
      }
    );

    if (rpcError || !rpcResult) {
      return {
        success: false,
        error:
          rpcError?.message ||
          'Gagal memproses pesanan. Pastikan stok produk masih mencukupi.',
      };
    }

    // 3. Susun Format Pesan WhatsApp Admin
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
        ? 'QRIS Statis (Saya lampirkan screenshot bukti pembayaran QRIS di chat ini)'
        : 'COD (Bayar tunai saat ambil pesanan di kampus)';

    const whatsappMessage = [
      `Halo Admin *${OFFICIAL_INFO.brandName}*! 👋`,
      `Saya ingin konfirmasi pesanan *Ambil di Kampus*:`,
      ``,
      `🧾 *Kode Invoice:* #${createdOrder.invoice_code}`,
      `👤 *Nama Pemesan:* ${createdOrder.customer_name}`,
      `💳 *Metode Bayar:* ${paymentNote}`,
      ``,
      `📦 *Rincian Pesanan:*`,
      itemsLines,
      ``,
      `💰 *Total Pembayaran:* *${formatRupiah(createdOrder.total_price)}*`,
      `📍 *Pengambilan:* Ambil di Kampus (Bebas Ongkir)`,
      ``,
      `Mohon diproses ya Kak, terima kasih! 🙏`,
    ].join('\n');

    const adminWaNumber =
      process.env.NEXT_PUBLIC_ADMIN_WA_NUMBER || OFFICIAL_INFO.whatsappNumber;
    const whatsappUrl = `https://wa.me/${adminWaNumber}?text=${encodeURIComponent(
      whatsappMessage
    )}`;

    // Revalidate halaman katalog & cek pesanan agar stok terbaru tampil
    revalidatePath('/');
    revalidatePath('/cek-pesanan');

    return {
      success: true,
      data: {
        ...createdOrder,
        whatsapp_url: whatsappUrl,
        whatsapp_message: whatsappMessage,
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
 * Mencari pesanan berdasarkan `invoice_code` (contoh: AJC-261117-001)
 * atau `customer_name` tanpa mengekspos data sensitif.
 */
export async function getOrderByInvoice(
  searchQuery: string
): Promise<ActionResponse<OrderWithItems[]>> {
  try {
    const cleanQuery = (searchQuery ?? '').trim().replace(/^#/, '');
    if (!cleanQuery || cleanQuery.length < 2) {
      return {
        success: false,
        error: 'Masukkan Kode Invoice atau Nama Pemesan (minimal 2 karakter).',
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
        payment_method,
        payment_status,
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
      .or(
        `invoice_code.ilike.%${cleanQuery}%,customer_name.ilike.%${cleanQuery}%`
      )
      .order('created_at', { ascending: false })
      .limit(10);

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
 * Server Action: submitCustomerReview
 * ----------------------------------------------------------------------------
 * Menyimpan ulasan pelanggan baru langsung ke tabel `public.reviews` di Supabase.
 */
export async function submitCustomerReview(input: {
  customerName: string;
  faculty?: string;
  rating: number;
  menuOrdered: string;
  comment: string;
}): Promise<
  ActionResponse<{
    id: string;
    customerName: string;
    faculty: string;
    rating: number;
    menuOrdered: string;
    comment: string;
    date: string;
    isApproved: boolean;
  }>
> {
  try {
    const cleanName = (input.customerName ?? '').trim();
    const cleanComment = (input.comment ?? '').trim();
    if (!cleanName || !cleanComment) {
      return {
        success: false,
        error: 'Nama dan isi ulasan wajib diisi.',
      };
    }

    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from('reviews')
      .insert({
        customer_name: cleanName,
        faculty: (input.faculty ?? '').trim() || 'Pelanggan',
        rating: Math.min(5, Math.max(1, Math.round(input.rating || 5))),
        menu_ordered: (input.menuOrdered ?? '').trim() || 'Menu AJCUlicious',
        comment: cleanComment,
        is_approved: true,
      })
      .select('*')
      .single();

    if (error || !data) {
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
        customerName: data.customer_name,
        faculty: data.faculty,
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
