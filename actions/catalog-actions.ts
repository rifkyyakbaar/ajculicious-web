'use server';

import { connection } from 'next/server';
import { createSupabaseServerClient } from '../lib/supabase/server';
import {
  BatchSettingsRow,
  CategoryRow,
  ProductRow,
  ReviewRow,
} from '../types/database';
import {
  BatchPOConfig,
  CategorySlug,
  Product,
  ReviewRecord,
} from '../types/ajculicious';
import { evaluateBatchOpenStatus } from '../utils/batchSchedule';

const EMOJI_BY_CATEGORY: Record<string, string> = {
  'dubai-cookies': '🍪',
  cookies: '🍪',
  brownies: '🍫',
  'dessert-box': '🧁',
  dimsum: '🥟',
};

function mapDbProductToUiProduct(
  row: ProductRow,
  totalSold = 0,
  isBestSeller = false
): Product {
  const catSlug = (row.categories?.slug || 'cookies') as CategorySlug;
  const catName = row.categories?.name || 'Cookies';
  const emoji =
    row.emoji ||
    (row.name.toLowerCase().includes('matcha')
      ? '🍵'
      : row.name.toLowerCase().includes('mentai')
      ? '🔥'
      : EMOJI_BY_CATEGORY[catSlug] || '🍪');

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    category: catSlug,
    categoryLabel: catName,
    price: row.price,
    stockQuota: 999,
    originalQuota: 999,
    badges: row.badge ? [row.badge] : [],
    description: row.description,
    emoji,
    imageUrl: row.image_url,
    ingredients:
      row.ingredients && row.ingredients.length > 0
        ? row.ingredients
        : [],
    isActive: row.is_available,
    totalSold,
    isBestSeller,
  };
}

export async function getCatalogProducts(
  categorySlug?: string,
  includeUnavailable = false
): Promise<Product[]> {
  try {
    const supabase = createSupabaseServerClient();

    let query = supabase
      .from('products')
      .select(
        `
        id,
        category_id,
        name,
        slug,
        description,
        price,
        stock,
        image_url,
        badge,
        emoji,
        ingredients,
        is_available,
        created_at,
        categories!inner (
          id,
          name,
          slug
        )
      `
      )
      .order('created_at', { ascending: true });

    if (!includeUnavailable) {
      query = query.eq('is_available', true);
    }

    if (categorySlug && categorySlug !== 'all') {
      query = query.eq('categories.slug', categorySlug);
    }

    const needsGlobalRankingMeta = Boolean(categorySlug && categorySlug !== 'all');
    const [{ data, error }, { data: salesRows }, globalMetaRes] = await Promise.all([
      query,
      supabase
        .from('order_items')
        .select('product_id, quantity, orders!inner(status)')
        .neq('orders.status', 'BATAL'),
      needsGlobalRankingMeta
        ? supabase
            .from('products')
            .select('id, slug, name, created_at')
            .eq('is_available', true)
            .order('created_at', { ascending: true })
        : Promise.resolve({ data: null }),
    ]);

    if (error || !data) return [];

    // Hitung total checkout per produk (kecuali pesanan yang dibatalkan)
    const soldMap = new Map<string, number>();
    if (Array.isArray(salesRows)) {
      for (const item of salesRows as Array<{
        product_id: string;
        quantity: number;
      }>) {
        soldMap.set(
          item.product_id,
          (soldMap.get(item.product_id) ?? 0) + (item.quantity || 0)
        );
      }
    }

    const productRows = data as unknown as ProductRow[];
    const rankingRows = (
      needsGlobalRankingMeta && Array.isArray(globalMetaRes.data)
        ? (globalMetaRes.data as Array<{ id: string; slug: string; name: string }>)
        : productRows
    );

    const isBrownies200 = (r: { slug: string; name: string }) =>
      r.slug === 'brownies-200g' || r.name.trim().toLowerCase() === 'brownies (200g)';
    const isBrowniesMain = (r: { slug: string; name: string }) =>
      r.slug === 'fudgy-shiny-crust-brownies' || r.name.trim().toLowerCase() === 'brownies';

    const brownies200Row = rankingRows.find(isBrownies200);
    const browniesMainRow = rankingRows.find(
      (r) => r.id !== brownies200Row?.id && isBrowniesMain(r)
    );

    const effectiveSoldMap = new Map(soldMap);
    if (brownies200Row && browniesMainRow) {
      effectiveSoldMap.set(
        browniesMainRow.id,
        (effectiveSoldMap.get(browniesMainRow.id) ?? 0) +
          (effectiveSoldMap.get(brownies200Row.id) ?? 0)
      );
    }

    // Ambil maksimal Top 3 menu dengan jumlah checkout terbanyak
    const top3Ids = new Set(
      rankingRows
        .filter((r) => !(browniesMainRow && brownies200Row && r.id === brownies200Row.id))
        .map((r) => ({ id: r.id, sold: effectiveSoldMap.get(r.id) ?? 0 }))
        .filter((entry) => entry.sold > 0)
        .sort((a, b) => b.sold - a.sold)
        .slice(0, 3)
        .map((entry) => entry.id)
    );

    return productRows.map((row) => {
      const sold = effectiveSoldMap.get(row.id) ?? 0;
      const isHiddenVariant = Boolean(
        browniesMainRow && brownies200Row && row.id === brownies200Row.id
      );
      const isBest = !isHiddenVariant && top3Ids.has(row.id);
      return mapDbProductToUiProduct(row, sold, isBest);
    });
  } catch {
    return [];
  }
}

