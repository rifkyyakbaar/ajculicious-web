'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '../lib/supabase/server';
import { sendFonnteWhatsAppMessage } from '../lib/fonnte';
import { formatRupiah } from '../utils/formatters';
import {
  ActionResponse,
  ActiveBatchInfo,
  AdminUserProfile,
  DbOrderStatus,
  DbPaymentStatus,
  OrderWithItems,
  ProductRow,
  SalesSummaryReport,
  TopSellingProductStat,
} from '../types/database';

/**
 * Server Action: loginAdmin
 * ----------------------------------------------------------------------------
 * Memverifikasi email & password admin terhadap tabel `public.admin_users`
 * di Supabase menggunakan fungsi RPC Bcrypt `public.verify_admin_login`.
 */
export async function loginAdmin(
  email: string,
  password: string
): Promise<ActionResponse<AdminUserProfile>> {
  try {
    const cleanEmail = (email ?? '').trim().toLowerCase();
    if (!cleanEmail || !password) {
      return {
        success: false,
        error: 'Email dan password wajib diisi.',
      };
    }

    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.rpc('verify_admin_login', {
      p_email: cleanEmail,
      p_password: password,
    });

    if (error || !data) {
      return {
        success: false,
        error: error?.message || 'Gagal menghubungi server autentikasi.',
      };
    }

    if (!data.authenticated || !data.admin) {
      return {
        success: false,
        error: data.error || 'Email atau password salah.',
      };
    }

    return {
      success: true,
      data: data.admin as AdminUserProfile,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Gagal login admin.',
    };
  }
}

/**
 * Server Action Admin: updateOrderStatus
 * ----------------------------------------------------------------------------
 * Mengubah status pesanan ('PENDING' -> 'SIAP_DIAMBIL' -> 'SELESAI' / 'BATAL').
 * Jika diubah menjadi 'BATAL', fungsi PostgreSQL `update_order_status_atomic`
 * otomatis mengembalikan stok produk ke tabel `products`.
 */
export async function updateOrderStatus(
  orderId: string,
  newStatus: DbOrderStatus
): Promise<ActionResponse<{ order_id: string; new_status: DbOrderStatus }>> {
  try {
    const validStatuses: DbOrderStatus[] = [
      'PENDING',
      'SIAP_DIAMBIL',
      'SELESAI',
      'BATAL',
    ];
    if (!orderId || !validStatuses.includes(newStatus)) {
      return {
        success: false,
        error: 'ID pesanan atau status baru tidak valid.',
      };
    }

    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.rpc('update_order_status_atomic', {
      p_order_id: orderId,
      p_new_status: newStatus,
    });

    if (error) {
      return {
        success: false,
        error: error.message || 'Gagal memperbarui status pesanan.',
      };
    }

    // Jika status diubah menjadi SIAP_DIAMBIL, otomatis kirim WA ke pelanggan via Fonnte
    if (newStatus === 'SIAP_DIAMBIL') {
      const { data: orderRow } = await supabase
        .from('orders')
        .select(
          `
          invoice_code,
          customer_name,
          customer_phone,
          payment_method,
          payment_status,
          total_price,
          order_items (
            quantity,
            product_name_snapshot
          )
        `
        )
        .eq('id', orderId)
        .single();

      if (
        orderRow &&
        orderRow.customer_phone &&
        orderRow.customer_phone !== '-'
      ) {
        const itemList = ((orderRow.order_items ?? []) as Array<{
          quantity: number;
          product_name_snapshot: string;
        }>)
          .map((i) => `- ${i.quantity}x ${i.product_name_snapshot}`)
          .join('\n');
        const isPaid = orderRow.payment_status === 'SUDAH_BAYAR';
        const paymentInfo = isPaid
          ? 'SUDAH BAYAR (LUNAS)'
          : `BELUM BAYAR (${orderRow.payment_method} - ${formatRupiah(
              orderRow.total_price
            )})`;

        const readyWaMsg = [
          `Halo ${orderRow.customer_name},`,
          `Pesanan Pre-Order AJCUlicious Anda saat ini sudah SIAP DIAMBIL:`,
          ``,
          `Kode Invoice: #${orderRow.invoice_code}`,
          `Status Pembayaran: ${paymentInfo}`,
          `Rincian Pesanan:`,
          itemList,
          ``,
          `Silakan tunjukkan kode invoice #${orderRow.invoice_code} saat pengambilan pesanan di konter. Terima kasih.`,
        ].join('\n');

        await sendFonnteWhatsAppMessage(orderRow.customer_phone, readyWaMsg);
      }
    }

    revalidatePath('/');
    revalidatePath('/cek-pesanan');

    return {
      success: true,
      data: {
        order_id: orderId,
        new_status: data?.new_status ?? newStatus,
      },
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Gagal mengubah status.',
    };
  }
}

