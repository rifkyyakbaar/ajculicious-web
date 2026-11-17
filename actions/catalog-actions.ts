'use server';

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

const EMOJI_BY_CATEGORY: Record<string, string> = {
  'dubai-cookies': '🍪',
  cookies: '🍪',
  brownies: '🍫',
  'dessert-box': '🧁',
  dimsum: '🥟',
};

function mapDbProductToUiProduct(row: ProductRow): Product {
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
        : ['Bahan Pilihan Premium', 'Fresh Homemade'],
    isActive: row.is_available,
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

    const { data, error } = await query;
    if (error || !data) return [];

    return (data as unknown as ProductRow[]).map(mapDbProductToUiProduct);
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
  const defaultBatch: BatchPOConfig = {
    batchNumber: 4,
    batchName: 'Batch #4 - November Sweet Week',
    isOpen: true,
    orderDeadline: 'Kamis, 19 Nov 2026, 21:00 WITA',
    readyPickupDate: 'Jumat, 20 Nov 2026',
    readyPickupTime: '13:00 - 17:00 WITA',
    pickupLocations: ['Konter AJCUlicious'],
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

    return {
      batchNumber: row.batch_number,
      batchName: row.batch_name,
      isOpen: row.is_open,
      orderDeadline: row.order_deadline,
      readyPickupDate: row.ready_pickup_date,
      readyPickupTime: row.ready_pickup_time,
      pickupLocations: ['Konter AJCUlicious'],
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
