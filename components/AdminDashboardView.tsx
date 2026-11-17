'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Store,
  LogOut,
  FileSpreadsheet,
  TrendingUp,
  CreditCard,
  Package,
  Plus,
  CheckCircle2,
  Clock,
  Sparkles,
  AlertCircle,
  Search,
  RefreshCw,
  Loader2,
  ChefHat,
  Ban,
  ShieldCheck,
  X,
  Check,
  Edit3,
  Calendar,
  MessageCircle,
  Copy,
  Wallet,
  BarChart3,
  PieChart,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  Product,
  OrderRecord,
  OrderStatus,
  ExpenseRecord,
  BatchPOConfig,
  CategorySlug,
} from '../types/ajculicious';
import {
  AdminUserProfile,
  DbOrderStatus,
  DbPaymentStatus,
  OrderWithItems,
  SalesSummaryReport,
} from '../types/database';
import {
  getAdminOrdersAndSummary,
  updateOrderStatus,
  updateOrderPaymentStatus,
  upsertProduct,
  updateProductStockAndAvailability,
  updateBatchSettingsInDb,
} from '../actions/admin-actions';
import { getCatalogProducts } from '../actions/catalog-actions';
import { formatRupiah } from '../utils/formatters';

interface AdminDashboardViewProps {
  adminProfile?: AdminUserProfile | null;
  onBackToStore: () => void;
  onLogout: () => void;
  products: Product[];
  onUpdateProducts: (products: Product[]) => void;
  orders?: OrderRecord[];
  onUpdateOrderStatus?: (orderId: string, nextStatus: OrderStatus) => void;
  expenses?: ExpenseRecord[];
  onAddExpense?: (expense: Omit<ExpenseRecord, 'id'>) => void;
  onDeleteExpense?: (id: string) => void;
  batchConfig?: BatchPOConfig;
  onUpdateBatchConfig?: (config: BatchPOConfig) => void;
}