/**
 * Server Action Admin: sendReadyPickupWhatsAppViaFonnte
 * ----------------------------------------------------------------------------
 * Mengirimkan chat WhatsApp "Pesanan Siap Diambil" secara langsung ke nomor
 * pelanggan melalui Fonnte API tanpa membuka tab wa.me.
 */
export async function sendReadyPickupWhatsAppViaFonnte(
  orderId: string
): Promise<ActionResponse<{ phone: string; detail?: string }>> {
  try {
    if (!orderId) {
      return { success: false, error: 'ID pesanan tidak valid.' };
    }

    const supabase = createSupabaseServerClient();
    const { data: orderRow, error } = await supabase
      .from('orders')
      .select(
        `
        invoice_code,
        customer_name,
        customer_phone,
        payment_method,
        payment_status,
        total_price,
        order_items (
          quantity,
          product_name_snapshot
        )
      `
      )
      .eq('id', orderId)
      .single();

    if (error || !orderRow) {
      return { success: false, error: 'Data pesanan tidak ditemukan.' };
    }

    if (!orderRow.customer_phone || orderRow.customer_phone === '-') {
      return {
        success: false,
        error: 'Pesanan ini tidak memiliki nomor WhatsApp pelanggan.',
      };
    }

    const itemList = ((orderRow.order_items ?? []) as Array<{
      quantity: number;
      product_name_snapshot: string;
    }>)
      .map((i) => `- ${i.quantity}x ${i.product_name_snapshot}`)
      .join('\n');

    const isPaid = orderRow.payment_status === 'SUDAH_BAYAR';
    const paymentInfo = isPaid
      ? 'SUDAH BAYAR (LUNAS)'
      : `BELUM BAYAR (${orderRow.payment_method} - ${formatRupiah(
          orderRow.total_price
        )})`;

    const { data: batchRow } = await supabase
      .from('batch_settings')
      .select('ready_pickup_date, ready_pickup_time, pickup_location')
      .eq('id', 1)
      .single();

    const pickupLocStr =
      batchRow?.pickup_location?.trim() || 'Konter Kampus AJCUlicious';
    const pickupDateStr = batchRow?.ready_pickup_date || 'Sesuai jadwal PO';
    const pickupTimeStr = batchRow?.ready_pickup_time || 'Sesuai jam PO';

    const readyWaMsg = [
      `Halo ${orderRow.customer_name},`,
      `Pesanan Pre-Order AJCUlicious Anda saat ini sudah SIAP DIAMBIL:`,
      ``,
      `Kode Invoice: #${orderRow.invoice_code}`,
      `Status Pembayaran: ${paymentInfo}`,
      `Lokasi Ambil: ${pickupLocStr}`,
      `Jadwal Ambil: ${pickupDateStr} (${pickupTimeStr})`,
      `Rincian Pesanan:`,
      itemList,
      ``,
      `Silakan tunjukkan kode invoice #${orderRow.invoice_code} saat pengambilan pesanan di ${pickupLocStr}. Terima kasih.`,
    ].join('\n');

    const res = await sendFonnteWhatsAppMessage(
      orderRow.customer_phone,
      readyWaMsg
    );

    if (!res.sent) {
      return {
        success: false,
        error:
          res.detail ||
          'Gagal mengirim pesan via Fonnte. Pastikan perangkat WA di dashboard Fonnte berstatus Connected.',
      };
    }

    return {
      success: true,
      data: {
        phone: orderRow.customer_phone,
        detail: res.detail,
      },
    };
  } catch (err: unknown) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : 'Gagal mengirim pesan WhatsApp otomatis.',
    };
  }
}

