'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  Lock,
  LogOut,
  Utensils,
  CheckCircle,
  XCircle,
  TrendingUp,
  Package,
  Calendar,
  DollarSign,
  Plus,
  Trash2,
  Edit,
  Download,
  MessageCircle,
  Eye,
  FileSpreadsheet,
  Users,
  Flame,
  ChefHat,
  AlertCircle,
  Check,
} from 'lucide-react';
import {
  Product,
  OrderRecord,
  OrderStatus,
  ExpenseRecord,
  BatchPOConfig,
  CategorySlug,
} from '../types/ajculicious';
import { formatRupiah, buildWhatsAppReadyPickupMessage } from '../utils/formatters';

interface AdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onUpdateProducts: (products: Product[]) => void;
  orders: OrderRecord[];
  onUpdateOrderStatus: (orderId: string, nextStatus: OrderStatus) => void;
  expenses: ExpenseRecord[];
  onAddExpense: (expense: Omit<ExpenseRecord, 'id'>) => void;
  onDeleteExpense: (id: string) => void;
  batchConfig: BatchPOConfig;
  onUpdateBatchConfig: (config: BatchPOConfig) => void;
}

export default function AdminDashboardModal({
  isOpen,
  onClose,
  products,
  onUpdateProducts,
  orders,
  onUpdateOrderStatus,
  expenses,
  onAddExpense,
  onDeleteExpense,
  batchConfig,
  onUpdateBatchConfig,
}: AdminDashboardModalProps) {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminEmail, setAdminEmail] = useState('admin@ajculicious.com');
  const [adminPassword, setAdminPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Tab state
  const [activeTab, setActiveTab] = useState<'menu' | 'orders' | 'finance'>('orders');

  // Preview Proof Modal
  const [previewProofUrl, setPreviewProofUrl] = useState<string | null>(null);

  // New Menu Form State
  const [showAddMenuModal, setShowAddMenuModal] = useState(false);
  const [newMenuName, setNewMenuName] = useState('');
  const [newMenuCategory, setNewMenuCategory] = useState<CategorySlug>('cookies');
  const [newMenuPrice, setNewMenuPrice] = useState<number>(20000);
  const [newMenuQuota, setNewMenuQuota] = useState<number>(20);
  const [newMenuDesc, setNewMenuDesc] = useState('');
  const [newMenuEmoji, setNewMenuEmoji] = useState('🍪');

  // New Expense Form State
  const [expenseDate, setExpenseDate] = useState('17 Nov 2026');
  const [expenseCategory, setExpenseCategory] = useState<
    'Bahan Baku' | 'Kemasan & Stiker' | 'Operasional' | 'Lainnya'
  >('Bahan Baku');
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmount, setExpenseAmount] = useState<number>(50000);
  const [expenseSuccessMsg, setExpenseSuccessMsg] = useState(false);

  // Batch Config Form State
  const [editBatchName, setEditBatchName] = useState(batchConfig.batchName);
  const [editOrderDeadline, setEditOrderDeadline] = useState(batchConfig.orderDeadline);
  const [editReadyDate, setEditReadyDate] = useState(batchConfig.readyPickupDate);
  const [editReadyTime, setEditReadyTime] = useState(batchConfig.readyPickupTime);
  const [batchSaveToast, setBatchSaveToast] = useState(false);

  if (!isOpen) return null;

  // Handle Login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminEmail === 'admin@ajculicious.com' && (adminPassword === 'admin' || adminPassword === 'ajc123')) {
      setIsAuthenticated(true);
      setLoginError('');
    } else {
      setLoginError('Email atau password salah! (Gunakan demo: admin@ajculicious.com / ajc123)');
    }
  };

  const handleQuickDemoLogin = () => {
    setIsAuthenticated(true);
    setLoginError('');
  };

  // 1. Calculations for Kitchen Production Recap
  const kitchenProductionRecap = useMemo(() => {
    // Only count orders that are LUNAS_PRODUKSI or READY_PICKUP or SELESAI
    const activeOrders = orders.filter(
      (o) =>
        o.status === 'LUNAS_PRODUKSI' ||
        o.status === 'READY_PICKUP' ||
        o.status === 'SELESAI'
    );

    const map: Record<string, { name: string; quantity: number }> = {};
    activeOrders.forEach((o) => {
      o.items.forEach((it) => {
        if (!map[it.productName]) {
          map[it.productName] = { name: it.productName, quantity: 0 };
        }
        map[it.productName].quantity += it.quantity;
      });
    });

    return Object.values(map);
  }, [orders]);

  // 2. Financial Analytics Calculations
  const revenue = useMemo(() => {
    return orders
      .filter((o) => o.status !== 'DITOLAK' && o.status !== 'MENUNGGU_PEMBAYARAN')
      .reduce((sum, o) => sum + o.totalPrice, 0);
  }, [orders]);

  const totalExpenses = useMemo(() => {
    return expenses.reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  const netProfit = revenue - totalExpenses;
  const profitMargin = revenue > 0 ? ((netProfit / revenue) * 100).toFixed(1) : '0';
  const averageOrderValue = useMemo(() => {
    const validOrders = orders.filter((o) => o.status !== 'DITOLAK');
    return validOrders.length > 0
      ? Math.round(revenue / validOrders.length)
      : 0;
  }, [orders, revenue]);

  // Customer segment counts
  const customerSegments = useMemo(() => {
    let mhs = 0,
      siswa = 0,
      umum = 0;
    orders.forEach((o) => {
      if (o.customerSegment === 'Mahasiswa') mhs++;
      else if (o.customerSegment === 'Siswa') siswa++;
      else umum++;
    });
    const total = orders.length || 1;
    return {
      mahasiswa: Math.round((mhs / total) * 100),
      siswa: Math.round((siswa / total) * 100),
      umum: Math.round((umum / total) * 100),
    };
  }, [orders]);

  // Repeat customer ratio
  const repeatCustomerRatio = useMemo(() => {
    const repeatCount = orders.filter((o) => o.isRepeatCustomer).length;
    const total = orders.length || 1;
    return Math.round((repeatCount / total) * 100);
  }, [orders]);

  // Menu Management Handlers
  const handleToggleProductActive = (productId: string) => {
    onUpdateProducts(
      products.map((p) =>
        p.id === productId ? { ...p, isActive: !p.isActive } : p
      )
    );
  };

  const handleUpdateStockQuota = (productId: string, newQuota: number) => {
    if (newQuota < 0) return;
    onUpdateProducts(
      products.map((p) =>
        p.id === productId ? { ...p, stockQuota: newQuota } : p
      )
    );
  };

  const handleAddNewMenu = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMenuName.trim()) return;

    const newProd: Product = {
      id: `prod-${Date.now()}`,
      name: newMenuName.trim(),
      slug: newMenuName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      category: newMenuCategory,
      categoryLabel:
        newMenuCategory === 'dubai-cookies'
          ? 'Dubai Cookies'
          : newMenuCategory === 'cookies'
          ? 'Cookies'
          : newMenuCategory === 'brownies'
          ? 'Brownies'
          : newMenuCategory === 'dessert-box'
          ? 'Dessert Box'
          : 'Dimsum',
      price: newMenuPrice,
      stockQuota: newMenuQuota,
      originalQuota: newMenuQuota,
      badges: ['Menu Baru', 'Fresh Oven'],
      description: newMenuDesc.trim() || 'Menu homemade lezat spesial batch PO AJCUlicious.',
      emoji: newMenuEmoji,
      isActive: true,
    };

    onUpdateProducts([newProd, ...products]);
    setShowAddMenuModal(false);
    setNewMenuName('');
    setNewMenuDesc('');
  };

  const handleDeleteProduct = (productId: string) => {
    if (confirm('Yakin ingin menghapus menu ini dari daftar batch?')) {
      onUpdateProducts(products.filter((p) => p.id !== productId));
    }
  };

  // Add Expense Handler
  const handleAddExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseDesc.trim() || expenseAmount <= 0) return;

    onAddExpense({
      date: expenseDate,
      category: expenseCategory,
      description: expenseDesc.trim(),
      amount: expenseAmount,
    });

    setExpenseDesc('');
    setExpenseSuccessMsg(true);
    setTimeout(() => setExpenseSuccessMsg(false), 2000);
  };

  // Save Batch Schedule Handler
  const handleSaveBatchConfig = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateBatchConfig({
      ...batchConfig,
      batchName: editBatchName,
      orderDeadline: editOrderDeadline,
      readyPickupDate: editReadyDate,
      readyPickupTime: editReadyTime,
    });
    setBatchSaveToast(true);
    setTimeout(() => setBatchSaveToast(false), 2500);
  };

  // CSV Report Export Handler
  const handleDownloadCsvReport = () => {
    const csvRows = [
      ['LAPORAN KEUANGAN & ORDER BATCH AJCULICIOUS'],
      ['Tanggal Ekspor', new Date().toLocaleDateString('id-ID')],
      ['Batch PO', batchConfig.batchName],
      [''],
      ['RINGKASAN KEUANGAN'],
      ['Total Pendapatan (Revenue)', revenue],
      ['Total Pengeluaran (Expenses)', totalExpenses],
      ['Laba Bersih (Net Profit)', netProfit],
      ['Profit Margin', `${profitMargin}%`],
      ['Rata-Rata Order (AOV)', averageOrderValue],
      [''],
      ['DAFTAR PESANAN MASUK'],
      ['Invoice', 'Nama Pembeli', 'WhatsApp', 'Metode Bayar', 'Status', 'Total'],
      ...orders.map((o) => [
        o.invoiceCode,
        o.customerName,
        o.customerPhone,
        o.paymentMethod,
        o.status,
        o.totalPrice,
      ]),
      [''],
      ['REKAP KEBUTUHAN PRODUKSI DAPUR'],
      ['Nama Menu', 'Total Kuantitas (Lunas/Produksi)'],
      ...kitchenProductionRecap.map((k) => [k.name, k.quantity]),
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      csvRows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Laporan_AJCUlicious_${batchConfig.batchName.replace(/[^a-zA-Z0-9]/g, '_')}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 !m-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="bg-[#FFFDF9] border border-[#E6D8C7] rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* ================= HEADER MODAL ================= */}
        <div className="px-5 py-4 bg-[#FAF6F0] border-b border-[#E6D8C7] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#5C3A21] text-white flex items-center justify-center font-bold text-base shadow-xs">
              AJC
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-lg text-[#3B2618]">
                  Dashboard Admin AJCUlicious
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold border border-amber-300">
                  Panel Internal Tim
                </span>
              </div>
              <p className="text-xs text-[#7D5E46]">
                Kelola menu batch, verifikasi bukti bayar dapur, dan analisis laba bersih
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <button
                type="button"
                onClick={() => setIsAuthenticated(false)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-stone-300 bg-white text-xs font-semibold text-stone-600 hover:bg-stone-50"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full bg-white hover:bg-[#F2E8DC] text-[#3B2618] border border-[#E6D8C7]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ================= IF NOT AUTHENTICATED: LOGIN FORM ================= */}
        {!isAuthenticated ? (
          <div className="p-6 sm:p-10 flex-1 overflow-y-auto flex items-center justify-center">
            <div className="max-w-md w-full bg-white border border-[#E6D8C7] rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-2xl bg-[#5C3A21] text-white flex items-center justify-center mx-auto mb-2 shadow-xs">
                  <Lock className="w-6 h-6" />
                </div>
                <h4 className="font-black text-xl text-[#3B2618]">
                  Login Admin AJCUlicious
                </h4>
                <p className="text-xs text-[#7D5E46]">
                  Akses khusus manajemen stok, dapur produksi, dan pembukuan keuangan.
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#3B2618] mb-1">
                    Email Admin
                  </label>
                  <input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6D8C7] bg-[#FAF6F0] text-xs text-[#3B2618] focus:outline-none focus:ring-2 focus:ring-[#5C3A21]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#3B2618] mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Masukkan password admin (ajc123)"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6D8C7] bg-[#FAF6F0] text-xs text-[#3B2618] focus:outline-none focus:ring-2 focus:ring-[#5C3A21]"
                    required
                  />
                </div>

                {loginError && (
                  <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-xl font-semibold border border-rose-200">
                    {loginError}
                  </p>
                )}

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-[#5C3A21] text-white font-bold text-xs hover:bg-[#462B18] transition shadow-xs"
                >
                  Masuk ke Dashboard Admin
                </button>

                <div className="pt-2 border-t border-stone-200 text-center">
                  <button
                    type="button"
                    onClick={handleQuickDemoLogin}
                    className="text-xs font-bold text-[#5C3A21] hover:underline"
                  >
                    Demo 1-Klik: Masuk Otomatis Tanpa Password &rarr;
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          /* ================= IF AUTHENTICATED: DASHBOARD CONTENT ================= */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Top Sub-tabs */}
            <div className="px-5 py-3 border-b border-[#E6D8C7] bg-white flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('orders')}
                  className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    activeTab === 'orders'
                      ? 'bg-[#5C3A21] text-white shadow-xs'
                      : 'bg-[#FAF6F0] text-[#5C3A21] hover:bg-[#F2E8DC]'
                  }`}
                >
                  <ChefHat className="w-3.5 h-3.5" />
                  <span>Verifikasi &amp; Produksi Dapur</span>
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
                    {orders.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('menu')}
                  className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    activeTab === 'menu'
                      ? 'bg-[#5C3A21] text-white shadow-xs'
                      : 'bg-[#FAF6F0] text-[#5C3A21] hover:bg-[#F2E8DC]'
                  }`}
                >
                  <Utensils className="w-3.5 h-3.5" />
                  <span>Kelola Menu &amp; Kuota Batch</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('finance')}
                  className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    activeTab === 'finance'
                      ? 'bg-[#5C3A21] text-white shadow-xs'
                      : 'bg-[#FAF6F0] text-[#5C3A21] hover:bg-[#F2E8DC]'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Keuangan &amp; Analitik</span>
                </button>
              </div>

              {/* Unduh Laporan CSV */}
              <button
                type="button"
                onClick={handleDownloadCsvReport}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition shadow-2xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Laporan (CSV)</span>
              </button>
            </div>

            {/* Tab Views Container */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {/* ================= TAB 1: VERIFIKASI ORDER & PRODUKSI DAPUR ================= */}
              {activeTab === 'orders' && (
                <div className="space-y-6">
                  {/* Rekap Kebutuhan Produksi Dapur Otomatis */}
                  <div className="p-4 sm:p-5 rounded-3xl bg-[#FAF6F0] border-2 border-[#E6D8C7] space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-[#5C3A21] text-white flex items-center justify-center font-bold">
                          <ChefHat className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-sm text-[#3B2618]">
                            Rekap Kebutuhan Produksi Dapur (Real-Time)
                          </h4>
                          <p className="text-[11px] text-[#7D5E46]">
                            Total kuantitas menu yang harus dipanggang &amp; dikukus dari pesanan LUNAS / ANTRIAN PRODUKSI
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                      {kitchenProductionRecap.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-3 bg-white rounded-2xl border border-[#E6D8C7] flex items-center justify-between text-xs shadow-2xs"
                        >
                          <span className="font-bold text-[#3B2618] line-clamp-1 pr-2">
                            {item.name}
                          </span>
                          <span className="font-black text-sm text-[#5C3A21] bg-[#F2E8DC] px-2.5 py-0.5 rounded-lg shrink-0">
                            {item.quantity} pcs
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* List Pesanan Masuk & Verifikasi Bukti Bayar */}
                  <div className="space-y-3">
                    <h4 className="font-extrabold text-base text-[#3B2618]">
                      Daftar Pesanan Masuk ({orders.length} Transaksi)
                    </h4>

                    <div className="space-y-3">
                      {orders.map((order) => (
                        <div
                          key={order.id}
                          className="p-4 sm:p-5 rounded-3xl border border-[#E6D8C7] bg-white space-y-3 shadow-2xs"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-xs text-[#5C3A21] bg-[#F2E8DC] px-2 py-0.5 rounded-md">
                                #{order.invoiceCode}
                              </span>
                              <span className="font-black text-sm text-[#3B2618]">
                                {order.customerName}
                              </span>
                              <span className="text-xs text-[#7D5E46]">
                                ({order.customerPhone})
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-[#5C3A21]">
                                {formatRupiah(order.totalPrice)}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  order.status === 'READY_PICKUP'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : order.status === 'LUNAS_PRODUKSI'
                                    ? 'bg-sky-100 text-sky-800'
                                    : order.status === 'MENUNGGU_VERIFIKASI'
                                    ? 'bg-amber-100 text-amber-800'
                                    : order.status === 'SELESAI'
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-stone-100 text-stone-700'
                                }`}
                              >
                                {order.status.replace(/_/g, ' ')}
                              </span>
                            </div>
                          </div>

                          {/* Detail Item & Titik Pengambilan */}
                          <div className="text-xs text-[#462B18] bg-[#FAF6F0] p-3 rounded-2xl flex flex-col sm:flex-row justify-between gap-2">
                            <div>
                              <span className="font-semibold block text-[#7D5E46]">
                                Menu Pesanan:
                              </span>
                              <div className="space-y-0.5 mt-0.5">
                                {order.items.map((it, idx) => (
                                  <span key={idx} className="block">
                                    &bull; {it.quantity}x {it.productName} ({formatRupiah(it.subtotal)})
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div className="text-right sm:text-left">
                              <span className="font-semibold block text-[#7D5E46]">
                                Titik Ambil / Alamat:
                              </span>
                              <p className="font-bold text-[#3B2618]">
                                {order.pickupOption === 'kampus' ? 'Kampus' : 'Kurir'} &bull; {order.pickupLocation}
                              </p>
                              <p className="text-[11px] text-[#7D5E46] mt-1">
                                Metode: <strong>{order.paymentMethod}</strong>
                              </p>
                            </div>
                          </div>

                          {/* Bukti Transfer & Action Control Buttons */}
                          <div className="pt-2 border-t border-[#E6D8C7]/50 flex flex-wrap items-center justify-between gap-2">
                            {/* Tombol Lihat Bukti Transfer */}
                            {order.transferProofUrl ? (
                              <button
                                type="button"
                                onClick={() => setPreviewProofUrl(order.transferProofUrl!)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 text-sky-700 border border-sky-200 text-xs font-bold hover:bg-sky-100"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Lihat Foto Bukti Transfer</span>
                              </button>
                            ) : (
                              <span className="text-[11px] text-[#7D5E46] italic">
                                {order.paymentMethod === 'COD'
                                  ? 'COD (Bayar tunai di kampus)'
                                  : 'Belum upload bukti transfer'}
                              </span>
                            )}

                            {/* Tombol Pengubah Status Admin */}
                            <div className="flex flex-wrap items-center gap-1.5">
                              {/* Validasi Lunas */}
                              {order.status === 'MENUNGGU_VERIFIKASI' ||
                              order.status === 'MENUNGGU_PEMBAYARAN' ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onUpdateOrderStatus(order.id, 'LUNAS_PRODUKSI')
                                  }
                                  className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition"
                                >
                                  Validasi Lunas
                                </button>
                              ) : null}

                              {/* Set Ready to Pick Up */}
                              {order.status === 'LUNAS_PRODUKSI' && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onUpdateOrderStatus(order.id, 'READY_PICKUP')
                                  }
                                  className="px-3 py-1.5 rounded-xl bg-[#5C3A21] text-white font-bold text-xs hover:bg-[#462B18] transition flex items-center gap-1"
                                >
                                  <ChefHat className="w-3.5 h-3.5" />
                                  <span>Set Ready to Pick Up</span>
                                </button>
                              )}

                              {/* Kirim Notifikasi WA Ready to Pick Up */}
                              {order.status === 'READY_PICKUP' && (
                                <a
                                  href={`https://wa.me/${order.customerPhone.replace(
                                    /^0/,
                                    '62'
                                  )}?text=${encodeURIComponent(
                                    buildWhatsAppReadyPickupMessage(order)
                                  )}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition flex items-center gap-1"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                  <span>Kirim Notif WA Siap Diambil</span>
                                </a>
                              )}

                              {/* Tandai Selesai */}
                              {order.status === 'READY_PICKUP' && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onUpdateOrderStatus(order.id, 'SELESAI')
                                  }
                                  className="px-3 py-1.5 rounded-xl bg-stone-700 text-white font-bold text-xs hover:bg-stone-800"
                                >
                                  Tandai Selesai
                                </button>
                              )}

                              {/* Tolak */}
                              {order.status !== 'SELESAI' &&
                                order.status !== 'DITOLAK' && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onUpdateOrderStatus(order.id, 'DITOLAK')
                                    }
                                    className="px-2.5 py-1.5 rounded-xl border border-rose-300 text-rose-600 text-xs font-semibold hover:bg-rose-50"
                                  >
                                    Tolak
                                  </button>
                                )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ================= TAB 2: KELOLA MENU & KUOTA BATCH ================= */}
              {activeTab === 'menu' && (
                <div className="space-y-6">
                  {/* Form Atur Jadwal Batch PO */}
                  <form
                    onSubmit={handleSaveBatchConfig}
                    className="p-5 rounded-3xl bg-[#FAF6F0] border border-[#E6D8C7] space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-[#5C3A21]" />
                        <h4 className="font-extrabold text-sm text-[#3B2618]">
                          Pengaturan Jadwal Open PO &amp; Jadwal Pick Up Kampus
                        </h4>
                      </div>
                      {batchSaveToast && (
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                          Jadwal PO Berhasil Diperbarui!
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-[#3B2618] mb-1">
                          Nama Batch PO
                        </label>
                        <input
                          type="text"
                          value={editBatchName}
                          onChange={(e) => setEditBatchName(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-[#E6D8C7] bg-white text-xs text-[#3B2618]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#3B2618] mb-1">
                          Batas Waktu Order
                        </label>
                        <input
                          type="text"
                          value={editOrderDeadline}
                          onChange={(e) => setEditOrderDeadline(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-[#E6D8C7] bg-white text-xs text-[#3B2618]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#3B2618] mb-1">
                          Tanggal Ready Pick Up
                        </label>
                        <input
                          type="text"
                          value={editReadyDate}
                          onChange={(e) => setEditReadyDate(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-[#E6D8C7] bg-white text-xs text-[#3B2618]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#3B2618] mb-1">
                          Jam Ready Pick Up
                        </label>
                        <input
                          type="text"
                          value={editReadyTime}
                          onChange={(e) => setEditReadyTime(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-[#E6D8C7] bg-white text-xs text-[#3B2618]"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-[#5C3A21] text-white font-bold text-xs hover:bg-[#462B18]"
                      >
                        Simpan Perubahan Jadwal PO
                      </button>
                    </div>
                  </form>

                  {/* Header Daftar Menu & Tombol Tambah Menu */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-extrabold text-base text-[#3B2618]">
                        Katalog Menu &amp; Stok Kuota Real-Time
                      </h4>
                      <p className="text-xs text-[#7D5E46]">
                        Atur harga kampus, sisa kuota batch, atau sembunyikan menu
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowAddMenuModal(true)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#5C3A21] text-white text-xs font-bold hover:bg-[#462B18]"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Tambah Menu Baru</span>
                    </button>
                  </div>

                  {/* Tabel / Grid Menu */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {products.map((product) => (
                      <div
                        key={product.id}
                        className="p-4 rounded-3xl border border-[#E6D8C7] bg-white flex flex-col justify-between space-y-3 shadow-2xs"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">{product.emoji}</span>
                              <div>
                                <h5 className="font-extrabold text-sm text-[#3B2618]">
                                  {product.name}
                                </h5>
                                <span className="text-[11px] text-[#7D5E46]">
                                  {product.categoryLabel} &bull; {formatRupiah(product.price)}
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleToggleProductActive(product.id)}
                              className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                                product.isActive
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-stone-200 text-stone-600'
                              }`}
                            >
                              {product.isActive ? 'Aktif' : 'Disembunyikan'}
                            </button>
                          </div>

                          <p className="text-xs text-[#6E523D] mt-2 line-clamp-2">
                            {product.description}
                          </p>
                        </div>

                        {/* Kontrol Kuota Stok & Aksi Hapus */}
                        <div className="pt-2 border-t border-[#E6D8C7]/50 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-[#7D5E46]">Kuota Stok:</span>
                            <input
                              type="number"
                              min={0}
                              value={product.stockQuota}
                              onChange={(e) =>
                                handleUpdateStockQuota(
                                  product.id,
                                  parseInt(e.target.value) || 0
                                )
                              }
                              className="w-16 px-2 py-1 rounded-lg border border-[#E6D8C7] text-xs font-bold text-center"
                            />
                            <span className="text-[11px] text-[#7D5E46]">porsi</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(product.id)}
                            className="p-1.5 text-stone-400 hover:text-rose-600 transition"
                            title="Hapus Menu"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ================= TAB 3: KEUANGAN & ANALITIK ================= */}
              {activeTab === 'finance' && (
                <div className="space-y-6">
                  {/* Financial Overview Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                    <div className="p-4 rounded-3xl bg-[#FAF6F0] border border-[#E6D8C7]">
                      <span className="text-xs text-[#7D5E46] block font-medium">
                        Total Revenue (Omzet)
                      </span>
                      <p className="text-lg sm:text-xl font-black text-[#5C3A21] mt-1">
                        {formatRupiah(revenue)}
                      </p>
                      <span className="text-[10px] text-emerald-700 font-bold">
                        Dari {orders.filter((o) => o.status !== 'DITOLAK').length} pesanan valid
                      </span>
                    </div>

                    <div className="p-4 rounded-3xl bg-[#FAF6F0] border border-[#E6D8C7]">
                      <span className="text-xs text-[#7D5E46] block font-medium">
                        Total Pengeluaran (Beban)
                      </span>
                      <p className="text-lg sm:text-xl font-black text-rose-700 mt-1">
                        {formatRupiah(totalExpenses)}
                      </p>
                      <span className="text-[10px] text-stone-500">
                        {expenses.length} transaksi tercatat
                      </span>
                    </div>

                    <div className="p-4 rounded-3xl bg-emerald-50 border border-emerald-200">
                      <span className="text-xs text-emerald-800 block font-medium">
                        Laba Bersih (Net Profit)
                      </span>
                      <p className="text-lg sm:text-xl font-black text-emerald-900 mt-1">
                        {formatRupiah(netProfit)}
                      </p>
                      <span className="text-[10px] text-emerald-700 font-bold">
                        Margin Laba: {profitMargin}%
                      </span>
                    </div>

                    <div className="p-4 rounded-3xl bg-[#FAF6F0] border border-[#E6D8C7]">
                      <span className="text-xs text-[#7D5E46] block font-medium">
                        Rata-Rata Order (AOV)
                      </span>
                      <p className="text-lg sm:text-xl font-black text-[#3B2618] mt-1">
                        {formatRupiah(averageOrderValue)}
                      </p>
                      <span className="text-[10px] text-[#5C3A21] font-semibold">
                        Per transaksi kampus
                      </span>
                    </div>
                  </div>

                  {/* Analitik Segmen & Rasio Pelanggan */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Segmen Pelanggan */}
                    <div className="p-4 sm:p-5 rounded-3xl bg-white border border-[#E6D8C7] space-y-3">
                      <h5 className="font-extrabold text-sm text-[#3B2618]">
                        Segmen Pelanggan Kampus
                      </h5>
                      <div className="space-y-2">
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span>Mahasiswa Kampus</span>
                            <span className="font-bold">{customerSegments.mahasiswa}%</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-stone-100 overflow-hidden">
                            <div
                              className="h-full bg-[#5C3A21] rounded-full"
                              style={{ width: `${customerSegments.mahasiswa}%` }}
                            ></div>
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span>Siswa / Pelajar Sekitar</span>
                            <span className="font-bold">{customerSegments.siswa}%</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-stone-100 overflow-hidden">
                            <div
                              className="h-full bg-amber-500 rounded-full"
                              style={{ width: `${customerSegments.siswa}%` }}
                            ></div>
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span>Masyarakat Umum / Staf Dosen</span>
                            <span className="font-bold">{customerSegments.umum}%</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-stone-100 overflow-hidden">
                            <div
                              className="h-full bg-emerald-600 rounded-full"
                              style={{ width: `${customerSegments.umum}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Rasio Repeat vs New Customer */}
                    <div className="p-4 sm:p-5 rounded-3xl bg-white border border-[#E6D8C7] space-y-3">
                      <h5 className="font-extrabold text-sm text-[#3B2618]">
                        Rasio Repeat vs New Customer
                      </h5>
                      <div className="flex items-center justify-around py-3">
                        <div className="text-center">
                          <span className="text-2xl font-black text-[#5C3A21]">
                            {repeatCustomerRatio}%
                          </span>
                          <span className="block text-xs text-[#7D5E46]">
                            Repeat Customer
                          </span>
                        </div>
                        <div className="h-10 w-px bg-stone-200"></div>
                        <div className="text-center">
                          <span className="text-2xl font-black text-amber-600">
                            {100 - repeatCustomerRatio}%
                          </span>
                          <span className="block text-xs text-[#7D5E46]">
                            Pelanggan Baru
                          </span>
                        </div>
                      </div>
                      <p className="text-[11px] text-[#7D5E46] text-center italic">
                        *Menunjukkan loyalitas mahasiswa memesan ulang per batch PO berikutnya.
                      </p>
                    </div>
                  </div>

                  {/* Form Catat Pengeluaran Baru & Daftar Pengeluaran */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Form Catat Pengeluaran */}
                    <form
                      onSubmit={handleAddExpenseSubmit}
                      className="p-4 sm:p-5 rounded-3xl bg-[#FAF6F0] border border-[#E6D8C7] space-y-3"
                    >
                      <h5 className="font-extrabold text-sm text-[#3B2618]">
                        + Catat Pengeluaran Baru
                      </h5>

                      {expenseSuccessMsg && (
                        <p className="text-xs font-bold text-emerald-800 bg-emerald-100 p-2 rounded-xl">
                          Pengeluaran berhasil dicatat!
                        </p>
                      )}

                      <div>
                        <label className="block text-xs font-bold text-[#3B2618] mb-1">
                          Kategori Beban
                        </label>
                        <select
                          value={expenseCategory}
                          onChange={(e: any) => setExpenseCategory(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-[#E6D8C7] bg-white text-xs text-[#3B2618]"
                        >
                          <option value="Bahan Baku">Bahan Baku (Cokelat, Mentega, Tepung)</option>
                          <option value="Kemasan & Stiker">Kemasan Box, Tas &amp; Stiker Logo</option>
                          <option value="Operasional">Gas, Listrik &amp; Plastik Takeaway</option>
                          <option value="Lainnya">Lain-lain</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#3B2618] mb-1">
                          Deskripsi Pengeluaran
                        </label>
                        <input
                          type="text"
                          value={expenseDesc}
                          onChange={(e) => setExpenseDesc(e.target.value)}
                          placeholder="Misal: Belgian Dark Chocolate 2kg"
                          className="w-full px-3 py-2 rounded-xl border border-[#E6D8C7] bg-white text-xs text-[#3B2618]"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#3B2618] mb-1">
                          Nominal Pengeluaran (Rp)
                        </label>
                        <input
                          type="number"
                          step={1000}
                          value={expenseAmount}
                          onChange={(e) => setExpenseAmount(parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded-xl border border-[#E6D8C7] bg-white text-xs text-[#3B2618]"
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2.5 rounded-xl bg-[#5C3A21] text-white font-bold text-xs hover:bg-[#462B18]"
                      >
                        Simpan Pengeluaran
                      </button>
                    </form>

                    {/* Daftar Pengeluaran Terakhir */}
                    <div className="lg:col-span-2 p-4 sm:p-5 rounded-3xl bg-white border border-[#E6D8C7] space-y-3">
                      <div className="flex items-center justify-between">
                        <h5 className="font-extrabold text-sm text-[#3B2618]">
                          Riwayat Catatan Pengeluaran ({expenses.length})
                        </h5>
                        <span className="font-black text-xs text-rose-700">
                          Total: {formatRupiah(totalExpenses)}
                        </span>
                      </div>

                      <div className="divide-y divide-stone-100 max-h-64 overflow-y-auto pr-1">
                        {expenses.map((exp) => (
                          <div
                            key={exp.id}
                            className="py-2.5 flex items-center justify-between text-xs"
                          >
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-[#3B2618]">
                                  {exp.description}
                                </span>
                                <span className="text-[10px] px-2 py-0.2 rounded-md bg-[#F2E8DC] text-[#5C3A21]">
                                  {exp.category}
                                </span>
                              </div>
                              <span className="text-[11px] text-[#7D5E46]">{exp.date}</span>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="font-bold text-rose-700">
                                -{formatRupiah(exp.amount)}
                              </span>
                              <button
                                type="button"
                                onClick={() => onDeleteExpense(exp.id)}
                                className="text-stone-300 hover:text-rose-600 transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= MODAL TAMBAH MENU BARU ================= */}
        {showAddMenuModal && (
          <div className="fixed inset-0 z-60 bg-black/60 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-5 space-y-4 border border-[#E6D8C7] shadow-xl">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-base text-[#3B2618]">
                  Tambah Menu AJCUlicious Baru
                </h4>
                <button
                  type="button"
                  onClick={() => setShowAddMenuModal(false)}
                  className="text-stone-400 hover:text-stone-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddNewMenu} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold mb-1">Nama Produk</label>
                  <input
                    type="text"
                    value={newMenuName}
                    onChange={(e) => setNewMenuName(e.target.value)}
                    placeholder="Contoh: Dubai Chewy Cookies Matcha"
                    className="w-full px-3 py-2 rounded-xl border border-[#E6D8C7] text-xs"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold mb-1">Kategori</label>
                    <select
                      value={newMenuCategory}
                      onChange={(e: any) => setNewMenuCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#E6D8C7] text-xs"
                    >
                      <option value="dubai-cookies">Dubai Cookies</option>
                      <option value="cookies">Soft Cookies</option>
                      <option value="brownies">Fudgy Brownies</option>
                      <option value="dessert-box">Dessert Box</option>
                      <option value="dimsum">Dimsum Hangat</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1">Emoji / Ikon</label>
                    <input
                      type="text"
                      value={newMenuEmoji}
                      onChange={(e) => setNewMenuEmoji(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#E6D8C7] text-xs text-center"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold mb-1">Harga (Rp)</label>
                    <input
                      type="number"
                      step={1000}
                      value={newMenuPrice}
                      onChange={(e) => setNewMenuPrice(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-xl border border-[#E6D8C7] text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1">Kuota Stok</label>
                    <input
                      type="number"
                      value={newMenuQuota}
                      onChange={(e) => setNewMenuQuota(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-xl border border-[#E6D8C7] text-xs"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">Deskripsi Menu</label>
                  <textarea
                    rows={2}
                    value={newMenuDesc}
                    onChange={(e) => setNewMenuDesc(e.target.value)}
                    placeholder="Deskripsi singkat menggugah selera..."
                    className="w-full px-3 py-2 rounded-xl border border-[#E6D8C7] text-xs"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-[#5C3A21] text-white font-bold text-xs hover:bg-[#462B18]"
                >
                  Simpan Menu ke Katalog
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ================= MODAL PREVIEW BUKTI TRANSFER ================= */}
        {previewProofUrl && (
          <div className="fixed inset-0 z-60 bg-black/70 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-[#3B2618]">
                  Foto Bukti Transfer Pembeli
                </span>
                <button
                  type="button"
                  onClick={() => setPreviewProofUrl(null)}
                  className="text-stone-400 hover:text-stone-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="rounded-2xl overflow-hidden border border-stone-200 bg-stone-50 flex items-center justify-center max-h-[70vh]">
                <img
                  src={previewProofUrl}
                  alt="Bukti Transfer"
                  className="max-h-[68vh] object-contain w-auto mx-auto"
                />
              </div>

              <button
                type="button"
                onClick={() => setPreviewProofUrl(null)}
                className="w-full py-2 rounded-xl bg-[#5C3A21] text-white text-xs font-bold"
              >
                Tutup Pratinjau
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
