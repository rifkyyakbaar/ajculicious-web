-- ============================================================================
-- AJCUlicious E-Business Database Schema (Supabase PostgreSQL 17)
-- Model: Campus Pickup (Ambil di Kampus, shipping_fee = 0)
-- Payment Methods: COD (Default) & QRIS Statis
-- ============================================================================

-- 1. ENUM TYPES
DO $$ BEGIN
  CREATE TYPE public.payment_method_enum AS ENUM ('COD', 'QRIS', 'TRANSFER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TYPE public.payment_method_enum ADD VALUE IF NOT EXISTS 'TRANSFER';

DO $$ BEGIN
  CREATE TYPE public.order_status_enum AS ENUM ('PENDING', 'SIAP_DIAMBIL', 'SELESAI', 'BATAL');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. RELATIONAL TABLES (4 CORE TABLES)

-- 2.1. categories
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.2. products
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  name VARCHAR(150) NOT NULL,
  slug VARCHAR(150) NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  price INTEGER NOT NULL CHECK (price >= 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  image_url TEXT,
  badge VARCHAR(80),
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.3. orders (Mendukung Nomor WA, Bukti TF/QRIS, dan Pemesanan Langsung via Web)
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_code VARCHAR(40) NOT NULL UNIQUE,
  customer_name VARCHAR(120) NOT NULL CHECK (length(trim(customer_name)) > 0),
  customer_phone VARCHAR(30) NOT NULL DEFAULT '-',
  payment_method public.payment_method_enum NOT NULL DEFAULT 'COD',
  payment_proof_url TEXT,
  bank_info VARCHAR(100),
  customer_notes TEXT,
  total_price INTEGER NOT NULL CHECK (total_price >= 0),
  status public.order_status_enum NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.4. order_items
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  product_name_snapshot VARCHAR(150) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price_at_purchase INTEGER NOT NULL CHECK (price_at_purchase >= 0),
  subtotal INTEGER NOT NULL CHECK (subtotal >= 0)
);

-- 3. PERFORMANCE INDEXES (FK & SEARCH COLUMNS)
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_is_available ON public.products(is_available);
CREATE INDEX IF NOT EXISTS idx_orders_invoice_code ON public.orders(invoice_code);
CREATE INDEX IF NOT EXISTS idx_orders_customer_name_lower ON public.orders(lower(customer_name));
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON public.orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);

-- 4. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Policies for categories
CREATE POLICY "categories_select_public" ON public.categories
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "categories_insert_admin" ON public.categories
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "categories_update_admin" ON public.categories
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- Policies for products
CREATE POLICY "products_select_public" ON public.products
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "products_insert_admin" ON public.products
  FOR INSERT TO anon, authenticated
  WITH CHECK (price >= 0 AND stock >= 0);

CREATE POLICY "products_update_public_and_admin" ON public.products
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (price >= 0 AND stock >= 0);

-- Policies for orders
CREATE POLICY "orders_select_public" ON public.orders
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "orders_insert_checkout" ON public.orders
  FOR INSERT TO anon, authenticated
  WITH CHECK (status = 'PENDING' AND total_price >= 0 AND length(trim(customer_name)) > 0);

CREATE POLICY "orders_update_status" ON public.orders
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (total_price >= 0);

-- Policies for order_items
CREATE POLICY "order_items_select_public" ON public.order_items
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "order_items_insert_checkout" ON public.order_items
  FOR INSERT TO anon, authenticated
  WITH CHECK (quantity > 0 AND price_at_purchase >= 0 AND subtotal >= 0);

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.categories, public.products, public.orders, public.order_items TO anon, authenticated;