/**
 * Server Action Admin: updateOrderPaymentStatus
 * ----------------------------------------------------------------------------
 * Mengubah status pembayaran pesanan secara manual ('BELUM_BAYAR' | 'SUDAH_BAYAR')
 */
export async function updateOrderPaymentStatus(
  orderId: string,
  paymentStatus: DbPaymentStatus
): Promise<ActionResponse<{ order_id: string; payment_status: DbPaymentStatus }>> {
  try {
    if (
      !orderId ||
      (paymentStatus !== 'BELUM_BAYAR' && paymentStatus !== 'SUDAH_BAYAR')
    ) {
      return {
        success: false,
        error: 'Status pembayaran tidak valid.',
      };
    }

    const supabase = createSupabaseServerClient();
    const { error } = await supabase
      .from('orders')
      .update({ payment_status: paymentStatus })
      .eq('id', orderId);

    if (error) {
      return {
        success: false,
        error: error.message || 'Gagal memperbarui status pembayaran.',
      };
    }

    revalidatePath('/');
    revalidatePath('/cek-pesanan');
    revalidatePath('/admin');

    return {
      success: true,
      data: {
        order_id: orderId,
        payment_status: paymentStatus,
      },
    };
  } catch (err: unknown) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : 'Gagal mengubah status pembayaran.',
    };
  }
}

/**
 * Server Action Admin: CRUD Produk (Tambah / Update Harga, Bahan/Ingredients, & Status PO)
 */
export async function upsertProduct(input: {
  id?: string;
  category_slug: string;
  name: string;
  slug?: string;
  description: string;
  price: number;
  stock?: number;
  image_url?: string;
  badge?: string;
  emoji?: string;
  ingredients?: string[];
  is_available?: boolean;
}): Promise<ActionResponse<ProductRow>> {
  try {
    const cleanName = input.name.trim();
    if (!cleanName || input.price < 0) {
      return {
        success: false,
        error: 'Nama produk dan harga (>= 0) harus valid.',
      };
    }

    const slug =
      input.slug?.trim() ||
      cleanName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

    const supabase = createSupabaseServerClient();

    const { data: catData, error: catError } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', input.category_slug)
      .single();

    if (catError || !catData) {
      return {
        success: false,
        error: `Kategori "${input.category_slug}" tidak ditemukan.`,
      };
    }

    const cleanIngredients =
      input.ingredients && input.ingredients.length > 0
        ? input.ingredients.map((i) => i.trim()).filter(Boolean)
        : ['Bahan Pilihan Premium', 'Fresh Homemade'];

    const payload = {
      ...(input.id ? { id: input.id } : {}),
      category_id: catData.id,
      name: cleanName,
      slug,
      description: input.description.trim(),
      price: Math.floor(input.price),
      stock: 999,
      image_url: input.image_url || '/images/storefront-counter.jpg',
      badge: input.badge || 'Favorit',
      emoji: input.emoji || '🍪',
      ingredients: cleanIngredients,
      is_available:
        input.is_available !== undefined ? input.is_available : true,
    };

    const { data, error } = await supabase
      .from('products')
      .upsert(payload, { onConflict: 'slug' })
      .select('*')
      .single();

    if (error || !data) {
      return {
        success: false,
        error: error?.message || 'Gagal menyimpan produk ke database.',
      };
    }

    revalidatePath('/');
    revalidatePath('/admin');
    return {
      success: true,
      data: data as ProductRow,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Gagal menyimpan produk.',
    };
  }
}