export default function AdminDashboardView({
  adminProfile,
  onBackToStore,
  onLogout,
  products,
  onUpdateProducts,
  batchConfig,
  onUpdateBatchConfig,
}: AdminDashboardViewProps) {
  const [activeTab, setActiveTab] = useState<'orders' | 'catalog' | 'report'>(
    'orders'
  );

  // Live Supabase Data States
  const [dbOrders, setDbOrders] = useState<OrderWithItems[]>([]);
  const [summary, setSummary] = useState<SalesSummaryReport>({
    total_omzet: 0,
    total_orders: 0,
    cod_orders_count: 0,
    qris_orders_count: 0,
    paid_orders_count: 0,
    unpaid_orders_count: 0,
    pending_orders_count: 0,
    ready_orders_count: 0,
    completed_orders_count: 0,
    cancelled_orders_count: 0,
    top_products: [],
  });
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | DbOrderStatus>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<
    'ALL' | 'SUDAH_BAYAR' | 'BELUM_BAYAR'
  >('ALL');

  // Modal Tambah / Edit Menu Produk di Database
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | undefined>(
    undefined
  );
  const [editingProductSlug, setEditingProductSlug] = useState<
    string | undefined
  >(undefined);
  const [menuName, setMenuName] = useState('');
  const [menuCategory, setMenuCategory] = useState<CategorySlug>('cookies');
  const [menuPrice, setMenuPrice] = useState<number>(20000);
  const [menuEmoji, setMenuEmoji] = useState('🍪');
  const [menuIngredients, setMenuIngredients] = useState(
    'Belgian Dark Choco, Anchor Butter, Brown Sugar, Vanilla'
  );
  const [menuDesc, setMenuDesc] = useState('');
  const [isSavingMenu, setIsSavingMenu] = useState(false);

  // Form Jadwal Batch PO
  const [batchNameInput, setBatchNameInput] = useState(
    batchConfig?.batchName || 'Batch #4 - November Sweet Week'
  );
  const [batchDeadlineInput, setBatchDeadlineInput] = useState(
    batchConfig?.orderDeadline || 'Kamis, 19 Nov 2026, 21:00 WITA'
  );
  const [batchIsOpenInput, setBatchIsOpenInput] = useState(
    batchConfig?.isOpen ?? true
  );
  const [isSavingBatch, setIsSavingBatch] = useState(false);

  const onUpdateProductsRef = useRef(onUpdateProducts);
  useEffect(() => {
    onUpdateProductsRef.current = onUpdateProducts;
  }, [onUpdateProducts]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchLiveDashboardData = useCallback(async () => {
    setIsLoadingData(true);
    try {
      const [ordersRes, allDbProducts] = await Promise.all([
        getAdminOrdersAndSummary(),
        getCatalogProducts('all', true),
      ]);

      if (ordersRes.success && ordersRes.data) {
        setDbOrders(ordersRes.data.orders);
        setSummary(ordersRes.data.summary);
      }

      if (allDbProducts && allDbProducts.length > 0) {
        onUpdateProductsRef.current(allDbProducts);
      }
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveDashboardData();
  }, [fetchLiveDashboardData]);

  // Handler Ubah Status Pesanan
  const handleStatusChange = async (
    orderId: string,
    invoiceCode: string,
    newStatus: DbOrderStatus
  ) => {
    setProcessingId(orderId);
    const res = await updateOrderStatus(orderId, newStatus);
    if (res.success) {
      showToast(`Status pesanan #${invoiceCode} diubah menjadi ${newStatus}`);
      await fetchLiveDashboardData();
    } else {
      showToast(res.error || 'Gagal memperbarui status pesanan.');
    }
    setProcessingId(null);
  };

  // Handler Ubah Status Pembayaran Manual (BELUM_BAYAR <-> SUDAH_BAYAR)
  const handlePaymentStatusChange = async (
    orderId: string,
    invoiceCode: string,
    nextPaymentStatus: DbPaymentStatus
  ) => {
    setProcessingId(orderId);
    const res = await updateOrderPaymentStatus(orderId, nextPaymentStatus);
    if (res.success) {
      showToast(
        `Pembayaran #${invoiceCode} diubah ke ${
          nextPaymentStatus === 'SUDAH_BAYAR'
            ? 'SUDAH BAYAR (LUNAS)'
            : 'BELUM BAYAR'
        }`
      );
      await fetchLiveDashboardData();
    } else {
      showToast(res.error || 'Gagal memperbarui status pembayaran.');
    }
    setProcessingId(null);
  };

  // Susun kalimat WhatsApp notifikasi "Pesanan Sudah Siap Diambil"
  const buildReadyPickupWaText = (order: OrderWithItems) => {
    const itemList = (order.order_items ?? [])
      .map((i) => `- ${i.quantity}x ${i.product_name_snapshot}`)
      .join('\n');
    const isPaid = order.payment_status === 'SUDAH_BAYAR';
    const paymentInfo = isPaid
      ? 'SUDAH BAYAR (LUNAS)'
      : `BELUM BAYAR (${order.payment_method} - ${formatRupiah(
          order.total_price
        )})`;

    return [
      `Halo Kak *${order.customer_name}*! 👋🍪`,
      `Kabar gembira dari *AJCUlicious*! Pesanan Pre-Order Anda sudah *SIAP DIAMBIL* sekarang:`,
      ``,
      `🧾 *Kode Invoice:* #${order.invoice_code}`,
      `💳 *Status Pembayaran:* ${paymentInfo}`,
      `📦 *Rincian Menu:*`,
      itemList,
      ``,
      `Silakan tunjukkan kode invoice *#${order.invoice_code}* saat pengambilan pesanan ya Kak. Terima kasih! 🙏`,
    ].join('\n');
  };

  // Handler Toggle Ketersediaan PO Produk
  const handleToggleProductAvailability = async (prod: Product) => {
    setProcessingId(prod.id);
    const res = await updateProductStockAndAvailability(
      prod.id,
      999,
      !prod.isActive
    );
    if (res.success) {
      showToast(
        `Menu "${prod.name}" sekarang ${
          !prod.isActive ? 'Dibuka untuk PO' : 'Ditutup Sementara'
        }`
      );
      const freshProducts = await getCatalogProducts('all', true);
      onUpdateProducts(freshProducts);
    } else {
      showToast(res.error || 'Gagal memperbarui status menu.');
    }
    setProcessingId(null);
  };

  const handleOpenAddModal = () => {
    setEditingProductId(undefined);
    setEditingProductSlug(undefined);
    setMenuName('');
    setMenuCategory('cookies');
    setMenuPrice(20000);
    setMenuEmoji('🍪');
    setMenuIngredients('Belgian Dark Choco, Anchor Butter, Brown Sugar');
    setMenuDesc('');
    setShowProductModal(true);
  };

  const handleOpenEditModal = (prod: Product) => {
    setEditingProductId(prod.id);
    setEditingProductSlug(prod.slug);
    setMenuName(prod.name);
    setMenuCategory(prod.category === 'all' ? 'cookies' : prod.category);
    setMenuPrice(prod.price);
    setMenuEmoji(prod.emoji || '🍪');
    setMenuIngredients((prod.ingredients ?? []).join(', '));
    setMenuDesc(prod.description);
    setShowProductModal(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!menuName.trim()) return;
    setIsSavingMenu(true);

    const parsedIngredients = menuIngredients
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const res = await upsertProduct({
      id: editingProductId,
      slug: editingProductSlug,
      name: menuName.trim(),
      category_slug: menuCategory === 'all' ? 'cookies' : menuCategory,
      description:
        menuDesc.trim() ||
        'Diproduksi fresh homemade sesuai pesanan Pre-Order.',
      price: menuPrice,
      emoji: menuEmoji.trim() || '🍪',
      ingredients:
        parsedIngredients.length > 0
          ? parsedIngredients
          : ['Bahan Pilihan Premium', 'Fresh Homemade'],
      is_available: true,
    });

    setIsSavingMenu(false);
    if (res.success) {
      setShowProductModal(false);
      showToast(
        editingProductId
          ? 'Perubahan menu berhasil disimpan ke database!'
          : 'Menu baru berhasil ditambahkan ke database Supabase!'
      );
      const freshProducts = await getCatalogProducts('all', true);
      onUpdateProducts(freshProducts);
    } else {
      showToast(res.error || 'Gagal menyimpan menu.');
    }
  };

  const handleSaveBatchSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingBatch(true);
    const res = await updateBatchSettingsInDb({
      batchName: batchNameInput,
      isOpen: batchIsOpenInput,
      orderDeadline: batchDeadlineInput,
      readyPickupDate: batchConfig?.readyPickupDate || 'Jumat, 20 Nov 2026',
      readyPickupTime: batchConfig?.readyPickupTime || '13:00 - 17:00 WITA',
    });
    setIsSavingBatch(false);
    if (res.success) {
      if (onUpdateBatchConfig && batchConfig) {
        onUpdateBatchConfig({
          ...batchConfig,
          batchName: batchNameInput,
          isOpen: batchIsOpenInput,
          orderDeadline: batchDeadlineInput,
        });
      }
      showToast('Jadwal Pre-Order berhasil diperbarui di database!');
    } else {
      showToast(res.error || 'Gagal menyimpan jadwal Pre-Order.');
    }
  };

  const handleExportExcel = () => {
    const rows = dbOrders.map((o) => ({
      'Kode Invoice': o.invoice_code,
      'Nama Pemesan': o.customer_name,
      'Metode Pembayaran': o.payment_method,
      'Status Bayar':
        o.payment_status === 'SUDAH_BAYAR' ? 'SUDAH BAYAR' : 'BELUM BAYAR',
      'Total Harga (Rp)': o.total_price,
      'Status Pesanan': o.status,
      'Rincian Item': (o.order_items ?? [])
        .map((i) => `${i.quantity}x ${i.product_name_snapshot}`)
        .join(', '),
      'Waktu Pesan': new Date(o.created_at).toLocaleString('id-ID'),
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Laporan_Pesanan_AJCUlicious');
    XLSX.writeFile(
      wb,
      `Laporan_AJCUlicious_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  // Filter pesanan berdasarkan Status Pesanan + Status Bayar + Pencarian
  const filteredOrders = dbOrders.filter((o) => {
    const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
    const currentPayStatus: DbPaymentStatus =
      o.payment_status === 'SUDAH_BAYAR' ? 'SUDAH_BAYAR' : 'BELUM_BAYAR';
    const matchesPayment =
      paymentFilter === 'ALL' || currentPayStatus === paymentFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !q ||
      o.invoice_code.toLowerCase().includes(q) ||
      o.customer_name.toLowerCase().includes(q);
    return matchesStatus && matchesPayment && matchesQuery;
  });

  // Kalkulasi Analitik untuk Grafik Visual
  const activeOrders = dbOrders.filter((o) => o.status !== 'BATAL');
  const paidOrders = activeOrders.filter(
    (o) => o.payment_status === 'SUDAH_BAYAR'
  );
  const unpaidOrders = activeOrders.filter(
    (o) => (o.payment_status || 'BELUM_BAYAR') === 'BELUM_BAYAR'
  );
  const paidOmzet = paidOrders.reduce((s, o) => s + o.total_price, 0);
  const unpaidOmzet = unpaidOrders.reduce((s, o) => s + o.total_price, 0);
  const paidPercent =
    activeOrders.length > 0
      ? Math.round((paidOrders.length / activeOrders.length) * 100)
      : 0;
  const codPercent =
    activeOrders.length > 0
      ? Math.round((summary.cod_orders_count / activeOrders.length) * 100)
      : 0;
  const maxProductSold = Math.max(
    1,
    ...summary.top_products.map((p) => p.total_quantity_sold)
  );

  // Rekap jumlah produksi PO per menu
  const kitchenQueueMap = new Map<string, number>();
  for (const order of dbOrders) {
    if (order.status === 'PENDING' || order.status === 'SIAP_DIAMBIL') {
      for (const item of order.order_items ?? []) {
        kitchenQueueMap.set(
          item.product_name_snapshot,
          (kitchenQueueMap.get(item.product_name_snapshot) ?? 0) + item.quantity
        );
      }
    }
  }

  const getStatusBadge = (status: DbOrderStatus) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3" />
            PENDING
          </span>
        );
      case 'SIAP_DIAMBIL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
            <Sparkles className="w-3 h-3" />
            SIAP DIAMBIL
          </span>
        );
      case 'SELESAI':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-600 text-white">
            <CheckCircle2 className="w-3 h-3" />
            SELESAI
          </span>
        );
      case 'BATAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-600 border border-rose-200">
            <Ban className="w-3 h-3" />
            BATAL
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF6F0] text-[#3B2618] pb-16">
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#3B2618] text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-bottom-4">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Admin Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#EADFD3] px-4 sm:px-8 py-3.5 shadow-2xs">
        <div className="w-full max-w-[1600px] mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#5C3A21] text-white flex items-center justify-center font-black text-sm">
              AJC
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base sm:text-lg tracking-tight text-[#3B2618]">
                  Dashboard Admin
                </h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FAF6F0] text-[#5C3A21] font-semibold border border-[#EADFD3] flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  {adminProfile?.role || 'Super Admin'}
                </span>
              </div>
              <p className="text-xs text-[#8C6D53]">
                {adminProfile?.name || 'Syazwani'} &bull;{' '}
                {adminProfile?.email || 'admin@ajculicious.com'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={fetchLiveDashboardData}
              disabled={isLoadingData}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#EADFD3] bg-white hover:bg-[#FAF6F0] text-xs font-semibold transition"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isLoadingData ? 'animate-spin' : ''}`}
              />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </button>

            <button
              type="button"
              onClick={onBackToStore}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#EADFD3] bg-[#FAF6F0] text-[#3B2618] hover:bg-[#F2E8DC] text-xs font-semibold transition"
            >
              <Store className="w-3.5 h-3.5" />
              <span>Ke Halaman Toko</span>
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </header>

      <main className="w-full max-w-[1600px] mx-auto px-4 sm:px-8 pt-6 space-y-6">
        {/* ================= 4 KARTU KPI RINGKASAN PENJUALAN ================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="bg-white border border-[#EADFD3] rounded-2xl p-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-[#8C6D53] font-medium">
              <span>Total Omzet Pesanan</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="font-extrabold text-xl text-[#3B2618]">
              {formatRupiah(summary.total_omzet)}
            </p>
            <p className="text-[11px] text-[#8C6D53]">
              Sudah Bayar: <strong className="text-emerald-700">{formatRupiah(paidOmzet)}</strong>
            </p>
          </div>

          <div className="bg-white border border-[#EADFD3] rounded-2xl p-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-[#8C6D53] font-medium">
              <span>Status Pembayaran Manual</span>
              <Wallet className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex items-baseline gap-2.5">
              <span className="font-extrabold text-xl text-emerald-700">
                {paidOrders.length} Lunas
              </span>
              <span className="text-stone-300">/</span>
              <span className="font-extrabold text-xl text-rose-600">
                {unpaidOrders.length} Belum Bayar
              </span>
            </div>
            <p className="text-[11px] text-[#8C6D53]">
              Tagihan belum bayar: {formatRupiah(unpaidOmzet)}
            </p>
          </div>

          <div className="bg-white border border-[#EADFD3] rounded-2xl p-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-[#8C6D53] font-medium">
              <span>Metode Pembayaran</span>
              <CreditCard className="w-4 h-4 text-[#5C3A21]" />
            </div>
            <p className="font-extrabold text-xl text-[#3B2618]">
              {summary.cod_orders_count} COD / {summary.qris_orders_count} QRIS
            </p>
            <p className="text-[11px] text-[#8C6D53]">
              Total {summary.total_orders} transaksi masuk
            </p>
          </div>

          <div className="bg-white border border-[#EADFD3] rounded-2xl p-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-[#8C6D53] font-medium">
              <span>Menu Terlaris #1</span>
              <Sparkles className="w-4 h-4 text-amber-500" />
            </div>
            {summary.top_products.length > 0 ? (
              <>
                <p className="font-bold text-sm text-[#3B2618] truncate">
                  {summary.top_products[0].product_name}
                </p>
                <p className="text-xs font-semibold text-[#5C3A21]">
                  {summary.top_products[0].total_quantity_sold} pcs (
                  {formatRupiah(summary.top_products[0].total_revenue)})
                </p>
              </>
            ) : (
              <p className="text-xs text-[#8C6D53] pt-1">Belum ada transaksi</p>
            )}
          </div>
        </div>

        {/* ================= GRAFIK ANALITIK PENJUALAN & PEMBAYARAN ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Grafik 1 (7 Kolom): Bar Chart Penjualan & Omzet per Produk */}
          <div className="lg:col-span-7 bg-white border border-[#EADFD3] rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#5C3A21]" />
                <h3 className="font-bold text-sm text-[#3B2618]">
                  Grafik Penjualan &amp; Omzet per Menu
                </h3>
              </div>
              <span className="text-[11px] text-[#8C6D53]">
                Real-Time Database
              </span>
            </div>

            {summary.top_products.length === 0 ? (
              <div className="py-10 text-center text-xs text-[#8C6D53]">
                Belum ada grafik penjualan untuk ditampilkan.
              </div>
            ) : (
              <div className="space-y-3">
                {summary.top_products.slice(0, 6).map((item) => {
                  const widthPct = Math.max(
                    8,
                    Math.round(
                      (item.total_quantity_sold / maxProductSold) * 100
                    )
                  );
                  return (
                    <div key={item.product_id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-[#3B2618] truncate max-w-[60%]">
                          {item.product_name}
                        </span>
                        <span className="font-bold text-[#5C3A21]">
                          {item.total_quantity_sold} pcs &bull;{' '}
                          {formatRupiah(item.total_revenue)}
                        </span>
                      </div>
                      <div className="w-full h-3 rounded-full bg-[#FAF6F0] overflow-hidden border border-[#EADFD3]">
                        <div
                          style={{ width: `${widthPct}%` }}
                          className="h-full rounded-full bg-gradient-to-r from-[#5C3A21] to-[#8C6239] transition-all duration-500"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Grafik 2 (5 Kolom): Donut Chart Status Bayar (Sudah Bayar vs Belum Bayar) & Metode Bayar */}
          <div className="lg:col-span-5 bg-white border border-[#EADFD3] rounded-2xl p-5 flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PieChart className="w-4 h-4 text-[#5C3A21]" />
                <h3 className="font-bold text-sm text-[#3B2618]">
                  Grafik Status Bayar &amp; Metode
                </h3>
              </div>
              <span className="text-[11px] text-[#8C6D53]">
                {activeOrders.length} Pesanan Aktif
              </span>
            </div>

            {/* Donut Visual Status Pembayaran */}
            <div className="flex items-center gap-5 bg-[#FAF6F0] p-4 rounded-2xl border border-[#EADFD3]">
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center shrink-0 shadow-inner"
                style={{
                  background: `conic-gradient(#10b981 0% ${paidPercent}%, #f43f5e ${paidPercent}% 100%)`,
                }}
              >
                <div className="w-16 h-16 rounded-full bg-white flex flex-col items-center justify-center text-center">
                  <span className="font-extrabold text-sm text-[#3B2618] leading-none">
                    {paidPercent}%
                  </span>
                  <span className="text-[9px] text-[#8C6D53] font-semibold mt-0.5">
                    LUNAS
                  </span>
                </div>
              </div>

              <div className="space-y-2 flex-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-semibold text-[#3B2618]">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    Sudah Bayar
                  </span>
                  <span className="font-bold text-emerald-700">
                    {paidOrders.length} ({formatRupiah(paidOmzet)})
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-semibold text-[#3B2618]">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                    Belum Bayar
                  </span>
                  <span className="font-bold text-rose-600">
                    {unpaidOrders.length} ({formatRupiah(unpaidOmzet)})
                  </span>
                </div>
              </div>
            </div>

            {/* Progress Bar COD vs QRIS & Status Pesanan */}
            <div className="space-y-2.5 text-xs">
              <div>
                <div className="flex justify-between mb-1 font-medium text-[#6E523D]">
                  <span>COD ({summary.cod_orders_count})</span>
                  <span>QRIS ({summary.qris_orders_count})</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-amber-200 overflow-hidden flex">
                  <div
                    style={{ width: `${codPercent}%` }}
                    className="h-full bg-[#5C3A21] transition-all duration-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-1.5 pt-1 text-center text-[10px]">
                <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 font-bold">
                  Pending: {summary.pending_orders_count}
                </div>
                <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold">
                  Siap: {summary.ready_orders_count}
                </div>
                <div className="p-2 rounded-xl bg-stone-100 border border-stone-200 text-stone-800 font-bold">
                  Selesai: {summary.completed_orders_count}
                </div>
                <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-bold">
                  Batal: {summary.cancelled_orders_count}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ================= NAVIGASI TAB ================= */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[#EADFD3] pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'orders'
                ? 'bg-[#5C3A21] text-white'
                : 'bg-white text-[#5C3A21] border border-[#EADFD3] hover:bg-[#F2E8DC]'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Pesanan &amp; Verifikasi Bayar ({dbOrders.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('catalog')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'catalog'
                ? 'bg-[#5C3A21] text-white'
                : 'bg-white text-[#5C3A21] border border-[#EADFD3] hover:bg-[#F2E8DC]'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>Katalog &amp; Bahan Produk ({products.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('report')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'report'
                ? 'bg-[#5C3A21] text-white'
                : 'bg-white text-[#5C3A21] border border-[#EADFD3] hover:bg-[#F2E8DC]'
            }`}
          >
            <ChefHat className="w-3.5 h-3.5" />
            <span>Rekap Produksi &amp; Jadwal PO</span>
          </button>
        </div>

        {/* ================= TAB 1: PESANAN & VERIFIKASI PEMBAYARAN MANUAL ================= */}
        {activeTab === 'orders' && (
          <div className="space-y-3.5">
            {/* Bar Pencarian + Filter Status Bayar + Filter Status Pesanan */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-[#EADFD3]">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-[#8C6D53] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari Kode Invoice atau Nama Pemesan..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-[#EADFD3] bg-[#FAF6F0]/50 text-xs text-[#3B2618] focus:outline-none focus:ring-2 focus:ring-[#5C3A21]"
                />
              </div>

              {/* Filter Status Pembayaran Manual */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPaymentFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition ${
                    paymentFilter === 'ALL'
                      ? 'bg-[#3B2618] text-white'
                      : 'bg-[#FAF6F0] text-[#5C3A21] border border-[#EADFD3]'
                  }`}
                >
                  Semua Bayar
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentFilter('BELUM_BAYAR')}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition ${
                    paymentFilter === 'BELUM_BAYAR'
                      ? 'bg-rose-600 text-white'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  Belum Bayar ({unpaidOrders.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentFilter('SUDAH_BAYAR')}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition ${
                    paymentFilter === 'SUDAH_BAYAR'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  Sudah Bayar ({paidOrders.length})
                </button>
              </div>

              {/* Filter Status Pesanan */}
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  ['ALL', 'PENDING', 'SIAP_DIAMBIL', 'SELESAI', 'BATAL'] as const
                ).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition ${
                      statusFilter === st
                        ? 'bg-[#5C3A21] text-white'
                        : 'bg-[#FAF6F0] text-[#5C3A21] border border-[#EADFD3]'
                    }`}
                  >
                    {st === 'ALL' ? 'Semua Status' : st}
                  </button>
                ))}
              </div>
            </div>

            {isLoadingData ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-[#EADFD3] space-y-2">
                <Loader2 className="w-6 h-6 animate-spin text-[#5C3A21] mx-auto" />
                <p className="text-xs text-[#8C6D53]">Memuat data pesanan...</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-[#EADFD3] space-y-1.5">
                <AlertCircle className="w-6 h-6 text-[#8C6D53] mx-auto" />
                <p className="text-xs font-semibold text-[#3B2618]">
                  Belum ada pesanan yang sesuai filter
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredOrders.map((order) => {
                  const isBusy = processingId === order.id;
                  const isPaid = order.payment_status === 'SUDAH_BAYAR';

                  return (
                    <div
                      key={order.id}
                      className="bg-white border border-[#EADFD3] rounded-2xl p-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4"
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-[#FAF6F0] text-[#5C3A21] border border-[#EADFD3]">
                            #{order.invoice_code}
                          </span>
                          <span className="font-bold text-sm text-[#3B2618]">
                            {order.customer_name}
                          </span>
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-stone-100 text-[#5C3A21] font-semibold">
                            {order.payment_method}
                          </span>
                          {getStatusBadge(order.status)}
                        </div>

                        <div className="flex flex-wrap gap-1.5 text-xs text-[#462B18]">
                          {(order.order_items ?? []).map((item) => (
                            <span
                              key={item.id}
                              className="px-2.5 py-1 rounded-lg bg-[#FAF6F0] border border-[#EADFD3]"
                            >
                              <strong>{item.quantity}x</strong>{' '}
                              {item.product_name_snapshot}
                            </span>
                          ))}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-[#8C6D53]">
                          <span>
                            {new Date(order.created_at).toLocaleString(
                              'id-ID',
                              {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              }
                            )}
                          </span>
                          <span>&bull;</span>
                          <span className="font-extrabold text-sm text-[#3B2618]">
                            {formatRupiah(order.total_price)}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end border-t lg:border-t-0 pt-3 lg:pt-0 border-[#F4ECE1]">
                        {/* SAKLAR 2 PILIHAN JELAS: BELUM BAYAR vs SUDAH BAYAR */}
                        <div className="inline-flex items-center rounded-xl p-1 bg-[#FAF6F0] border border-[#EADFD3]">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() =>
                              handlePaymentStatusChange(
                                order.id,
                                order.invoice_code,
                                'BELUM_BAYAR'
                              )
                            }
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                              !isPaid
                                ? 'bg-rose-600 text-white shadow-2xs'
                                : 'text-[#8C6D53] hover:text-[#3B2618]'
                            }`}
                          >
                            Belum Bayar
                          </button>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() =>
                              handlePaymentStatusChange(
                                order.id,
                                order.invoice_code,
                                'SUDAH_BAYAR'
                              )
                            }
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 ${
                              isPaid
                                ? 'bg-emerald-600 text-white shadow-2xs'
                                : 'text-[#8C6D53] hover:text-[#3B2618]'
                            }`}
                          >
                            <Check className="w-3 h-3" />
                            <span>Sudah Bayar</span>
                          </button>
                        </div>

                        {/* Tombol Direct ke WhatsApp (Kalimat Pesanan Sudah Siap Diambil) & Salin */}
                        <a
                          href={`https://wa.me/?text=${encodeURIComponent(
                            buildReadyPickupWaText(order)
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition flex items-center gap-1.5"
                          title="Buka WhatsApp dengan kalimat Pesanan Sudah Siap Diambil"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WA Pesanan Siap</span>
                        </a>

                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(
                              buildReadyPickupWaText(order)
                            );
                            showToast(
                              `Kalimat WA Pesanan Siap #${order.invoice_code} disalin!`
                            );
                          }}
                          className="p-1.5 rounded-xl border border-[#EADFD3] bg-[#FAF6F0] hover:bg-[#F2E8DC] text-[#5C3A21] transition"
                          title="Salin kalimat WA Pesanan Siap Diambil"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        {/* Tombol Status Pesanan */}
                        {order.status === 'PENDING' && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() =>
                              handleStatusChange(
                                order.id,
                                order.invoice_code,
                                'SIAP_DIAMBIL'
                              )
                            }
                            className="px-3 py-1.5 rounded-xl bg-[#5C3A21] hover:bg-[#462B18] text-white text-xs font-semibold transition flex items-center gap-1.5 disabled:opacity-50"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                            <span>Siap Diambil</span>
                          </button>
                        )}

                        {(order.status === 'PENDING' ||
                          order.status === 'SIAP_DIAMBIL') && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() =>
                              handleStatusChange(
                                order.id,
                                order.invoice_code,
                                'SELESAI'
                              )
                            }
                            className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-900 text-white text-xs font-semibold transition flex items-center gap-1.5 disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Selesai</span>
                          </button>
                        )}

                        {order.status !== 'BATAL' &&
                          order.status !== 'SELESAI' && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() =>
                                handleStatusChange(
                                  order.id,
                                  order.invoice_code,
                                  'BATAL'
                                )
                              }
                              className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-semibold transition disabled:opacity-50"
                            >
                              Batalkan
                            </button>
                          )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: KATALOG & KOMPOSISI BAHAN PRODUK */}
        {activeTab === 'catalog' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#EADFD3]">
              <div>
                <h3 className="font-bold text-sm text-[#3B2618]">
                  Daftar Menu Pre-Order &amp; Komposisi Bahan
                </h3>
                <p className="text-xs text-[#8C6D53]">
                  Tambah produk baru, atur komposisi bahan utama, atau buka/tutup ketersediaan menu PO.
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenAddModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#5C3A21] hover:bg-[#462B18] text-white text-xs font-bold transition"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Produk</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {products.map((prod) => {
                const isBusy = processingId === prod.id;
                return (
                  <div
                    key={prod.id}
                    className="bg-white border border-[#EADFD3] rounded-2xl p-4 flex flex-col justify-between gap-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-11 h-11 rounded-xl bg-[#FAF6F0] border border-[#EADFD3] flex items-center justify-center text-2xl shrink-0">
                          {prod.emoji}
                        </div>
                        <div>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FAF6F0] text-[#7D5E46] font-medium border border-[#EADFD3]">
                            {prod.categoryLabel}
                          </span>
                          <h4 className="font-bold text-sm text-[#3B2618] mt-1">
                            {prod.name}
                          </h4>
                          <p className="text-xs font-extrabold text-[#5C3A21]">
                            {formatRupiah(prod.price)}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleToggleProductAvailability(prod)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition shrink-0 ${
                          prod.isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-stone-100 text-stone-500 border-stone-200'
                        }`}
                      >
                        {prod.isActive ? 'PO Dibuka' : 'Ditutup'}
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {(prod.ingredients ?? []).map((ing, i) => (
                        <span
                          key={i}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-[#FAF6F0] border border-[#EADFD3] text-[#5C3A21] font-mono"
                        >
                          {ing}
                        </span>
                      ))}
                    </div>

                    <div className="pt-2.5 border-t border-[#F4ECE1] flex items-center justify-between">
                      <span className="text-[11px] text-[#8C6D53] truncate max-w-[65%]">
                        {prod.description}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(prod)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#EADFD3] bg-[#FAF6F0] hover:bg-[#F2E8DC] text-[#5C3A21] text-xs font-semibold transition"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: REKAP PRODUKSI DAPUR & PENGATURAN JADWAL PO */}
        {activeTab === 'report' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white border border-[#EADFD3] rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <ChefHat className="w-4 h-4 text-[#5C3A21]" />
                <h3 className="font-bold text-sm text-[#3B2618]">
                  Rekap Jumlah Produksi Dapur (PO Aktif)
                </h3>
              </div>

              {kitchenQueueMap.size === 0 ? (
                <p className="text-xs text-[#8C6D53] py-6 text-center bg-[#FAF6F0] rounded-xl">
                  Belum ada antrean produksi untuk disiapkan.
                </p>
              ) : (
                <div className="divide-y divide-[#F4ECE1] border border-[#EADFD3] rounded-xl bg-[#FAF6F0] px-4">
                  {Array.from(kitchenQueueMap.entries()).map(([name, qty]) => (
                    <div
                      key={name}
                      className="py-2.5 flex items-center justify-between text-xs"
                    >
                      <span className="font-semibold text-[#3B2618]">
                        {name}
                      </span>
                      <span className="font-bold text-xs text-[#5C3A21] bg-white px-2.5 py-0.5 rounded border border-[#EADFD3]">
                        {qty} pcs
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white border border-[#EADFD3] rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#5C3A21]" />
                <h3 className="font-bold text-sm text-[#3B2618]">
                  Pengaturan Jadwal Batch Pre-Order
                </h3>
              </div>

              <form
                onSubmit={handleSaveBatchSettings}
                className="space-y-3 text-xs"
              >
                <div>
                  <label className="block font-semibold text-[#3B2618] mb-1">
                    Nama Batch Pre-Order
                  </label>
                  <input
                    type="text"
                    value={batchNameInput}
                    onChange={(e) => setBatchNameInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#EADFD3] bg-[#FAF6F0]/50"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#3B2618] mb-1">
                    Batas Waktu Pemesanan
                  </label>
                  <input
                    type="text"
                    value={batchDeadlineInput}
                    onChange={(e) => setBatchDeadlineInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#EADFD3] bg-[#FAF6F0]/50"
                    required
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={batchIsOpenInput}
                      onChange={(e) => setBatchIsOpenInput(e.target.checked)}
                      className="rounded accent-[#5C3A21]"
                    />
                    <span className="font-semibold text-[#3B2618]">
                      Buka Penerimaan Pre-Order
                    </span>
                  </label>

                  <button
                    type="submit"
                    disabled={isSavingBatch}
                    className="px-4 py-2 rounded-xl bg-[#5C3A21] hover:bg-[#462B18] text-white font-semibold transition"
                  >
                    {isSavingBatch ? 'Menyimpan...' : 'Simpan Jadwal'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* Modal Tambah / Edit Produk & Komposisi Bahan */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#EADFD3] rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base text-[#3B2618]">
                {editingProductId ? 'Edit Menu & Komposisi' : 'Tambah Menu Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                className="p-1.5 rounded-full hover:bg-[#FAF6F0]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Nama Produk *</label>
                <input
                  type="text"
                  value={menuName}
                  onChange={(e) => setMenuName(e.target.value)}
                  placeholder="Contoh: Pistachio Kunafa Brownie"
                  className="w-full px-3 py-2 rounded-xl border border-[#EADFD3] bg-[#FAF6F0]/50"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block font-bold mb-1">Kategori</label>
                  <select
                    value={menuCategory}
                    onChange={(e) =>
                      setMenuCategory(e.target.value as CategorySlug)
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#EADFD3] bg-[#FAF6F0]/50"
                  >
                    <option value="dubai-cookies">Dubai Cookies</option>
                    <option value="cookies">Soft Cookies</option>
                    <option value="brownies">Brownies</option>
                    <option value="dessert-box">Dessert Box</option>
                    <option value="dimsum">Dimsum</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1">Ikon Emoji</label>
                  <input
                    type="text"
                    value={menuEmoji}
                    onChange={(e) => setMenuEmoji(e.target.value)}
                    placeholder="🍪"
                    className="w-full px-3 py-2 rounded-xl border border-[#EADFD3] bg-[#FAF6F0]/50 text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Harga (Rp) *</label>
                <input
                  type="number"
                  min={1000}
                  step={1000}
                  value={menuPrice}
                  onChange={(e) => setMenuPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-[#EADFD3] bg-[#FAF6F0]/50"
                  required
                />
              </div>

              <div>
                <label className="block font-bold mb-1">
                  Komposisi Bahan Utama (pisahkan dengan koma) *
                </label>
                <input
                  type="text"
                  value={menuIngredients}
                  onChange={(e) => setMenuIngredients(e.target.value)}
                  placeholder="Belgian Dark Choco, Pistachio Cream, Kunafa Pastry, Anchor Butter"
                  className="w-full px-3 py-2 rounded-xl border border-[#EADFD3] bg-[#FAF6F0]/50"
                  required
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Deskripsi Produk</label>
                <textarea
                  rows={2}
                  value={menuDesc}
                  onChange={(e) => setMenuDesc(e.target.value)}
                  placeholder="Deskripsi rasa dan tekstur produk..."
                  className="w-full px-3 py-2 rounded-xl border border-[#EADFD3] bg-[#FAF6F0]/50"
                />
              </div>

              <button
                type="submit"
                disabled={isSavingMenu}
                className="w-full py-2.5 rounded-xl bg-[#5C3A21] hover:bg-[#462B18] text-white font-bold transition"
              >
                {isSavingMenu ? 'Menyimpan ke Database...' : 'Simpan ke Database'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
