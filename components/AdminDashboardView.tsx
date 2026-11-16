'use client';

import React, { useState, useMemo } from 'react';
import {
  Store,
  LogOut,
  Download,
  Calendar,
  ChefHat,
  Utensils,
  TrendingUp,
  CreditCard,
  DollarSign,
  Package,
  Plus,
  Trash2,
  Eye,
  MessageCircle,
  FileSpreadsheet,
  CheckCircle,
  Clock,
  Sparkles,
  AlertCircle,
  X,
  Search,
  Users,
  Check,
  ShieldCheck,
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
import { BATCH_LIST } from '../data/initial_data';
import { formatRupiah, buildWhatsAppReadyPickupMessage } from '../utils/formatters';

interface AdminDashboardViewProps {
  onBackToStore: () => void;
  onLogout: () => void;
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

export default function AdminDashboardView({
  onBackToStore,
  onLogout,
  products,
  onUpdateProducts,
  orders,
  onUpdateOrderStatus,
  expenses,
  onAddExpense,
  onDeleteExpense,
  batchConfig,
  onUpdateBatchConfig,
}: AdminDashboardViewProps) {
  // Batch Filter
  const [selectedBatch, setSelectedBatch] = useState<string>('Semua Batch');

  // Active Management Tab
  const [activeTab, setActiveTab] = useState<'orders' | 'kitchen' | 'catalog' | 'expenses'>('orders');

  // Orders Table Filter & Search
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<'ALL' | OrderStatus>('ALL');

  // Preview Proof Modal
  const [previewProofUrl, setPreviewProofUrl] = useState<string | null>(null);

  // New Menu Modal
  const [showAddMenuModal, setShowAddMenuModal] = useState(false);
  const [newMenuName, setNewMenuName] = useState('');
  const [newMenuCategory, setNewMenuCategory] = useState<CategorySlug>('cookies');
  const [newMenuPrice, setNewMenuPrice] = useState<number>(20000);
  const [newMenuQuota, setNewMenuQuota] = useState<number>(20);
  const [newMenuDesc, setNewMenuDesc] = useState('');
  const [newMenuEmoji, setNewMenuEmoji] = useState('🍪');

  // Expense Form State
  const [expBatch, setExpBatch] = useState<string>(batchConfig.batchName);
  const [expDate, setExpDate] = useState('17 Nov 2026');
  const [expCategory, setExpCategory] = useState<'Bahan Baku' | 'Kemasan & Stiker' | 'Operasional' | 'Lainnya'>('Bahan Baku');
  const [expDesc, setExpDesc] = useState('');
  const [expAmount, setExpAmount] = useState<number>(50000);
  const [expSuccessToast, setExpSuccessToast] = useState(false);

  // Batch PO Schedule Form State
  const [editBatchName, setEditBatchName] = useState(batchConfig.batchName);
  const [editOrderDeadline, setEditOrderDeadline] = useState(batchConfig.orderDeadline);
  const [editReadyDate, setEditReadyDate] = useState(batchConfig.readyPickupDate);
  const [editReadyTime, setEditReadyTime] = useState(batchConfig.readyPickupTime);
  const [batchSaveToast, setBatchSaveToast] = useState(false);

  // Filtered Orders & Expenses according to selectedBatch
  const filteredOrdersByBatch = useMemo(() => {
    if (selectedBatch === 'Semua Batch') return orders;
    return orders.filter((o) => (o.batchName || batchConfig.batchName) === selectedBatch);
  }, [orders, selectedBatch, batchConfig.batchName]);

  const filteredExpensesByBatch = useMemo(() => {
    if (selectedBatch === 'Semua Batch') return expenses;
    return expenses.filter((e) => (e.batchName || batchConfig.batchName) === selectedBatch);
  }, [expenses, selectedBatch, batchConfig.batchName]);

  // ================= 1. 6 TOP KPI STATISTIC CALCULATIONS =================
  const kpiStats = useMemo(() => {
    const validOrders = filteredOrdersByBatch.filter(
      (o) => o.status !== 'DITOLAK' && o.status !== 'MENUNGGU_PEMBAYARAN'
    );
    const revenue = validOrders.reduce((sum, o) => sum + o.totalPrice, 0);

    const totalOrdersCount = filteredOrdersByBatch.length;
    const lunasCount = filteredOrdersByBatch.filter(
      (o) => o.status === 'LUNAS_PRODUKSI' || o.status === 'READY_PICKUP' || o.status === 'SELESAI'
    ).length;
    const lunasPercent = totalOrdersCount > 0 ? Math.round((lunasCount / totalOrdersCount) * 100) : 0;

    const totalExpenses = filteredExpensesByBatch.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = revenue - totalExpenses;
    const profitMargin = revenue > 0 ? ((netProfit / revenue) * 100).toFixed(1) : '0';
    const aov = validOrders.length > 0 ? Math.round(revenue / validOrders.length) : 0;

    // Best Seller Product
    const productVolumeMap: Record<string, number> = {};
    validOrders.forEach((o) => {
      o.items.forEach((it) => {
        productVolumeMap[it.productName] = (productVolumeMap[it.productName] || 0) + it.quantity;
      });
    });

    let bestSellerName = 'Dubai Chewy Cookies Pistachio';
    let maxVolume = 0;
    Object.entries(productVolumeMap).forEach(([name, count]) => {
      if (count > maxVolume) {
        maxVolume = count;
        bestSellerName = name;
      }
    });

    return {
      revenue,
      totalOrdersCount,
      lunasPercent,
      totalExpenses,
      netProfit,
      profitMargin,
      aov,
      bestSeller: `${bestSellerName} (${maxVolume || 28} pcs)`,
    };
  }, [filteredOrdersByBatch, filteredExpensesByBatch]);

  // ================= 2. ANALYTICS CHART DATA (VOLUME VS REVENUE) =================
  const productAnalytics = useMemo(() => {
    const validOrders = filteredOrdersByBatch.filter((o) => o.status !== 'DITOLAK');
    const stats: Record<string, { name: string; volume: number; revenue: number; emoji: string }> = {};

    products.forEach((p) => {
      stats[p.name] = { name: p.name, volume: 0, revenue: 0, emoji: p.emoji };
    });

    validOrders.forEach((o) => {
      o.items.forEach((it) => {
        if (!stats[it.productName]) {
          stats[it.productName] = { name: it.productName, volume: 0, revenue: 0, emoji: '🍪' };
        }
        stats[it.productName].volume += it.quantity;
        stats[it.productName].revenue += it.subtotal;
      });
    });

    return Object.values(stats);
  }, [filteredOrdersByBatch, products]);

  // Customer Segments & Retention Ratio
  const customerAnalytics = useMemo(() => {
    let mhs = 0,
      siswa = 0,
      umum = 0,
      repeat = 0;
    const total = filteredOrdersByBatch.length || 1;

    filteredOrdersByBatch.forEach((o) => {
      if (o.customerSegment === 'Mahasiswa') mhs++;
      else if (o.customerSegment === 'Siswa') siswa++;
      else umum++;

      if (o.isRepeatCustomer) repeat++;
    });

    return {
      mhsPercent: Math.round((mhs / total) * 100),
      siswaPercent: Math.round((siswa / total) * 100),
      umumPercent: Math.round((umum / total) * 100),
      repeatPercent: Math.round((repeat / total) * 100),
      newPercent: 100 - Math.round((repeat / total) * 100),
    };
  }, [filteredOrdersByBatch]);

  // ================= 3. KITCHEN PRODUCTION RECAP (LUNAS / PRODUKSI) =================
  const kitchenProductionRecap = useMemo(() => {
    const kitchenOrders = filteredOrdersByBatch.filter(
      (o) => o.status === 'LUNAS_PRODUKSI' || o.status === 'READY_PICKUP' || o.status === 'SELESAI'
    );

    const map: Record<string, { name: string; quantity: number; revenue: number }> = {};
    kitchenOrders.forEach((o) => {
      o.items.forEach((it) => {
        if (!map[it.productName]) {
          map[it.productName] = { name: it.productName, quantity: 0, revenue: 0 };
        }
        map[it.productName].quantity += it.quantity;
        map[it.productName].revenue += it.subtotal;
      });
    });

    return Object.values(map);
  }, [filteredOrdersByBatch]);

  // Orders Filtered for the Table View
  const tableOrders = useMemo(() => {
    return filteredOrdersByBatch.filter((o) => {
      const matchStatus = orderStatusFilter === 'ALL' || o.status === orderStatusFilter;
      const q = orderSearchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        o.invoiceCode.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.customerPhone.includes(q);
      return matchStatus && matchSearch;
    });
  }, [filteredOrdersByBatch, orderStatusFilter, orderSearchQuery]);

  // ================= 4. EXCEL EXPORT (.XLSX) MULTI-SHEET FUNCTION =================
  const handleDownloadExcel = () => {
    // Sheet 1: Laporan Penjualan Detail
    const sheet1Rows = [
      ['LAPORAN PENJUALAN KULINER AJCULICIOUS'],
      ['Tanggal Ekspor', new Date().toLocaleDateString('id-ID'), 'Filter Batch', selectedBatch],
      [''],
      [
        'Kode Pesanan',
        'Tanggal Order',
        'Periode Batch',
        'Nama Pembeli',
        'No. WhatsApp',
        'Kategori Pelanggan',
        'Rincian Menu & Qty',
        'Metode Pengambilan',
        'Titik / Alamat',
        'Metode Pembayaran',
        'Status Pembayaran',
        'Total Nominal (Rp)',
      ],
      ...filteredOrdersByBatch.map((o) => [
        o.invoiceCode,
        o.createdAt,
        o.batchName || batchConfig.batchName,
        o.customerName,
        o.customerPhone,
        o.customerSegment || 'Mahasiswa',
        o.items.map((i) => `${i.productName} (${i.quantity}x)`).join('; '),
        o.pickupOption === 'kampus' ? 'Ambil di Kampus' : 'Antar Kurir',
        o.pickupLocation,
        o.paymentMethod,
        o.status.replace(/_/g, ' '),
        o.totalPrice,
      ]),
      [''],
      [
        'TOTAL OMZET VALID (RP)',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        kpiStats.revenue,
      ],
    ];

    // Sheet 2: Ringkasan Finansial & Produksi Dapur
    const sheet2Rows = [
      ['RINGKASAN FINANSIAL & KEBUTUHAN PRODUKSI AJCULICIOUS'],
      ['Periode Batch', selectedBatch],
      [''],
      ['A. RINGKASAN KEUANGAN'],
      ['Indikator Finansial', 'Nilai'],
      ['Total Penjualan (Revenue)', kpiStats.revenue],
      ['Total Pengeluaran (Expenses)', kpiStats.totalExpenses],
      ['Laba Bersih (Net Profit)', kpiStats.netProfit],
      ['Profit Margin', `${kpiStats.profitMargin}%`],
      ['Average Order Value (AOV)', kpiStats.aov],
      ['Total Pesanan Masuk', kpiStats.totalOrdersCount],
      [''],
      ['B. REKAP KEBUTUHAN PRODUKSI DAPUR (PESANAN LUNAS)'],
      ['Nama Menu', 'Total Kuantitas Terjual / Lunas (Pcs)', 'Total Omzet Menu (Rp)'],
      ...kitchenProductionRecap.map((k) => [k.name, k.quantity, k.revenue]),
    ];

    // Create workbook and append sheets
    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.aoa_to_sheet(sheet1Rows);
    const ws2 = XLSX.utils.aoa_to_sheet(sheet2Rows);

    // Set custom column widths for readability
    ws1['!cols'] = [
      { wch: 18 }, // Kode Pesanan
      { wch: 20 }, // Tanggal
      { wch: 28 }, // Batch
      { wch: 20 }, // Nama
      { wch: 16 }, // WA
      { wch: 18 }, // Kategori
      { wch: 35 }, // Rincian
      { wch: 18 }, // Pengambilan
      { wch: 25 }, // Alamat
      { wch: 15 }, // Bayar
      { wch: 20 }, // Status
      { wch: 18 }, // Total
    ];

    ws2['!cols'] = [
      { wch: 35 },
      { wch: 25 },
      { wch: 20 },
    ];

    XLSX.utils.book_append_sheet(wb, ws1, 'Laporan Penjualan');
    XLSX.utils.book_append_sheet(wb, ws2, 'Ringkasan Keuangan & Dapur');

    const fileName = `Laporan_Penjualan_AJCUlicious_${selectedBatch.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // Menu Handlers
  const handleToggleProductActive = (productId: string) => {
    onUpdateProducts(
      products.map((p) => (p.id === productId ? { ...p, isActive: !p.isActive } : p))
    );
  };

  const handleUpdateStockQuota = (productId: string, newQuota: number) => {
    if (newQuota < 0) return;
    onUpdateProducts(
      products.map((p) => (p.id === productId ? { ...p, stockQuota: newQuota } : p))
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

  // Add Expense
  const handleAddExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expDesc.trim() || expAmount <= 0) return;

    onAddExpense({
      batchName: expBatch,
      date: expDate,
      category: expCategory,
      description: expDesc.trim(),
      amount: expAmount,
    });

    setExpDesc('');
    setExpSuccessToast(true);
    setTimeout(() => setExpSuccessToast(false), 2000);
  };

  // Save Batch Config
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

  return (
    <div className="min-h-screen bg-[#FAF6F0] text-[#3B2618] flex flex-col font-sans">
      {/* ================= ADMIN TOP NAVIGATION BAR ================= */}
      <header className="sticky top-0 z-40 bg-[#FFFDF9] border-b border-[#E6D8C7] px-4 sm:px-6 py-3 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#5C3A21] text-white flex items-center justify-center font-black text-lg shadow-sm border border-[#E6D8C7]">
              AJC
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-lg text-[#3B2618]">
                  Dashboard Admin AJCUlicious
                </h1>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-300 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  Super Admin
                </span>
              </div>
              <p className="text-xs text-[#7D5E46]">
                Pusat Kontrol Penjualan, Produksi Dapur &amp; Pembukuan Batch
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-auto">
            {/* Tombol Lihat Toko (Beranda) */}
            <button
              type="button"
              suppressHydrationWarning
              onClick={onBackToStore}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E6D8C7] bg-[#FAF6F0] hover:bg-[#F2E8DC] text-[#5C3A21] font-bold text-xs transition shadow-2xs"
            >
              <Store className="w-4 h-4 text-[#5C3A21]" />
              <span>Lihat Toko (Beranda)</span>
            </button>

            {/* Tombol Logout */}
            <button
              type="button"
              suppressHydrationWarning
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-xs border border-rose-200 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* ================= MAIN DASHBOARD BODY ================= */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6 sm:space-y-8">
        {/* TOP CONTROLS: FILTER BATCH PO & TOMBOL UNDUH LAPORAN EXCEL (.XLSX) */}
        <div className="bg-[#FFFDF9] border border-[#E6D8C7] rounded-3xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#F2E8DC] text-[#5C3A21] flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5 text-[#5C3A21]" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-[#7D5E46] uppercase tracking-wider block">
                Pilih Periode Batch PO
              </span>
              <select
                suppressHydrationWarning
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="mt-0.5 px-3 py-1.5 rounded-xl border border-[#E6D8C7] bg-white font-extrabold text-xs sm:text-sm text-[#3B2618] focus:outline-none focus:ring-2 focus:ring-[#5C3A21]"
              >
                {BATCH_LIST.map((batch) => (
                  <option key={batch} value={batch}>
                    {batch}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tombol Menonjol Unduh Laporan Excel (.xlsx) dengan SheetJS */}
          <button
            type="button"
            suppressHydrationWarning
            onClick={handleDownloadExcel}
            className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-600 text-white font-extrabold text-xs sm:text-sm hover:bg-emerald-700 active:scale-95 transition-all shadow-md group"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-200 group-hover:scale-110 transition-transform" />
            <span>Unduh Laporan Excel (.xlsx)</span>
          </button>
        </div>

        {/* ================= SECTION A: 6 KARTU STATISTIK KPI UTAMA ================= */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4">
          {/* Card 1: Total Penjualan (Revenue) */}
          <div className="bg-[#FFFDF9] border border-[#E6D8C7] rounded-3xl p-4 shadow-2xs hover:shadow-xs transition">
            <span className="text-[11px] font-semibold text-[#7D5E46] block">
              Total Penjualan
            </span>
            <p className="font-black text-base sm:text-lg text-[#5C3A21] mt-1 tracking-tight">
              {formatRupiah(kpiStats.revenue)}
            </p>
            <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md mt-1.5 inline-block">
              &bull; Pesanan Lunas
            </span>
          </div>

          {/* Card 2: Total Pesanan */}
          <div className="bg-[#FFFDF9] border border-[#E6D8C7] rounded-3xl p-4 shadow-2xs hover:shadow-xs transition">
            <span className="text-[11px] font-semibold text-[#7D5E46] block">
              Total Pesanan
            </span>
            <p className="font-black text-base sm:text-lg text-[#3B2618] mt-1 tracking-tight">
              {kpiStats.totalOrdersCount} Pesanan
            </p>
            <span className="text-[10px] text-sky-700 font-bold bg-sky-50 px-2 py-0.5 rounded-md mt-1.5 inline-block">
              {kpiStats.lunasPercent}% Terverifikasi
            </span>
          </div>

          {/* Card 3: Total Pengeluaran (Expenses) */}
          <div className="bg-[#FFFDF9] border border-[#E6D8C7] rounded-3xl p-4 shadow-2xs hover:shadow-xs transition">
            <span className="text-[11px] font-semibold text-[#7D5E46] block">
              Total Pengeluaran
            </span>
            <p className="font-black text-base sm:text-lg text-rose-700 mt-1 tracking-tight">
              {formatRupiah(kpiStats.totalExpenses)}
            </p>
            <span className="text-[10px] text-stone-600 font-medium bg-stone-100 px-2 py-0.5 rounded-md mt-1.5 inline-block">
              {filteredExpensesByBatch.length} Pos Biaya
            </span>
          </div>

          {/* Card 4: Laba Bersih & Margin */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-3xl p-4 shadow-2xs hover:shadow-xs transition">
            <span className="text-[11px] font-bold text-emerald-900 block">
              Laba Bersih
            </span>
            <p className="font-black text-base sm:text-lg text-emerald-800 mt-1 tracking-tight">
              {formatRupiah(kpiStats.netProfit)}
            </p>
            <span className="text-[10px] text-emerald-700 font-extrabold bg-white px-2 py-0.5 rounded-md mt-1.5 inline-block border border-emerald-300">
              Margin {kpiStats.profitMargin}%
            </span>
          </div>

          {/* Card 5: Average Order Value (AOV) */}
          <div className="bg-[#FFFDF9] border border-[#E6D8C7] rounded-3xl p-4 shadow-2xs hover:shadow-xs transition">
            <span className="text-[11px] font-semibold text-[#7D5E46] block">
              Nilai Rata-Rata (AOV)
            </span>
            <p className="font-black text-base sm:text-lg text-[#3B2618] mt-1 tracking-tight">
              {formatRupiah(kpiStats.aov)}
            </p>
            <span className="text-[10px] text-[#5C3A21] font-semibold bg-[#F2E8DC] px-2 py-0.5 rounded-md mt-1.5 inline-block">
              Per Transaksi
            </span>
          </div>

          {/* Card 6: Item Terlaris */}
          <div className="bg-[#FFFDF9] border border-[#E6D8C7] rounded-3xl p-4 shadow-2xs hover:shadow-xs transition">
            <span className="text-[11px] font-semibold text-[#7D5E46] block">
              Item Terlaris
            </span>
            <p className="font-bold text-xs text-[#5C3A21] mt-1 line-clamp-2 leading-tight">
              {kpiStats.bestSeller}
            </p>
            <span className="text-[10px] text-amber-800 font-bold bg-[#FEF3C7] px-2 py-0.5 rounded-md mt-1.5 inline-block">
              Top Selling PO
            </span>
          </div>
        </div>

        {/* ================= SECTION B: VISUALISASI GRAFIK ANALITIK ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Grafik 1: Penjualan per Produk (Volume vs Revenue) */}
          <div className="lg:col-span-2 bg-[#FFFDF9] border border-[#E6D8C7] rounded-3xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-sm sm:text-base text-[#3B2618]">
                  Grafik Penjualan per Menu (Volume vs Omzet)
                </h3>
                <p className="text-[11px] text-[#7D5E46]">
                  Perbandingan porsi terjual dan total omzet Rupiah tiap varian produk
                </p>
              </div>
              <span className="text-[11px] font-bold text-[#5C3A21] bg-[#F2E8DC] px-2.5 py-1 rounded-full border border-[#E6D8C7]">
                Batch: {selectedBatch.split(' - ')[0]}
              </span>
            </div>

            {/* SVG/Tailwind Bar Chart */}
            <div className="space-y-3 pt-2">
              {productAnalytics.map((item) => {
                const maxRev = Math.max(...productAnalytics.map((p) => p.revenue), 100000);
                const percent = Math.min(100, Math.round((item.revenue / maxRev) * 100));

                return (
                  <div key={item.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{item.emoji}</span>
                        <span className="font-bold text-[#3B2618] line-clamp-1">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-extrabold text-[#5C3A21]">{item.volume} pcs</span>
                        <span className="font-bold text-stone-700 min-w-[75px] text-right">
                          {formatRupiah(item.revenue)}
                        </span>
                      </div>
                    </div>

                    {/* Bar Visual Progress */}
                    <div className="w-full h-3 rounded-full bg-[#FAF6F0] border border-[#E6D8C7]/50 overflow-hidden flex">
                      <div
                        className="h-full bg-gradient-to-r from-[#5C3A21] to-[#8C5D38] rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Grafik 2: Segmen Pelanggan & Rasio Retensi */}
          <div className="bg-[#FFFDF9] border border-[#E6D8C7] rounded-3xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
            <div>
              <h3 className="font-black text-sm sm:text-base text-[#3B2618]">
                Segmen Pelanggan &amp; Retensi
              </h3>
              <p className="text-[11px] text-[#7D5E46]">
                Komposisi pembeli kampus serta perbandingan loyalitas repeat order
              </p>
            </div>

            {/* Segmen Progress */}
            <div className="space-y-3 py-2">
              <span className="text-xs font-bold text-[#5C3A21] block">
                Komposisi Pembeli:
              </span>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-[#3B2618]">Mahasiswa Kampus</span>
                  <span className="font-bold text-[#5C3A21]">{customerAnalytics.mhsPercent}%</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-stone-100 overflow-hidden">
                  <div
                    className="h-full bg-[#5C3A21] rounded-full"
                    style={{ width: `${customerAnalytics.mhsPercent}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-[#3B2618]">Siswa / Pelajar Sekitar</span>
                  <span className="font-bold text-amber-700">{customerAnalytics.siswaPercent}%</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-stone-100 overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full"
                    style={{ width: `${customerAnalytics.siswaPercent}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-[#3B2618]">Masyarakat Umum / Staf Dosen</span>
                  <span className="font-bold text-emerald-800">{customerAnalytics.umumPercent}%</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-stone-100 overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full"
                    style={{ width: `${customerAnalytics.umumPercent}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Retention Ratio */}
            <div className="pt-3 border-t border-[#E6D8C7] bg-[#FAF6F0] p-3.5 rounded-2xl">
              <span className="text-xs font-bold text-[#3B2618] block mb-2">
                Rasio Pelanggan:
              </span>
              <div className="flex items-center justify-around text-center">
                <div>
                  <span className="text-2xl font-black text-[#5C3A21]">
                    {customerAnalytics.repeatPercent}%
                  </span>
                  <span className="block text-[11px] text-[#7D5E46] font-semibold">
                    Repeat Customer
                  </span>
                </div>
                <div className="h-8 w-px bg-stone-300"></div>
                <div>
                  <span className="text-2xl font-black text-amber-600">
                    {customerAnalytics.newPercent}%
                  </span>
                  <span className="block text-[11px] text-[#7D5E46] font-semibold">
                    Pelanggan Baru
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ================= SECTION C: 4 TAB NAVIGASI MANAJEMEN ADMIN ================= */}
        <div className="bg-[#FFFDF9] border border-[#E6D8C7] rounded-3xl shadow-sm overflow-hidden">
          {/* Tab Headers */}
          <div className="border-b border-[#E6D8C7] bg-[#FAF6F0] p-2 sm:p-3 flex flex-wrap gap-2">
            <button
              type="button"
              suppressHydrationWarning
              onClick={() => setActiveTab('orders')}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'orders'
                  ? 'bg-[#5C3A21] text-white shadow-xs'
                  : 'bg-white text-[#5C3A21] border border-[#E6D8C7] hover:bg-[#F2E8DC]'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>1. Daftar Pesanan &amp; Verifikasi Bayar</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
                {filteredOrdersByBatch.length}
              </span>
            </button>

            <button
              type="button"
              suppressHydrationWarning
              onClick={() => setActiveTab('kitchen')}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'kitchen'
                  ? 'bg-[#5C3A21] text-white shadow-xs'
                  : 'bg-white text-[#5C3A21] border border-[#E6D8C7] hover:bg-[#F2E8DC]'
              }`}
            >
              <ChefHat className="w-3.5 h-3.5" />
              <span>2. Rekap Produksi Dapur</span>
            </button>

            <button
              type="button"
              suppressHydrationWarning
              onClick={() => setActiveTab('catalog')}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'catalog'
                  ? 'bg-[#5C3A21] text-white shadow-xs'
                  : 'bg-white text-[#5C3A21] border border-[#E6D8C7] hover:bg-[#F2E8DC]'
              }`}
            >
              <Utensils className="w-3.5 h-3.5" />
              <span>3. Kelola Katalog &amp; Kuota Batch</span>
            </button>

            <button
              type="button"
              suppressHydrationWarning
              onClick={() => setActiveTab('expenses')}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'expenses'
                  ? 'bg-[#5C3A21] text-white shadow-xs'
                  : 'bg-white text-[#5C3A21] border border-[#E6D8C7] hover:bg-[#F2E8DC]'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>4. Catatan Pengeluaran (Expenses)</span>
            </button>
          </div>

          {/* Tab Content Body */}
          <div className="p-4 sm:p-6">
            {/* ================= TAB 1: DAFTAR PESANAN & VERIFIKASI ================= */}
            {activeTab === 'orders' && (
              <div className="space-y-4">
                {/* Search & Status Filter Pills */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 text-[#8C6D53] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      suppressHydrationWarning
                      value={orderSearchQuery}
                      onChange={(e) => setOrderSearchQuery(e.target.value)}
                      placeholder="Cari Invoice, Nama, atau No. WA..."
                      className="w-full pl-9 pr-4 py-2 rounded-2xl border border-[#E6D8C7] text-xs text-[#3B2618] bg-white focus:outline-none focus:ring-2 focus:ring-[#5C3A21]"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                    {[
                      { id: 'ALL', label: 'Semua Status' },
                      { id: 'MENUNGGU_VERIFIKASI', label: 'Menunggu Verifikasi' },
                      { id: 'LUNAS_PRODUKSI', label: 'Lunas / Produksi' },
                      { id: 'READY_PICKUP', label: 'Ready to Pick Up' },
                      { id: 'SELESAI', label: 'Selesai' },
                    ].map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        suppressHydrationWarning
                        onClick={() => setOrderStatusFilter(st.id as any)}
                        className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition ${
                          orderStatusFilter === st.id
                            ? 'bg-[#5C3A21] text-white'
                            : 'bg-[#FAF6F0] text-[#5C3A21] border border-[#E6D8C7]'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Orders Table */}
                <div className="border border-[#E6D8C7] rounded-2xl overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FAF6F0] border-b border-[#E6D8C7] text-[#5C3A21] font-bold">
                      <tr>
                        <th className="p-3">Kode &amp; Tanggal</th>
                        <th className="p-3">Pembeli &amp; WA</th>
                        <th className="p-3">Rincian Menu</th>
                        <th className="p-3">Pengambilan</th>
                        <th className="p-3">Bayar &amp; Total</th>
                        <th className="p-3">Bukti Bayar</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Aksi Admin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6D8C7]/60 bg-white">
                      {tableOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-[#FAF6F0]/50 transition">
                          <td className="p-3">
                            <span className="font-mono font-bold text-[#5C3A21] bg-[#F2E8DC] px-2 py-0.5 rounded-md">
                              #{order.invoiceCode}
                            </span>
                            <span className="block text-[11px] text-[#7D5E46] mt-1">
                              {order.createdAt}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="font-bold text-[#3B2618] block">{order.customerName}</span>
                            <span className="text-[#7D5E46]">{order.customerPhone}</span>
                            <span className="block text-[10px] text-stone-500">
                              {order.customerSegment} {order.isRepeatCustomer && '&bull; Repeat'}
                            </span>
                          </td>
                          <td className="p-3 max-w-[200px]">
                            {order.items.map((it, idx) => (
                              <span key={idx} className="block text-[11px]">
                                {it.quantity}x {it.productName}
                              </span>
                            ))}
                          </td>
                          <td className="p-3">
                            <span className="font-bold block">
                              {order.pickupOption === 'kampus' ? 'Ambil di Kampus' : 'Antar Kurir'}
                            </span>
                            <span className="text-[11px] text-[#7D5E46]">{order.pickupLocation}</span>
                          </td>
                          <td className="p-3">
                            <span className="font-black text-[#5C3A21] text-sm block">
                              {formatRupiah(order.totalPrice)}
                            </span>
                            <span className="text-[11px] text-[#7D5E46]">{order.paymentMethod}</span>
                          </td>
                          <td className="p-3">
                            {order.transferProofUrl ? (
                              <button
                                type="button"
                                suppressHydrationWarning
                                onClick={() => setPreviewProofUrl(order.transferProofUrl!)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 text-[11px] font-bold hover:bg-sky-100"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Lihat Foto</span>
                              </button>
                            ) : (
                              <span className="text-[10px] text-stone-400 italic">
                                {order.paymentMethod === 'COD' ? 'COD (Tunai)' : 'Belum upload'}
                              </span>
                            )}
                          </td>
                          <td className="p-3">
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
                                  : 'bg-stone-100 text-stone-600'
                              }`}
                            >
                              {order.status.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="inline-flex flex-wrap items-center justify-end gap-1">
                              {/* Validasi Lunas */}
                              {(order.status === 'MENUNGGU_VERIFIKASI' ||
                                order.status === 'MENUNGGU_PEMBAYARAN') && (
                                <button
                                  type="button"
                                  suppressHydrationWarning
                                  onClick={() => onUpdateOrderStatus(order.id, 'LUNAS_PRODUKSI')}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px] hover:bg-emerald-700"
                                >
                                  Validasi Lunas
                                </button>
                              )}

                              {/* Set Ready to Pick Up */}
                              {order.status === 'LUNAS_PRODUKSI' && (
                                <button
                                  type="button"
                                  suppressHydrationWarning
                                  onClick={() => onUpdateOrderStatus(order.id, 'READY_PICKUP')}
                                  className="px-2.5 py-1 rounded-lg bg-[#5C3A21] text-white font-bold text-[11px] hover:bg-[#462B18]"
                                >
                                  Set Ready
                                </button>
                              )}

                              {/* Kirim Notif WA */}
                              {order.status === 'READY_PICKUP' && (
                                <a
                                  href={`https://wa.me/${order.customerPhone.replace(/^0/, '62')}?text=${encodeURIComponent(
                                    buildWhatsAppReadyPickupMessage(order)
                                  )}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px] hover:bg-emerald-700 flex items-center gap-1"
                                >
                                  <MessageCircle className="w-3 h-3" />
                                  <span>WA Pembeli</span>
                                </a>
                              )}

                              {/* Selesai */}
                              {order.status === 'READY_PICKUP' && (
                                <button
                                  type="button"
                                  suppressHydrationWarning
                                  onClick={() => onUpdateOrderStatus(order.id, 'SELESAI')}
                                  className="px-2.5 py-1 rounded-lg bg-stone-700 text-white font-bold text-[11px]"
                                >
                                  Selesai
                                </button>
                              )}

                              {/* Tolak */}
                              {order.status !== 'SELESAI' && order.status !== 'DITOLAK' && (
                                <button
                                  type="button"
                                  suppressHydrationWarning
                                  onClick={() => onUpdateOrderStatus(order.id, 'DITOLAK')}
                                  className="px-2 py-1 rounded-lg border border-rose-300 text-rose-600 text-[11px] hover:bg-rose-50"
                                >
                                  Tolak
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ================= TAB 2: REKAP PRODUKSI DAPUR ================= */}
            {activeTab === 'kitchen' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-[#FAF6F0] border border-[#E6D8C7] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <ChefHat className="w-6 h-6 text-[#5C3A21]" />
                    <div>
                      <h4 className="font-extrabold text-sm text-[#3B2618]">
                        Panduan Jumlah Produksi Dapur ({selectedBatch})
                      </h4>
                      <p className="text-xs text-[#7D5E46]">
                        Hanya menjumlahkan porsi menu dari pesanan berstatus Lunas / Masuk Antrean
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
                    Total Menu Lunas: {kitchenProductionRecap.reduce((sum, k) => sum + k.quantity, 0)} pcs
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {kitchenProductionRecap.map((item) => (
                    <div
                      key={item.name}
                      className="p-4 rounded-2xl border border-[#E6D8C7] bg-white flex items-center justify-between shadow-2xs"
                    >
                      <div>
                        <h5 className="font-extrabold text-sm text-[#3B2618]">{item.name}</h5>
                        <span className="text-[11px] text-[#7D5E46]">
                          Omzet Terkumpul: {formatRupiah(item.revenue)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-xl text-[#5C3A21] bg-[#F2E8DC] px-3 py-1 rounded-xl">
                          {item.quantity} pcs
                        </span>
                        <span className="block text-[10px] text-emerald-700 font-bold mt-1">
                          Wajib Dimasak
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ================= TAB 3: KELOLA KATALOG & KUOTA BATCH ================= */}
            {activeTab === 'catalog' && (
              <div className="space-y-6">
                {/* Form Jadwal Batch PO */}
                <form
                  onSubmit={handleSaveBatchConfig}
                  className="p-4 sm:p-5 rounded-2xl bg-[#FAF6F0] border border-[#E6D8C7] space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-sm text-[#3B2618]">
                      Pengaturan Jadwal Batch PO Aktif (Tampil di Beranda)
                    </h4>
                    {batchSaveToast && (
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-0.5 rounded-full">
                        Jadwal Berhasil Disimpan!
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold mb-1">Nama Batch</label>
                      <input
                        type="text"
                        value={editBatchName}
                        onChange={(e) => setEditBatchName(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl border border-[#E6D8C7] bg-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold mb-1">Batas Akhir PO</label>
                      <input
                        type="text"
                        value={editOrderDeadline}
                        onChange={(e) => setEditOrderDeadline(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl border border-[#E6D8C7] bg-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold mb-1">Tanggal Pick Up</label>
                      <input
                        type="text"
                        value={editReadyDate}
                        onChange={(e) => setEditReadyDate(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl border border-[#E6D8C7] bg-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold mb-1">Jam Pick Up</label>
                      <input
                        type="text"
                        value={editReadyTime}
                        onChange={(e) => setEditReadyTime(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl border border-[#E6D8C7] bg-white text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      suppressHydrationWarning
                      className="px-4 py-2 rounded-xl bg-[#5C3A21] text-white font-bold text-xs hover:bg-[#462B18]"
                    >
                      Simpan Jadwal PO
                    </button>
                  </div>
                </form>

                {/* Header Produk & Tombol Tambah Menu */}
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-extrabold text-sm text-[#3B2618]">
                      Katalog Menu &amp; Kuota Stok ({products.length} Menu)
                    </h4>
                    <p className="text-xs text-[#7D5E46]">
                      Ubah kuota stok secara real-time atau sembunyikan menu dari beranda
                    </p>
                  </div>
                  <button
                    type="button"
                    suppressHydrationWarning
                    onClick={() => setShowAddMenuModal(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#5C3A21] text-white text-xs font-bold hover:bg-[#462B18]"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambah Menu Baru</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {products.map((product) => (
                    <div
                      key={product.id}
                      className="p-4 rounded-2xl border border-[#E6D8C7] bg-white flex flex-col justify-between space-y-3 shadow-2xs"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{product.emoji}</span>
                            <div>
                              <h5 className="font-extrabold text-sm text-[#3B2618]">{product.name}</h5>
                              <span className="text-xs text-[#7D5E46]">
                                {product.categoryLabel} &bull; {formatRupiah(product.price)}
                              </span>
                            </div>
                          </div>

                          {/* Tombol Toggle Aktif / Sembunyikan per Menu */}
                          <button
                            type="button"
                            suppressHydrationWarning
                            onClick={() => handleToggleProductActive(product.id)}
                            className={`text-[10px] font-bold px-3 py-1 rounded-full transition ${
                              product.isActive
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-stone-200 text-stone-600'
                            }`}
                          >
                            {product.isActive ? 'Tampil di Toko' : 'Disembunyikan'}
                          </button>
                        </div>

                        <p className="text-xs text-[#6E523D] mt-2 line-clamp-2">
                          {product.description}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-[#E6D8C7]/50 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-[#7D5E46]">Stok Kuota:</span>
                          <input
                            type="number"
                            min={0}
                            value={product.stockQuota}
                            onChange={(e) =>
                              handleUpdateStockQuota(product.id, parseInt(e.target.value) || 0)
                            }
                            className="w-16 px-2 py-1 rounded-lg border border-[#E6D8C7] text-xs font-bold text-center"
                          />
                          <span className="text-[11px] text-[#7D5E46]">porsi</span>
                        </div>

                        <button
                          type="button"
                          suppressHydrationWarning
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

            {/* ================= TAB 4: PENCATATAN PENGELUARAN (EXPENSES) ================= */}
            {activeTab === 'expenses' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  {/* Form Input Pengeluaran per Batch */}
                  <form
                    onSubmit={handleAddExpenseSubmit}
                    className="p-4 sm:p-5 rounded-2xl bg-[#FAF6F0] border border-[#E6D8C7] space-y-3"
                  >
                    <h4 className="font-extrabold text-sm text-[#3B2618]">
                      + Catat Pengeluaran Baru
                    </h4>

                    {expSuccessToast && (
                      <p className="text-xs font-bold text-emerald-800 bg-emerald-100 p-2 rounded-xl">
                        Pengeluaran berhasil dicatat!
                      </p>
                    )}

                    <div>
                      <label className="block text-[11px] font-bold mb-1">Batch Terkait</label>
                      <select
                        value={expBatch}
                        onChange={(e) => setExpBatch(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-[#E6D8C7] bg-white text-xs"
                      >
                        {BATCH_LIST.filter((b) => b !== 'Semua Batch').map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold mb-1">Kategori Biaya</label>
                      <select
                        value={expCategory}
                        onChange={(e: any) => setExpCategory(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-[#E6D8C7] bg-white text-xs"
                      >
                        <option value="Bahan Baku">Bahan Baku (Cokelat, Mentega, Dimsum)</option>
                        <option value="Kemasan & Stiker">Kemasan Box Dus &amp; Stiker Logo</option>
                        <option value="Operasional">Gas Oven &amp; Plastik Takeaway</option>
                        <option value="Lainnya">Lain-lain</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold mb-1">Deskripsi Biaya</label>
                      <input
                        type="text"
                        value={expDesc}
                        onChange={(e) => setExpDesc(e.target.value)}
                        placeholder="Misal: Dark Chocolate Callebaut 2kg"
                        className="w-full px-3 py-2 rounded-xl border border-[#E6D8C7] bg-white text-xs"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold mb-1">Nominal (Rp)</label>
                      <input
                        type="number"
                        step={1000}
                        value={expAmount}
                        onChange={(e) => setExpAmount(parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 rounded-xl border border-[#E6D8C7] bg-white text-xs"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      suppressHydrationWarning
                      className="w-full py-2.5 rounded-xl bg-[#5C3A21] text-white font-bold text-xs hover:bg-[#462B18]"
                    >
                      Simpan Biaya ke Pembukuan
                    </button>
                  </form>

                  {/* List Pengeluaran Terkait */}
                  <div className="lg:col-span-2 p-4 sm:p-5 rounded-2xl bg-white border border-[#E6D8C7] space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-extrabold text-sm text-[#3B2618]">
                        Riwayat Biaya ({selectedBatch})
                      </h4>
                      <span className="font-black text-xs text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg">
                        Total Biaya: {formatRupiah(kpiStats.totalExpenses)}
                      </span>
                    </div>

                    <div className="divide-y divide-stone-100 max-h-72 overflow-y-auto pr-1">
                      {filteredExpensesByBatch.map((exp) => (
                        <div key={exp.id} className="py-2.5 flex items-center justify-between text-xs">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-[#3B2618]">{exp.description}</span>
                              <span className="text-[10px] px-2 py-0.2 rounded-md bg-[#F2E8DC] text-[#5C3A21]">
                                {exp.category}
                              </span>
                            </div>
                            <span className="text-[11px] text-[#7D5E46]">
                              {exp.date} &bull; {exp.batchName || 'Batch'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="font-bold text-rose-700">-{formatRupiah(exp.amount)}</span>
                            <button
                              type="button"
                              suppressHydrationWarning
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
      </main>

      {/* ================= MODAL PREVIEW BUKTI TRANSFER ================= */}
      {previewProofUrl && (
        <div className="fixed inset-0 z-60 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-[#3B2618]">Foto Bukti Pembayaran</span>
              <button
                type="button"
                suppressHydrationWarning
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
              suppressHydrationWarning
              onClick={() => setPreviewProofUrl(null)}
              className="w-full py-2.5 rounded-xl bg-[#5C3A21] text-white text-xs font-bold"
            >
              Tutup Pratinjau
            </button>
          </div>
        </div>
      )}

      {/* ================= MODAL TAMBAH MENU BARU ================= */}
      {showAddMenuModal && (
        <div className="fixed inset-0 z-60 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 space-y-4 border border-[#E6D8C7] shadow-xl">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-base text-[#3B2618]">Tambah Menu AJCUlicious Baru</h4>
              <button
                type="button"
                suppressHydrationWarning
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
                suppressHydrationWarning
                className="w-full py-2.5 rounded-xl bg-[#5C3A21] text-white font-bold text-xs hover:bg-[#462B18]"
              >
                Simpan Menu ke Katalog
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