/**
 * Server Action Admin: Toggle Status Ketersediaan PO & Update Harga Produk
 */
export async function updateProductStockAndAvailability(
  productId: string,
  _stock: number,
  isAvailable: boolean,
  price?: number
): Promise<ActionResponse<ProductRow>> {
  try {
    const supabase = createSupabaseServerClient();
    const updatePayload: Record<string, unknown> = {
      is_available: isAvailable,
    };
    if (typeof price === 'number' && price >= 0) {
      updatePayload.price = Math.floor(price);
    }

    const { data, error } = await supabase
      .from('products')
      .update(updatePayload)
      .eq('id', productId)
      .select('*')
      .single();

    if (error || !data) {
      return {
        success: false,
        error: error?.message || 'Gagal memperbarui status produk.',
      };
    }

    revalidatePath('/');
    revalidatePath('/admin');
    return {
      success: true,
      data: data as ProductRow,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Gagal memperbarui produk.',
    };
  }
}

/**
 * Helper parsing nomor batch dari nama batch (misal "Batch #7 - ..." -> 7)
 */
function parseBatchNumberFromName(name: string): number | null {
  const match = name.match(/#\s*(\d+)/) || name.match(/\bbatch\s+(\d+)\b/i);
  if (!match) return null;
  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : null;
}

/**
 * Server Action Admin: Update Pengaturan Batch PO di Database Supabase
 */
export async function updateBatchSettingsInDb(input: {
  batchNumber?: number;
  batchName: string;
  isOpen: boolean;
  orderOpenAt?: string | null;
  orderCloseAt?: string | null;
  orderDeadline: string;
  pickupDateIso?: string | null;
  pickupStartTime?: string;
  pickupEndTime?: string;
  readyPickupDate: string;
  readyPickupTime: string;
  pickupLocation?: string;
}): Promise<ActionResponse<{ batchNumber: number }>> {
  try {
    if (input.orderOpenAt && input.orderCloseAt) {
      const openMs = Date.parse(input.orderOpenAt);
      const closeMs = Date.parse(input.orderCloseAt);
      if (!Number.isNaN(openMs) && !Number.isNaN(closeMs) && closeMs <= openMs) {
        return {
          success: false,
          error:
            'Batas tutup Pre-Order harus lebih lambat daripada waktu buka Pre-Order.',
        };
      }
    }

    const supabase = createSupabaseServerClient();
    const cleanName = input.batchName.trim();
    let resolvedBatchNumber =
      typeof input.batchNumber === 'number' &&
      Number.isFinite(input.batchNumber) &&
      input.batchNumber >= 1
        ? Math.floor(input.batchNumber)
        : parseBatchNumberFromName(cleanName);

    if (!resolvedBatchNumber) {
      const { data: currentBatch } = await supabase
        .from('batch_settings')
        .select('batch_number')
        .eq('id', 1)
        .maybeSingle();
      resolvedBatchNumber = Math.max(currentBatch?.batch_number ?? 1, 1);
    }

    const { error } = await supabase
      .from('batch_settings')
      .update({
        batch_number: resolvedBatchNumber,
        batch_name: cleanName,
        is_open: input.isOpen,
        order_open_at: input.orderOpenAt ?? null,
        order_close_at: input.orderCloseAt ?? null,
        order_deadline: input.orderDeadline.trim(),
        pickup_date_iso: input.pickupDateIso || null,
        pickup_start_time: input.pickupStartTime?.trim() || '13:00',
        pickup_end_time: input.pickupEndTime?.trim() || '17:00',
        ready_pickup_date: input.readyPickupDate.trim(),
        ready_pickup_time: input.readyPickupTime.trim(),
        pickup_location:
          input.pickupLocation?.trim() || 'Konter Kampus AJCUlicious',
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1);

    if (error) {
      return {
        success: false,
        error: error.message || 'Gagal menyimpan jadwal Batch PO.',
      };
    }

    revalidatePath('/');
    revalidatePath('/cek-pesanan');
    revalidatePath('/admin');
    return { success: true, data: { batchNumber: resolvedBatchNumber } };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Gagal menyimpan jadwal PO.',
    };
  }
}

/**
 * Server Action Admin: Ambil Semua Pesanan, Info Batch Aktif & Ringkasan Penjualan
 */
export async function getAdminOrdersAndSummary(): Promise<
  ActionResponse<{
    orders: OrderWithItems[];
    summary: SalesSummaryReport;
    activeBatch: ActiveBatchInfo;
  }>
> {
  try {
    const supabase = createSupabaseServerClient();

    const [{ data: ordersData, error }, { data: batchRow }] = await Promise.all([
      supabase
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
        .order('created_at', { ascending: false }),
      supabase
        .from('batch_settings')
        .select('batch_number, batch_name')
        .eq('id', 1)
        .maybeSingle(),
    ]);

    if (error) {
      return {
        success: false,
        error: error.message || 'Gagal memuat laporan pesanan.',
      };
    }

    const activeBatch: ActiveBatchInfo = {
      batch_number: Math.max(batchRow?.batch_number ?? 1, 1),
      batch_name:
        batchRow?.batch_name?.trim() ||
        `Batch #${Math.max(batchRow?.batch_number ?? 1, 1)}`,
    };

    const orders = (ordersData as unknown as OrderWithItems[]) ?? [];
    const activeOrders = orders.filter((o) => o.status !== 'BATAL');

    const totalOmzet = activeOrders.reduce((sum, o) => sum + o.total_price, 0);
    const codOrdersCount = activeOrders.filter(
      (o) => o.payment_method === 'COD'
    ).length;
    const qrisOrdersCount = activeOrders.filter(
      (o) => o.payment_method === 'QRIS'
    ).length;
    const transferOrdersCount = activeOrders.filter(
      (o) => o.payment_method === 'TRANSFER'
    ).length;

    const productStatsMap = new Map<string, TopSellingProductStat>();
    for (const order of activeOrders) {
      for (const item of order.order_items ?? []) {
        const existing = productStatsMap.get(item.product_id) ?? {
          product_id: item.product_id,
          product_name: item.product_name_snapshot,
          total_quantity_sold: 0,
          total_revenue: 0,
        };
        existing.total_quantity_sold += item.quantity;
        existing.total_revenue += item.subtotal;
        productStatsMap.set(item.product_id, existing);
      }
    }

    const topProducts = Array.from(productStatsMap.values()).sort(
      (a, b) => b.total_quantity_sold - a.total_quantity_sold
    );

    const summary: SalesSummaryReport = {
      total_omzet: totalOmzet,
      total_orders: orders.length,
      cod_orders_count: codOrdersCount,
      qris_orders_count: qrisOrdersCount,
      transfer_orders_count: transferOrdersCount,
      paid_orders_count: activeOrders.filter(
        (o) => o.payment_status === 'SUDAH_BAYAR'
      ).length,
      unpaid_orders_count: activeOrders.filter(
        (o) => (o.payment_status || 'BELUM_BAYAR') === 'BELUM_BAYAR'
      ).length,
      pending_orders_count: orders.filter((o) => o.status === 'PENDING').length,
      ready_orders_count: orders.filter((o) => o.status === 'SIAP_DIAMBIL')
        .length,
      completed_orders_count: orders.filter((o) => o.status === 'SELESAI')
        .length,
      cancelled_orders_count: orders.filter((o) => o.status === 'BATAL').length,
      top_products: topProducts,
    };

    return {
      success: true,
      data: {
        orders,
        summary,
        activeBatch,
      },
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Gagal memuat ringkasan.',
    };
  }
}
