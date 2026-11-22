export type DbPaymentMethod = 'COD' | 'QRIS' | 'TRANSFER';

export type DbPaymentStatus = 'BELUM_BAYAR' | 'SUDAH_BAYAR';

export type DbOrderStatus = 'PENDING' | 'SIAP_DIAMBIL' | 'SELESAI' | 'BATAL';

export interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface ProductRow {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  stock: number;
  image_url: string | null;
  badge: string | null;
  emoji?: string | null;
  ingredients?: string[] | null;
  is_available: boolean;
  created_at: string;
  categories?: Pick<CategoryRow, 'id' | 'name' | 'slug'>;
}

export interface ReviewRow {
  id: string;
  invoice_code?: string | null;
  customer_name: string;
  rating: number;
  menu_ordered: string;
  comment: string;
  is_approved: boolean;
  created_at: string;
}

export interface BatchSettingsRow {
  id: number;
  batch_number: number;
  batch_name: string;
  is_open: boolean;
  order_deadline: string;
  ready_pickup_date: string;
  ready_pickup_time: string;
  pickup_location?: string;
  order_open_at?: string | null;
  order_close_at?: string | null;
  pickup_date_iso?: string | null;
  pickup_start_time?: string | null;
  pickup_end_time?: string | null;
  updated_at: string;
}

export interface OrderRow {
  id: string;
  invoice_code: string;
  customer_name: string;
  customer_phone?: string;
  payment_method: DbPaymentMethod;
  payment_status?: DbPaymentStatus;
  payment_proof_url?: string | null;
  bank_info?: string | null;
  customer_notes?: string | null;
  batch_number?: number;
  batch_name?: string;
  total_price: number;
  status: DbOrderStatus;
  created_at: string;
}

export interface OrderItemRow {
  id: string;
  order_id: string;
  product_id: string;
  product_name_snapshot: string;
  quantity: number;
  price_at_purchase: number;
  subtotal: number;
}

export interface OrderWithItems extends OrderRow {
  order_items: OrderItemRow[];
}

export interface CheckoutCartItemInput {
  product_id: string;
  quantity: number;
  custom_name?: string;
}

export interface CreateOrderInput {
  customer_name: string;
  customer_phone?: string;
  payment_method?: DbPaymentMethod; // Default: 'COD'
  payment_proof_url?: string | null;
  bank_info?: string | null;
  customer_notes?: string | null;
  items: CheckoutCartItemInput[];
}

export interface CreateOrderItemResult {
  product_id: string;
  product_name: string;
  quantity: number;
  price_at_purchase: number;
  subtotal: number;
}

export interface CreateOrderSuccessData {
  order_id: string;
  invoice_code: string;
  customer_name: string;
  customer_phone: string;
  payment_method: DbPaymentMethod;
  payment_proof_url?: string | null;
  bank_info?: string | null;
  customer_notes?: string | null;
  batch_number?: number;
  batch_name?: string;
  total_price: number;
  status: DbOrderStatus;
  items: CreateOrderItemResult[];
  whatsapp_url: string;
  whatsapp_message: string;
  wa_notification_sent?: boolean;
  wa_verified_by_gateway?: boolean;
}

export interface ActiveBatchInfo {
  batch_number: number;
  batch_name: string;
}

export interface ActionResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface TopSellingProductStat {
  product_id: string;
  product_name: string;
  total_quantity_sold: number;
  total_revenue: number;
}

export interface SalesSummaryReport {
  total_omzet: number;
  total_orders: number;
  cod_orders_count: number;
  qris_orders_count: number;
  transfer_orders_count?: number;
  paid_orders_count?: number;
  unpaid_orders_count?: number;
  pending_orders_count: number;
  ready_orders_count: number;
  completed_orders_count: number;
  cancelled_orders_count: number;
  top_products: TopSellingProductStat[];
}

export interface AdminUserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
}