export async function getReviewsFromDb(): Promise<ReviewRecord[]> {
  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('is_approved', true)
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return (data as ReviewRow[]).map((r) => ({
      id: r.id,
      invoiceCode: r.invoice_code || undefined,
      customerName: r.customer_name,
      faculty: r.faculty,
      rating: r.rating,
      menuOrdered: r.menu_ordered,
      comment: r.comment,
      date: new Date(r.created_at).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
      isApproved: r.is_approved,
    }));
  } catch {
    return [];
  }
}

export async function getBatchSettingsFromDb(): Promise<BatchPOConfig> {
  // Pastikan jadwal buka/tutup PO hanya dievaluasi saat request masuk (bukan saat prerender)
  await connection();
  const nowMs = Date.now();

  const defaultEval = evaluateBatchOpenStatus(
    {
      isOpen: true,
      orderOpenAt: '2026-11-18T08:00:00+08:00',
      orderCloseAt: '2026-11-19T21:00:00+08:00',
    },
    nowMs
  );
  const defaultBatch: BatchPOConfig = {
    batchNumber: 4,
    batchName: 'Batch #4 - November Sweet Week',
    isOpen: defaultEval.effectiveIsOpen,
    manualIsOpen: true,
    orderOpenAt: '2026-11-18T08:00:00+08:00',
    orderCloseAt: '2026-11-19T21:00:00+08:00',
    orderDeadline: 'Kamis, 19 Nov 2026, 21:00 WITA',
    pickupDateIso: '2026-11-20',
    pickupStartTime: '13:00',
    pickupEndTime: '17:00',
    readyPickupDate: 'Jumat, 20 Nov 2026',
    readyPickupTime: '13:00 - 17:00 WITA',
    pickupLocations: ['Konter Kampus AJCUlicious'],
  };

  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from('batch_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (error || !data) return defaultBatch;
    const row = data as BatchSettingsRow;
    const loc = row.pickup_location?.trim() || 'Konter Kampus AJCUlicious';
    const evalResult = evaluateBatchOpenStatus(
      {
        isOpen: row.is_open,
        orderOpenAt: row.order_open_at,
        orderCloseAt: row.order_close_at,
      },
      nowMs
    );

    return {
      batchNumber: row.batch_number,
      batchName: row.batch_name,
      isOpen: evalResult.effectiveIsOpen,
      manualIsOpen: row.is_open,
      orderOpenAt: row.order_open_at ?? null,
      orderCloseAt: row.order_close_at ?? null,
      orderDeadline: row.order_deadline,
      pickupDateIso: row.pickup_date_iso ?? '2026-11-20',
      pickupStartTime: row.pickup_start_time ?? '13:00',
      pickupEndTime: row.pickup_end_time ?? '17:00',
      readyPickupDate: row.ready_pickup_date,
      readyPickupTime: row.ready_pickup_time,
      pickupLocations: [loc],
    };
  } catch {
    return defaultBatch;
  }
}

export async function getAllCategories(): Promise<CategoryRow[]> {
  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, slug, created_at')
      .order('created_at', { ascending: true });

    if (error || !data) return [];
    return data as CategoryRow[];
  } catch {
    return [];
  }
}

export async function getStorefrontInitialData() {
  const [products, reviews, batchConfig, categories] = await Promise.all([
    getCatalogProducts('all', false),
    getReviewsFromDb(),
    getBatchSettingsFromDb(),
    getAllCategories(),
  ]);

  return {
    products,
    reviews,
    batchConfig,
    categories,
  };
}