-- 5. ATOMIC WEB CHECKOUT RPC FUNCTION
CREATE OR REPLACE FUNCTION public.create_hybrid_order(
  p_customer_name TEXT,
  p_payment_method public.payment_method_enum,
  p_items JSONB,
  p_customer_phone TEXT,
  p_payment_proof_url TEXT,
  p_bank_info TEXT,
  p_customer_notes TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_clean_name TEXT;
  v_clean_phone TEXT;
  v_item JSONB;
  v_product_id UUID;
  v_qty INTEGER;
  v_prod RECORD;
  v_subtotal INTEGER;
  v_total_price INTEGER := 0;
  v_date_prefix TEXT;
  v_seq INTEGER;
  v_invoice_code VARCHAR(40);
  v_order_id UUID;
  v_items_output JSONB := '[]'::jsonb;
BEGIN
  v_clean_name := trim(coalesce(p_customer_name, ''));
  IF length(v_clean_name) = 0 THEN
    RAISE EXCEPTION 'Nama pelanggan wajib diisi.';
  END IF;

  v_clean_phone := trim(coalesce(p_customer_phone, '-'));
  IF length(v_clean_phone) = 0 THEN
    v_clean_phone := '-';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Keranjang pesanan tidak boleh kosong.';
  END IF;

  -- Generate kode invoice harian unik: AJC-YYMMDD-XXX
  v_date_prefix := 'AJC-' || to_char(now() AT TIME ZONE 'Asia/Makassar', 'YYMMDD') || '-';
  SELECT count(*) + 1 INTO v_seq
  FROM public.orders
  WHERE invoice_code LIKE v_date_prefix || '%';

  LOOP
    v_invoice_code := v_date_prefix || lpad(v_seq::text, 3, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.orders WHERE invoice_code = v_invoice_code);
    v_seq := v_seq + 1;
  END LOOP;

  INSERT INTO public.orders (
    invoice_code,
    customer_name,
    customer_phone,
    payment_method,
    payment_proof_url,
    bank_info,
    customer_notes,
    total_price,
    status
  )
  VALUES (
    v_invoice_code,
    v_clean_name,
    v_clean_phone,
    COALESCE(p_payment_method, 'COD'),
    p_payment_proof_url,
    p_bank_info,
    p_customer_notes,
    0,
    'PENDING'
  )
  RETURNING id INTO v_order_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_qty := COALESCE((v_item->>'quantity')::INTEGER, 0);

    IF v_qty <= 0 THEN
      RAISE EXCEPTION 'Jumlah item harus lebih dari 0.';
    END IF;

    -- Lock product row (FOR UPDATE) & baca harga asli dari DB
    SELECT id, name, price, stock, is_available
    INTO v_prod
    FROM public.products
    WHERE id = v_product_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Produk dengan ID % tidak ditemukan.', v_product_id;
    END IF;

    IF NOT v_prod.is_available OR v_prod.stock < v_qty THEN
      RAISE EXCEPTION 'Stok "%" tidak mencukupi (tersisa: %, diminta: %).', v_prod.name, v_prod.stock, v_qty;
    END IF;

    v_subtotal := v_prod.price * v_qty;
    v_total_price := v_total_price + v_subtotal;

    INSERT INTO public.order_items (
      order_id,
      product_id,
      product_name_snapshot,
      quantity,
      price_at_purchase,
      subtotal
    ) VALUES (
      v_order_id,
      v_prod.id,
      v_prod.name,
      v_qty,
      v_prod.price,
      v_subtotal
    );

    UPDATE public.products
    SET
      stock = stock - v_qty,
      is_available = CASE WHEN (stock - v_qty) <= 0 THEN false ELSE is_available END
    WHERE id = v_prod.id;

    v_items_output := v_items_output || jsonb_build_object(
      'product_id', v_prod.id,
      'product_name', v_prod.name,
      'quantity', v_qty,
      'price_at_purchase', v_prod.price,
      'subtotal', v_subtotal
    );
  END LOOP;

  UPDATE public.orders
  SET total_price = v_total_price
  WHERE id = v_order_id;

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'invoice_code', v_invoice_code,
    'customer_name', v_clean_name,
    'payment_method', COALESCE(p_payment_method, 'COD'),
    'total_price', v_total_price,
    'status', 'PENDING',
    'items', v_items_output
  );
END;
$$;

