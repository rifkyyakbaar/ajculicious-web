export type CategorySlug =
  | 'all'
  | 'dubai-cookies'
  | 'cookies'
  | 'brownies'
  | 'dessert-box'
  | 'dimsum';

export interface Product {
  id: string;
  name: string;
  slug: string;
  category: CategorySlug;
  categoryLabel: string;
  price: number;
  stockQuota: number;
  originalQuota: number;
  badges: string[];
  description: string;
  emoji: string;
  imageUrl?: string | null;
  ingredients?: string[];
  isActive: boolean;
  totalSold?: number;
  isBestSeller?: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  badge: string; // e.g. "Product & Recipe Lead"
  description: string; // e.g. "Cewek berhijab berkacamata di tengah konter"
  greeting: string;
  favoriteProductId: string;
  left: string;
  top: string;
  width: string;
  height: string;
  tagPosition?: 'top' | 'bottom';
}

export type OrderStatus =
  | 'MENUNGGU_PEMBAYARAN'
  | 'MENUNGGU_VERIFIKASI'
  | 'LUNAS_PRODUKSI'
  | 'READY_PICKUP'
  | 'SELESAI'
  | 'DITOLAK';

export type PaymentMethod = 'COD' | 'QRIS' | 'TRANSFER';
export type PickupOption = 'kampus' | 'kurir';

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface OrderRecord {
  id: string;
  invoiceCode: string;
  batchName?: string; // e.g. "Batch 4 - Nov 2026"
  customerName: string;
  customerPhone: string;
  pickupOption: PickupOption;
  pickupLocation: string; // e.g. "Gazebo Fakultas Teknik" or "Kost / Alamat"
  paymentMethod: PaymentMethod;
  bankChosen?: 'Mandiri' | 'BluBCA';
  transferProofUrl?: string;
  totalPrice: number;
  status: OrderStatus;
  createdAt: string;
  notes?: string;
  items: OrderItem[];
  customerSegment?: 'Mahasiswa' | 'Siswa' | 'Masyarakat';
  isRepeatCustomer?: boolean;
}

export interface ReviewRecord {
  id: string;
  invoiceCode?: string;
  customerName: string;
  rating: number; // 1-5
  menuOrdered: string;
  comment: string;
  date: string;
  isApproved: boolean;
}

export interface ExpenseRecord {
  id: string;
  batchName?: string;
  date: string;
  category: 'Bahan Baku' | 'Kemasan & Stiker' | 'Operasional' | 'Lainnya';
  description: string;
  amount: number;
}

export interface BatchPOConfig {
  batchNumber: number;
  batchName: string;
  isOpen: boolean;
  manualIsOpen?: boolean;
  orderOpenAt?: string | null;
  orderCloseAt?: string | null;
  orderDeadline: string; // e.g. "Kamis, 19 Nov 2026, 21:00 WITA"
  pickupDateIso?: string | null;
  pickupStartTime?: string;
  pickupEndTime?: string;
  readyPickupDate: string; // e.g. "Jumat, 20 Nov 2026"
  readyPickupTime: string; // e.g. "13:00 - 17:00 WITA"
  pickupLocations: string[];
}