-- 6. ATOMIC ADMIN STATUS UPDATE FUNCTION (AUTO-RESTORE STOCK ON CANCEL)
CREATE OR REPLACE FUNCTION public.update_order_status_atomic(
  p_order_id UUID,
  p_new_status public.order_status_enum
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_item RECORD;
BEGIN
  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pesanan tidak ditemukan.';
  END IF;

  IF p_new_status = 'BATAL' AND v_order.status <> 'BATAL' THEN
    FOR v_item IN
      SELECT product_id, quantity FROM public.order_items WHERE order_id = p_order_id
    LOOP
      UPDATE public.products
      SET
        stock = stock + v_item.quantity,
        is_available = true
      WHERE id = v_item.product_id;
    END LOOP;
  END IF;

  UPDATE public.orders
  SET status = p_new_status
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'order_id', p_order_id,
    'invoice_code', v_order.invoice_code,
    'previous_status', v_order.status,
    'new_status', p_new_status
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_hybrid_order(TEXT, public.payment_method_enum, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_order_status_atomic(UUID, public.order_status_enum) TO anon, authenticated;

-- 7. SEED DATA (CATEGORIES & INITIAL MENU)
INSERT INTO public.categories (name, slug)
VALUES
  ('Dubai Chewy Cookies', 'dubai-cookies'),
  ('Soft Cookies', 'cookies'),
  ('Fudgy Brownies', 'brownies'),
  ('Dessert Box', 'dessert-box'),
  ('Dimsum Hangat', 'dimsum')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;

WITH cat AS (
  SELECT id, slug FROM public.categories
)
INSERT INTO public.products (
  category_id,
  name,
  slug,
  description,
  price,
  stock,
  image_url,
  badge,
  is_available
)
VALUES
  (
    (SELECT id FROM cat WHERE slug = 'dubai-cookies'),
    'Dubai Chewy Cookies Pistachio',
    'dubai-chewy-cookies-pistachio',
    'Soft-baked dark chocolate cookies dengan isian kunafa renyah dan lumeran krim pistachio asli khas Dubai.',
    35000,
    25,
    '/images/storefront-counter.jpg',
    'Favorit Kampus',
    true
  ),
  (
    (SELECT id FROM cat WHERE slug = 'cookies'),
    'Classic Chocochip Cookie',
    'classic-chocochip-cookie',
    'Cookies renyah di luar dan chewy di dalam dengan potongan dark chocolate belgian melimpah.',
    18000,
    35,
    '/images/storefront-counter.jpg',
    'Favorit Kampus',
    true
  ),
  (
    (SELECT id FROM cat WHERE slug = 'cookies'),
    'Matcha White Choco Cookies',
    'matcha-white-choco-cookies',
    'Perpaduan adonan matcha Jepang autentik dengan potongan cokelat putih yang creamy dan wangi aromatik.',
    20000,
    25,
    '/images/storefront-counter.jpg',
    'Premium Ingredient',
    true
  ),
  (
    (SELECT id FROM cat WHERE slug = 'brownies'),
    'Fudgy Shiny Crust Brownies',
    'fudgy-shiny-crust-brownies',
    'Brownies panggang tekstur padat, fudgy dan nyoklat banget dengan shiny crust renyah serta irisan almond melimpah.',
    25000,
    20,
    '/images/storefront-counter.jpg',
    'Fresh Oven',
    true
  ),
  (
    (SELECT id FROM cat WHERE slug = 'dessert-box'),
    'Lotus Biscoff Dessert Box',
    'lotus-biscoff-dessert-box',
    'Layer cake lembut disiram lelehan selai Lotus Biscoff, krim vanilla silky, dan biskuit Lotus renyah di atasnya.',
    30000,
    15,
    '/images/storefront-counter.jpg',
    'Premium Ingredient',
    true
  ),
  (
    (SELECT id FROM cat WHERE slug = 'dimsum'),
    'Dimsum Ayam Udang',
    'dimsum-ayam-udang',
    'Dimsum ayam cincang dan udang segar langsung dari kukusan bambu (isi 6), juicy lengkap dengan saus chili oil.',
    22000,
    30,
    '/images/storefront-counter.jpg',
    'Selalu Hangat',
    true
  ),
  (
    (SELECT id FROM cat WHERE slug = 'dimsum'),
    'Dimsum Mentai',
    'dimsum-mentai',
    'Dimsum hangat (isi 6) disiram saus mentai gurih creamy yang di-torch wangi dengan taburan nori.',
    27000,
    25,
    '/images/storefront-counter.jpg',
    'Menu Hits',
    true
  ),
  (
    (SELECT id FROM cat WHERE slug = 'cookies'),
    'Red Velvet Cream Cheese Cookie',
    'red-velvet-cream-cheese-cookie',
    'Cookie red velvet lembut dipanggang fresh dengan isian krim keju New Zealand yang lumer dan gurih manis.',
    22000,
    20,
    '/images/storefront-counter.jpg',
    'Premium Ingredient',
    true
  )
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  stock = EXCLUDED.stock,
  badge = EXCLUDED.badge,
  is_available = EXCLUDED.is_available;
