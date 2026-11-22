'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  Info,
  Eye,
  Calculator,
  Phone,
  User,
  Image as ImageIcon,
  Scale,
  Layers,
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
  TopSellingProductStat,
} from '../types/database';
import {
  getAdminOrdersAndSummary,
  updateOrderStatus,
  updateOrderPaymentStatus,
  sendReadyPickupWhatsAppViaFonnte,
  upsertProduct,
  updateProductStockAndAvailability,
  updateBatchSettingsInDb,
} from '../actions/admin-actions';
import { getCatalogProducts } from '../actions/catalog-actions';
import { formatRupiah } from '../utils/formatters';
import { useBodyScrollLock } from '../utils/useBodyScrollLock';
import {
  evaluateBatchOpenStatus,
  isoToWitaDateTimeLocal,
  witaDateTimeLocalToIso,
  formatWitaDateTimeDisplay,
  formatWitaDateOnlyDisplay,
  formatPickupTimeRange,
} from '../utils/batchSchedule';

function extractBatchNumber(name?: string | null): number | null {
  if (!name) return null;
  const match = name.match(/#\s*(\d+)/) || name.match(/\bbatch\s+(\d+)\b/i);
  if (!match) return null;
  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : null;
}

function buildSummaryFromOrders(orders: OrderWithItems[]): SalesSummaryReport {
  const activeOrders = orders.filter((o) => o.status !== 'BATAL');
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

  return {
    total_omzet: activeOrders.reduce((sum, o) => sum + o.total_price, 0),
    total_orders: orders.length,
    cod_orders_count: activeOrders.filter((o) => o.payment_method === 'COD')
      .length,
    qris_orders_count: activeOrders.filter((o) => o.payment_method === 'QRIS')
      .length,
    transfer_orders_count: activeOrders.filter(
      (o) => o.payment_method === 'TRANSFER'
    ).length,
    paid_orders_count: activeOrders.filter(
      (o) => o.payment_status === 'SUDAH_BAYAR'
    ).length,
    unpaid_orders_count: activeOrders.filter(
      (o) => (o.payment_status || 'BELUM_BAYAR') === 'BELUM_BAYAR'
    ).length,
    pending_orders_count: orders.filter((o) => o.status === 'PENDING').length,
    ready_orders_count: orders.filter((o) => o.status === 'SIAP_DIAMBIL').length,
    completed_orders_count: orders.filter((o) => o.status === 'SELESAI').length,
    cancelled_orders_count: orders.filter((o) => o.status === 'BATAL').length,
    top_products: Array.from(productStatsMap.values()).sort(
      (a, b) => b.total_quantity_sold - a.total_quantity_sold
    ),
  };
}

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
  const [activeTab, setActiveTab] = useState<
    'orders' | 'catalog' | 'report' | 'calculator'
  >('orders');

  // Modal Detail Pelanggan & Lihat Bukti TF/QRIS
  const [selectedOrderInfo, setSelectedOrderInfo] =
    useState<OrderWithItems | null>(null);
  const [proofModalTab, setProofModalTab] = useState<'info' | 'proof'>('info');

  // Kalkulator Perhitungan Bahan Produksi States
  const [calcSelectedProduct, setCalcSelectedProduct] = useState<string>(
    'Brownies (150g)'
  );
  const [calcMode, setCalcMode] = useState<'stock_to_pcs' | 'pcs_to_stock'>(
    'stock_to_pcs'
  );
  const [calcTargetPcs, setCalcTargetPcs] = useState<number>(100);
  const [calcIngredients, setCalcIngredients] = useState<
    Array<{
      id: string;
      name: string;
      unit: string;
      stockAvailable: number;
      needPerPcs: number;
    }>
  >([
    {
      id: 'ing-1',
      name: 'Tepung Terigu Protein Sedang',
      unit: 'gr',
      stockAvailable: 100,
      needPerPcs: 1,
    },
    {
      id: 'ing-2',
      name: 'Belgian Dark Chocolate',
      unit: 'gr',
      stockAvailable: 200,
      needPerPcs: 2,
    },
    {
      id: 'ing-3',
      name: 'Butter / Mentega Anchor',
      unit: 'gr',
      stockAvailable: 150,
      needPerPcs: 1.5,
    },
    {
      id: 'ing-4',
      name: 'Gula Halus / Brown Sugar',
      unit: 'gr',
      stockAvailable: 100,
      needPerPcs: 1,
    },
  ]);
  const [newIngName, setNewIngName] = useState('');
  const [newIngUnit, setNewIngUnit] = useState('gr');
  const [newIngStock, setNewIngStock] = useState<number>(100);
  const [newIngNeed, setNewIngNeed] = useState<number>(1);

  // Live Supabase Data States
  const initialBatchNumber =
    batchConfig?.batchNumber ||
    extractBatchNumber(batchConfig?.batchName) ||
    1;
  const initialBatchName =
    batchConfig?.batchName || `Batch #${initialBatchNumber}`;

  const [dbOrders, setDbOrders] = useState<OrderWithItems[]>([]);
  const [activeBatchMeta, setActiveBatchMeta] = useState<{
    batchNumber: number;
    batchName: string;
  }>({
    batchNumber: initialBatchNumber,
    batchName: initialBatchName,
  });
  const [selectedBatchFilter, setSelectedBatchFilter] = useState<number | 'ALL'>(
    initialBatchNumber
  );
  const hasPickedBatchRef = useRef(false);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [sendingWaId, setSendingWaId] = useState<string | null>(null);
  const [sentReadyWaIds, setSentReadyWaIds] = useState<Record<string, boolean>>({});
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

  // Form Jadwal Batch PO (Berbasis Date & Time Picker WITA Otomatis)
  const [batchNumberInput, setBatchNumberInput] =
    useState<number>(initialBatchNumber);
  const [batchNameInput, setBatchNameInput] = useState(initialBatchName);
  const [batchOpenAtInput, setBatchOpenAtInput] = useState(
    isoToWitaDateTimeLocal(batchConfig?.orderOpenAt) || '2026-11-18T08:00'
  );
  const [batchCloseAtInput, setBatchCloseAtInput] = useState(
    isoToWitaDateTimeLocal(batchConfig?.orderCloseAt) || '2026-11-19T21:00'
  );
  const [batchPickupDateIsoInput, setBatchPickupDateIsoInput] = useState(
    batchConfig?.pickupDateIso || '2026-11-20'
  );
  const [batchPickupStartTimeInput, setBatchPickupStartTimeInput] = useState(
    batchConfig?.pickupStartTime || '13:00'
  );
  const [batchPickupEndTimeInput, setBatchPickupEndTimeInput] = useState(
    batchConfig?.pickupEndTime || '17:00'
  );
  const [batchPickupLocationInput, setBatchPickupLocationInput] = useState(
    batchConfig?.pickupLocations?.[0] || 'Konter Kampus AJCUlicious'
  );
  const [batchIsOpenInput, setBatchIsOpenInput] = useState(
    batchConfig?.manualIsOpen ?? batchConfig?.isOpen ?? true
  );
  const [isSavingBatch, setIsSavingBatch] = useState(false);
  const [adminNowMs, setAdminNowMs] = useState<number | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setAdminNowMs(Date.now()), 0);
    const id = setInterval(() => setAdminNowMs(Date.now()), 30000);
    return () => {
      clearTimeout(t);
      clearInterval(id);
    };
  }, []);

  useBodyScrollLock(Boolean(selectedOrderInfo || showProductModal));

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
        if (ordersRes.data.activeBatch) {
          const liveNum = ordersRes.data.activeBatch.batch_number;
          const liveName = ordersRes.data.activeBatch.batch_name;
          setActiveBatchMeta({ batchNumber: liveNum, batchName: liveName });
          if (!hasPickedBatchRef.current) {
            setSelectedBatchFilter(liveNum);
          }
        }
      }

      if (allDbProducts && allDbProducts.length > 0) {
        onUpdateProductsRef.current(allDbProducts);
      }

      try {
        const savedWa = localStorage.getItem('ajc_sent_ready_wa_ids');
        if (savedWa) {
          setSentReadyWaIds(JSON.parse(savedWa));
        }
      } catch {}
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

  // Handler Kirim WA Pesanan Siap Langsung via Fonnte API
  const handleSendDirectFonnteWa = async (order: OrderWithItems) => {
    setSendingWaId(order.id);
    const res = await sendReadyPickupWhatsAppViaFonnte(order.id);
    setSendingWaId(null);

    if (res.success && res.data) {
      setSentReadyWaIds((prev) => {
        const next = { ...prev, [order.id]: true };
        try {
          localStorage.setItem('ajc_sent_ready_wa_ids', JSON.stringify(next));
        } catch {}
        return next;
      });
      showToast(
        `Pesan WA Pesanan Siap berhasil dikirim langsung ke ${res.data.phone} via Fonnte`
      );
    } else {
      showToast(
        res.error ||
          'Gagal mengirim WA via Fonnte. Pastikan perangkat terhubung di dashboard Fonnte.'
      );
    }
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
    const openIso = witaDateTimeLocalToIso(batchOpenAtInput);
    const closeIso = witaDateTimeLocalToIso(batchCloseAtInput);

    if (!openIso || !closeIso) {
      showToast('Tanggal & jam buka/tutup PO wajib diisi.');
      return;
    }

    if (Date.parse(closeIso) <= Date.parse(openIso)) {
      showToast('Tanggal & jam tutup PO harus lebih akhir dari waktu buka PO.');
      return;
    }

    const formattedDeadline = formatWitaDateTimeDisplay(batchCloseAtInput);
    const formattedPickupDate = formatWitaDateOnlyDisplay(
      batchPickupDateIsoInput
    );
    const formattedPickupTime = formatPickupTimeRange(
      batchPickupStartTimeInput,
      batchPickupEndTimeInput
    );
    const cleanLocation =
      batchPickupLocationInput.trim() || 'Konter Kampus AJCUlicious';

    setIsSavingBatch(true);
    const res = await updateBatchSettingsInDb({
      batchNumber: batchNumberInput,
      batchName: batchNameInput,
      isOpen: batchIsOpenInput,
      orderOpenAt: openIso,
      orderCloseAt: closeIso,
      orderDeadline: formattedDeadline,
      pickupDateIso: batchPickupDateIsoInput,
      pickupStartTime: batchPickupStartTimeInput,
      pickupEndTime: batchPickupEndTimeInput,
      readyPickupDate: formattedPickupDate,
      readyPickupTime: formattedPickupTime,
      pickupLocation: cleanLocation,
    });
    setIsSavingBatch(false);
    if (res.success) {
      const savedBatchNumber = res.data?.batchNumber ?? batchNumberInput;
      setBatchNumberInput(savedBatchNumber);
      setActiveBatchMeta({
        batchNumber: savedBatchNumber,
        batchName: batchNameInput.trim(),
      });
      hasPickedBatchRef.current = true;
      setSelectedBatchFilter(savedBatchNumber);

      const liveEval = evaluateBatchOpenStatus(
        {
          isOpen: batchIsOpenInput,
          orderOpenAt: openIso,
          orderCloseAt: closeIso,
        },
        Date.now()
      );
      if (onUpdateBatchConfig && batchConfig) {
        onUpdateBatchConfig({
          ...batchConfig,
          batchNumber: savedBatchNumber,
          batchName: batchNameInput,
          isOpen: liveEval.effectiveIsOpen,
          manualIsOpen: batchIsOpenInput,
          orderOpenAt: openIso,
          orderCloseAt: closeIso,
          orderDeadline: formattedDeadline,
          pickupDateIso: batchPickupDateIsoInput,
          pickupStartTime: batchPickupStartTimeInput,
          pickupEndTime: batchPickupEndTimeInput,
          readyPickupDate: formattedPickupDate,
          readyPickupTime: formattedPickupTime,
          pickupLocations: [cleanLocation],
        });
      }
      showToast(
        `Jadwal Batch #${savedBatchNumber} tersimpan! Status: ${liveEval.statusLabel}`
      );
    } else {
      showToast(res.error || 'Gagal menyimpan jadwal Pre-Order.');
    }
  };

  const formatCustomerWaDestination = (phone?: string) => {
    if (!phone || phone === '-') return '';
    const digits = phone.replace(/[^\d]/g, '');
    if (digits.startsWith('08')) return '62' + digits.slice(1);
    if (digits.startsWith('628')) return digits;
    if (digits.startsWith('8')) return '62' + digits;
    return digits;
  };

  const handleLoadRecipePreset = (
    productName: string,
    mode: 'simulasi_100' | 'standar_dapur'
  ) => {
    setCalcSelectedProduct(productName);
    const lower = productName.toLowerCase();

    if (mode === 'simulasi_100') {
      // Sesuai contoh PDF: 100g tepung + coklat sekian gram -> otomatis bisa jadi 100 brownies/produk
      if (lower.includes('dimsum')) {
        setCalcIngredients([
          { id: '1', name: 'Daging Ayam & Udang Giling', unit: 'gr', stockAvailable: 100, needPerPcs: 1 },
          { id: '2', name: 'Tepung Tapioka', unit: 'gr', stockAvailable: 50, needPerPcs: 0.5 },
          { id: '3', name: 'Kulit Dimsum', unit: 'lbr', stockAvailable: 100, needPerPcs: 1 },
        ]);
      } else {
        setCalcIngredients([
          { id: '1', name: 'Tepung Terigu', unit: 'gr', stockAvailable: 100, needPerPcs: 1 },
          { id: '2', name: 'Cokelat / Dark Chocolate', unit: 'gr', stockAvailable: 200, needPerPcs: 2 },
          { id: '3', name: 'Butter / Mentega', unit: 'gr', stockAvailable: 100, needPerPcs: 1 },
          { id: '4', name: 'Gula Halus / Brown Sugar', unit: 'gr', stockAvailable: 100, needPerPcs: 1 },
        ]);
      }
      return;
    }

    // Mode Standar Dapur Realistis
    if (lower.includes('dubai')) {
      setCalcIngredients([
        { id: '1', name: 'Tepung Terigu Protein Sedang', unit: 'gr', stockAvailable: 1000, needPerPcs: 25 },
        { id: '2', name: 'Belgian Dark Chocolate', unit: 'gr', stockAvailable: 800, needPerPcs: 20 },
        { id: '3', name: 'Krim Pistachio & Kunafa', unit: 'gr', stockAvailable: 600, needPerPcs: 15 },
        { id: '4', name: 'Butter Anchor', unit: 'gr', stockAvailable: 600, needPerPcs: 15 },
      ]);
    } else if (lower.includes('dimsum')) {
      setCalcIngredients([
        { id: '1', name: 'Fillet Ayam & Udang Segar', unit: 'gr', stockAvailable: 1500, needPerPcs: 90 },
        { id: '2', name: 'Tepung Tapioka Premium', unit: 'gr', stockAvailable: 500, needPerPcs: 20 },
        { id: '3', name: 'Saus Chili Oil / Mentai', unit: 'gr', stockAvailable: 600, needPerPcs: 25 },
      ]);
    } else if (lower.includes('brownies')) {
      setCalcIngredients([
        { id: '1', name: 'Tepung Terigu', unit: 'gr', stockAvailable: 1000, needPerPcs: 20 },
        { id: '2', name: 'Dark Chocolate Compound', unit: 'gr', stockAvailable: 1500, needPerPcs: 30 },
        { id: '3', name: 'Butter / Margarin', unit: 'gr', stockAvailable: 1000, needPerPcs: 20 },
        { id: '4', name: 'Gula Halus', unit: 'gr', stockAvailable: 1000, needPerPcs: 20 },
      ]);
    } else {
      setCalcIngredients([
        { id: '1', name: 'Tepung Terigu', unit: 'gr', stockAvailable: 1000, needPerPcs: 25 },
        { id: '2', name: 'Chocochip / White Choco', unit: 'gr', stockAvailable: 800, needPerPcs: 20 },
        { id: '3', name: 'Butter Anchor', unit: 'gr', stockAvailable: 600, needPerPcs: 15 },
        { id: '4', name: 'Brown Sugar', unit: 'gr', stockAvailable: 600, needPerPcs: 15 },
      ]);
    }
  };

  // Opsi filter per batch (gabungan batch dari riwayat pesanan + batch aktif saat ini)
  const batchOptions = useMemo(() => {
    const map = new Map<
      number,
      {
        batchNumber: number;
        batchName: string;
        totalOrders: number;
        activeOrders: number;
        totalOmzet: number;
        isActive: boolean;
      }
    >();

    map.set(activeBatchMeta.batchNumber, {
      batchNumber: activeBatchMeta.batchNumber,
      batchName: activeBatchMeta.batchName,
      totalOrders: 0,
      activeOrders: 0,
      totalOmzet: 0,
      isActive: true,
    });

    for (const order of dbOrders) {
      const bNum = order.batch_number ?? 1;
      const existing = map.get(bNum);
      const fallbackName = order.batch_name?.trim() || `Batch #${bNum}`;
      const entry = existing ?? {
        batchNumber: bNum,
        batchName: fallbackName,
        totalOrders: 0,
        activeOrders: 0,
        totalOmzet: 0,
        isActive: bNum === activeBatchMeta.batchNumber,
      };
      if (!existing && order.batch_name?.trim()) {
        entry.batchName = order.batch_name.trim();
      }
      entry.totalOrders += 1;
      if (order.status !== 'BATAL') {
        entry.activeOrders += 1;
        entry.totalOmzet += order.total_price;
      }
      map.set(bNum, entry);
    }

    return Array.from(map.values()).sort(
      (a, b) => b.batchNumber - a.batchNumber
    );
  }, [dbOrders, activeBatchMeta]);

  const scopedOrders = useMemo(() => {
    if (selectedBatchFilter === 'ALL') return dbOrders;
    return dbOrders.filter(
      (o) => (o.batch_number ?? 1) === selectedBatchFilter
    );
  }, [dbOrders, selectedBatchFilter]);

  const selectedBatchOption = useMemo(
    () =>
      selectedBatchFilter === 'ALL'
        ? null
        : batchOptions.find((b) => b.batchNumber === selectedBatchFilter) ||
          null,
    [batchOptions, selectedBatchFilter]
  );

  const summary = useMemo(
    () => buildSummaryFromOrders(scopedOrders),
    [scopedOrders]
  );

  const handleExportExcel = () => {
    const rows = scopedOrders.map((o) => ({
      Batch: o.batch_name || `Batch #${o.batch_number ?? 1}`,
      'Kode Invoice': o.invoice_code,
      'Nama Pemesan': o.customer_name,
      'No. WhatsApp': o.customer_phone || '-',
      'Metode Pembayaran': o.payment_method,
      'Info Bank': o.bank_info || '-',
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
    const batchSuffix =
      selectedBatchFilter === 'ALL'
        ? 'Semua_Batch'
        : `Batch_${selectedBatchFilter}`;
    XLSX.writeFile(
      wb,
      `Laporan_AJCUlicious_${batchSuffix}_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  // Filter pesanan berdasarkan Status Pesanan + Status Bayar + Pencarian di dalam Batch terpilih
  const filteredOrders = scopedOrders.filter((o) => {
    const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
    const currentPayStatus: DbPaymentStatus =
      o.payment_status === 'SUDAH_BAYAR' ? 'SUDAH_BAYAR' : 'BELUM_BAYAR';
    const matchesPayment =
      paymentFilter === 'ALL' || currentPayStatus === paymentFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !q ||
      o.invoice_code.toLowerCase().includes(q) ||
      o.customer_name.toLowerCase().includes(q) ||
      (o.customer_phone || '').toLowerCase().includes(q);
    return matchesStatus && matchesPayment && matchesQuery;
  });

  // Kalkulasi Analitik untuk Grafik Visual (mengikuti Batch terpilih)
  const activeOrders = scopedOrders.filter((o) => o.status !== 'BATAL');
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

  // Rekap jumlah produksi PO per menu (khusus Batch terpilih)
  const kitchenQueueMap = new Map<string, number>();
  for (const order of scopedOrders) {
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
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            PENDING
          </span>
        );
      case 'SIAP_DIAMBIL':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
            SIAP DIAMBIL
          </span>
        );
      case 'SELESAI':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-600 text-white">
            SELESAI
          </span>
        );
      case 'BATAL':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-600 border border-rose-200">
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
      <header className="sticky top-0 z-40 bg-white border-b border-[#EADFD3] px-4 sm:px-6 lg:px-8 py-3.5 shadow-2xs">
        <div className="w-full flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white border border-[#EADFD3] overflow-hidden flex items-center justify-center shrink-0">
              <img
                src="/images/logo-ajculicious.jpg"
                alt="Logo AJCUlicious"
                className="w-full h-full object-cover"
              />
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

      <main className="w-full min-w-0 px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* ================= FILTER & PILIH BATCH PRE-ORDER ================= */}
        <div className="bg-white border border-[#EADFD3] rounded-2xl p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#FAF6F0] border border-[#EADFD3] flex items-center justify-center text-[#5C3A21] shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-bold text-xs sm:text-sm text-[#3B2618]">
                  Cek Pesanan &amp; Laporan per Batch
                </h2>
                <p className="text-[11px] text-[#8C6D53]">
                  {selectedBatchOption
                    ? `Menampilkan khusus ${selectedBatchOption.batchName} (${selectedBatchOption.activeOrders} aktif • ${formatRupiah(
                        selectedBatchOption.totalOmzet
                      )})`
                    : `Menampilkan gabungan seluruh batch (${dbOrders.length} total pesanan)`}
                </p>
              </div>
            </div>

            {selectedBatchFilter !== activeBatchMeta.batchNumber && (
              <button
                type="button"
                onClick={() => {
                  hasPickedBatchRef.current = true;
                  setSelectedBatchFilter(activeBatchMeta.batchNumber);
                }}
                className="self-start sm:self-auto px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold transition whitespace-nowrap"
              >
                Kembali ke Batch Aktif (#{activeBatchMeta.batchNumber})
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {batchOptions.map((b) => {
              const isSelected = selectedBatchFilter === b.batchNumber;
              return (
                <button
                  key={b.batchNumber}
                  type="button"
                  onClick={() => {
                    hasPickedBatchRef.current = true;
                    setSelectedBatchFilter(b.batchNumber);
                  }}
                  title={b.batchName}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition ${
                    isSelected
                      ? 'bg-[#5C3A21] text-white border-[#5C3A21] shadow-sm'
                      : 'bg-[#FAF6F0] text-[#5C3A21] border-[#EADFD3] hover:bg-[#F2E8DC]'
                  }`}
                >
                  {b.isActive && (
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isSelected ? 'bg-emerald-300' : 'bg-emerald-500'
                      }`}
                    />
                  )}
                  <span>Batch #{b.batchNumber}</span>
                  {b.isActive && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
                        isSelected
                          ? 'bg-white/20 text-emerald-200'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      Aktif
                    </span>
                  )}
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-white text-[#5C3A21] border border-[#EADFD3]'
                    }`}
                  >
                    {b.totalOrders}
                  </span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => {
                hasPickedBatchRef.current = true;
                setSelectedBatchFilter('ALL');
              }}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition ${
                selectedBatchFilter === 'ALL'
                  ? 'bg-[#3B2618] text-white border-[#3B2618] shadow-sm'
                  : 'bg-white text-[#6E523D] border-[#EADFD3] hover:bg-[#FAF6F0]'
              }`}
            >
              <span>Semua Batch</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
                  selectedBatchFilter === 'ALL'
                    ? 'bg-white/20 text-white'
                    : 'bg-[#FAF6F0] text-[#5C3A21] border border-[#EADFD3]'
                }`}
              >
                {dbOrders.length}
              </span>
            </button>
          </div>
        </div>

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
            <p className="font-extrabold text-lg text-[#3B2618]">
              {summary.cod_orders_count} COD / {summary.qris_orders_count} QRIS /{' '}
              {summary.transfer_orders_count || 0} TF
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
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'orders'
                ? 'bg-[#5C3A21] text-white'
                : 'bg-white text-[#5C3A21] border border-[#EADFD3] hover:bg-[#F2E8DC]'
            }`}
          >
            Pesanan &amp; Verifikasi Bayar ({scopedOrders.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('catalog')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'catalog'
                ? 'bg-[#5C3A21] text-white'
                : 'bg-white text-[#5C3A21] border border-[#EADFD3] hover:bg-[#F2E8DC]'
            }`}
          >
            Katalog &amp; Bahan Produk ({products.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('report')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'report'
                ? 'bg-[#5C3A21] text-white'
                : 'bg-white text-[#5C3A21] border border-[#EADFD3] hover:bg-[#F2E8DC]'
            }`}
          >
            Rekap Produksi &amp; Jadwal PO
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('calculator')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'calculator'
                ? 'bg-[#5C3A21] text-white'
                : 'bg-white text-[#5C3A21] border border-[#EADFD3] hover:bg-[#F2E8DC]'
            }`}
          >
            Perhitungan Bahan Produksi
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
              <div className="text-center py-12 bg-white rounded-2xl border border-[#EADFD3] space-y-2.5 px-4">
                <AlertCircle className="w-6 h-6 text-[#8C6D53] mx-auto" />
                <p className="text-xs font-semibold text-[#3B2618]">
                  {selectedBatchFilter === 'ALL'
                    ? 'Belum ada pesanan yang sesuai filter'
                    : `Belum ada pesanan di Batch #${selectedBatchFilter}`}
                </p>
                {selectedBatchFilter !== 'ALL' && dbOrders.length > 0 && (
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    {batchOptions
                      .filter(
                        (b) =>
                          b.batchNumber !== selectedBatchFilter &&
                          b.totalOrders > 0
                      )
                      .slice(0, 3)
                      .map((b) => (
                        <button
                          key={b.batchNumber}
                          type="button"
                          onClick={() => {
                            hasPickedBatchRef.current = true;
                            setSelectedBatchFilter(b.batchNumber);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-[#FAF6F0] hover:bg-[#F2E8DC] border border-[#EADFD3] text-[#5C3A21] text-[11px] font-bold transition"
                        >
                          Lihat Batch #{b.batchNumber} ({b.totalOrders})
                        </button>
                      ))}
                    <button
                      type="button"
                      onClick={() => {
                        hasPickedBatchRef.current = true;
                        setSelectedBatchFilter('ALL');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[#3B2618] text-white text-[11px] font-bold transition hover:bg-[#5C3A21]"
                    >
                      Tampilkan Semua Batch ({dbOrders.length})
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredOrders.map((order) => {
                  const isBusy = processingId === order.id;
                  const isSendingWa = sendingWaId === order.id;
                  const isPaid = order.payment_status === 'SUDAH_BAYAR';

                  return (
                    <div
                      key={order.id}
                      className="bg-white border border-[#EADFD3] rounded-2xl p-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4"
                    >
                      {/* Sisi Kiri: Data Pesanan & Item */}
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-[#FAF6F0] text-[#5C3A21] border border-[#EADFD3]">
                            #{order.invoice_code}
                          </span>
                          <span
                            title={order.batch_name || `Batch #${order.batch_number ?? 1}`}
                            className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-[#5C3A21] border border-amber-200 font-bold"
                          >
                            Batch #{order.batch_number ?? 1}
                          </span>
                          <span className="font-bold text-sm text-[#3B2618]">
                            {order.customer_name}
                          </span>
                          {order.customer_phone &&
                            order.customer_phone !== '-' && (
                              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono font-semibold">
                                {order.customer_phone}
                              </span>
                            )}
                          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-stone-100 text-[#5C3A21] font-semibold">
                            {order.payment_method === 'TRANSFER'
                              ? `TF (${order.bank_info || 'Bank'})`
                              : order.payment_method}
                          </span>
                          <span
                            className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold border ${
                              isPaid
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                          >
                            {isPaid ? 'Sudah Bayar' : 'Belum Bayar'}
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

                        <div className="flex flex-wrap items-center gap-3 text-xs text-[#8C6D53]">
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

                      {/* Sisi Kanan: 1 Baris Icon-Only Sejajar Horizontal + Popup Tooltip Hover (Tombol Hilang Saat Sudah Selesai) */}
                      <div className="flex items-center flex-nowrap gap-1.5 w-full lg:w-auto justify-end border-t lg:border-t-0 pt-3 lg:pt-0 border-[#F4ECE1] shrink-0">
                        {(order.payment_proof_url ||
                          order.payment_method === 'TRANSFER' ||
                          order.payment_method === 'QRIS') && (
                          <div className="relative group">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedOrderInfo(order);
                                setProofModalTab('proof');
                              }}
                              aria-label="Lihat bukti pembayaran TF / QRIS"
                              className={`w-8 h-8 rounded-xl border flex items-center justify-center transition ${
                                order.payment_proof_url
                                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300'
                                  : 'bg-stone-50 hover:bg-stone-100 text-stone-600 border-stone-200'
                              }`}
                            >
                              <ImageIcon className="w-4 h-4" />
                            </button>
                            <span className="pointer-events-none opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-150 absolute bottom-full right-0 mb-1.5 z-30 px-2.5 py-1 rounded-lg bg-[#3B2618] text-white text-[10px] font-semibold whitespace-nowrap shadow-lg">
                              Lihat bukti pembayaran TF / QRIS
                            </span>
                          </div>
                        )}

                        <div className="relative group">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedOrderInfo(order);
                              setProofModalTab('info');
                            }}
                            aria-label="Lihat detail pelanggan"
                            className="w-8 h-8 rounded-xl border border-[#EADFD3] bg-[#FAF6F0] hover:bg-[#F2E8DC] text-[#5C3A21] flex items-center justify-center transition"
                          >
                            <User className="w-4 h-4" />
                          </button>
                          <span className="pointer-events-none opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-150 absolute bottom-full right-0 mb-1.5 z-30 px-2.5 py-1 rounded-lg bg-[#3B2618] text-white text-[10px] font-semibold whitespace-nowrap shadow-lg">
                            Lihat info lengkap pelanggan
                          </span>
                        </div>

                        {!isPaid && order.status !== 'BATAL' && (
                          <div className="relative group">
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
                              aria-label="Tandai sudah bayar"
                              className="w-8 h-8 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 flex items-center justify-center transition disabled:opacity-50"
                            >
                              <Wallet className="w-4 h-4" />
                            </button>
                            <span className="pointer-events-none opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-150 absolute bottom-full right-0 mb-1.5 z-30 px-2.5 py-1 rounded-lg bg-[#3B2618] text-white text-[10px] font-semibold whitespace-nowrap shadow-lg">
                              Tandai sudah bayar (Lunas)
                            </span>
                          </div>
                        )}

                        {!sentReadyWaIds[order.id] &&
                          order.status !== 'SELESAI' &&
                          order.status !== 'BATAL' && (
                            <div className="relative group">
                              <button
                                type="button"
                                disabled={isSendingWa}
                                onClick={() => handleSendDirectFonnteWa(order)}
                                aria-label="Kirim chat WhatsApp pesanan siap"
                                className="w-8 h-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center transition disabled:opacity-60"
                              >
                                {isSendingWa ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <MessageCircle className="w-4 h-4" />
                                )}
                              </button>
                              <span className="pointer-events-none opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-150 absolute bottom-full right-0 mb-1.5 z-30 px-2.5 py-1 rounded-lg bg-[#3B2618] text-white text-[10px] font-semibold whitespace-nowrap shadow-lg">
                                Kirim chat customer: pesanan sudah siap
                              </span>
                            </div>
                          )}

                        {order.status === 'PENDING' && (
                          <div className="relative group">
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
                              aria-label="Tandai siap diambil"
                              className="w-8 h-8 rounded-xl bg-[#5C3A21] hover:bg-[#462B18] text-white flex items-center justify-center transition disabled:opacity-50"
                            >
                              <Sparkles className="w-4 h-4" />
                            </button>
                            <span className="pointer-events-none opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-150 absolute bottom-full right-0 mb-1.5 z-30 px-2.5 py-1 rounded-lg bg-[#3B2618] text-white text-[10px] font-semibold whitespace-nowrap shadow-lg">
                              Tandai pesanan siap diambil
                            </span>
                          </div>
                        )}

                        {(order.status === 'PENDING' ||
                          order.status === 'SIAP_DIAMBIL') && (
                          <div className="relative group">
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
                              aria-label="Tandai selesai"
                              className="w-8 h-8 rounded-xl bg-stone-800 hover:bg-stone-900 text-white flex items-center justify-center transition disabled:opacity-50"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <span className="pointer-events-none opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-150 absolute bottom-full right-0 mb-1.5 z-30 px-2.5 py-1 rounded-lg bg-[#3B2618] text-white text-[10px] font-semibold whitespace-nowrap shadow-lg">
                              Tandai pesanan selesai diambil
                            </span>
                          </div>
                        )}

                        {order.status !== 'BATAL' &&
                          order.status !== 'SELESAI' && (
                            <div className="relative group">
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
                                aria-label="Batalkan pesanan"
                                className="w-8 h-8 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 flex items-center justify-center transition disabled:opacity-50"
                              >
                                <Ban className="w-4 h-4" />
                              </button>
                              <span className="pointer-events-none opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-150 absolute bottom-full right-0 mb-1.5 z-30 px-2.5 py-1 rounded-lg bg-[#3B2618] text-white text-[10px] font-semibold whitespace-nowrap shadow-lg">
                                Batalkan pesanan ini
                              </span>
                            </div>
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
                  Daftar Menu Pre-Order
                </h3>
                <p className="text-xs text-[#8C6D53]">
                  Tambah produk baru, ubah detail menu, atau buka/tutup ketersediaan menu PO.
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
                        {prod.imageUrl &&
                        prod.imageUrl !== '/images/storefront-counter.jpg' ? (
                          <img
                            src={prod.imageUrl}
                            alt={prod.name}
                            className="w-14 h-16 rounded-xl object-cover border border-[#EADFD3] shrink-0"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-xl bg-[#FAF6F0] border border-[#EADFD3] flex items-center justify-center text-2xl shrink-0">
                            {prod.emoji}
                          </div>
                        )}
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
                  Rekap Jumlah Produksi Dapur (
                  {selectedBatchFilter === 'ALL'
                    ? 'Semua Batch'
                    : `Batch #${selectedBatchFilter}`}
                  )
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
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#5C3A21]" />
                  <h3 className="font-bold text-sm text-[#3B2618]">
                    Pengaturan Jadwal Batch Pre-Order
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const maxBatchNum = Math.max(
                      batchNumberInput,
                      activeBatchMeta.batchNumber,
                      ...batchOptions.map((b) => b.batchNumber)
                    );
                    const nextNum = maxBatchNum + 1;
                    setBatchNumberInput(nextNum);
                    setBatchNameInput((prev) =>
                      /batch\s*#?\s*\d+/i.test(prev)
                        ? prev.replace(/batch\s*#?\s*\d+/i, `Batch #${nextNum}`)
                        : `Batch #${nextNum} - ${prev.trim() || 'Pre-Order AJCUlicious'}`
                    );
                    setBatchIsOpenInput(true);
                    showToast(
                      `Siap membuat Batch #${nextNum}! Atur jadwal lalu klik Simpan Jadwal.`
                    );
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-[#5C3A21] border border-amber-300 text-[11px] font-bold transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Mulai Batch Baru</span>
                </button>
              </div>

              <form
                onSubmit={handleSaveBatchSettings}
                className="space-y-3 text-xs"
              >
                {(() => {
                  const previewEval = evaluateBatchOpenStatus(
                    {
                      isOpen: batchIsOpenInput,
                      orderOpenAt: witaDateTimeLocalToIso(batchOpenAtInput),
                      orderCloseAt: witaDateTimeLocalToIso(batchCloseAtInput),
                    },
                    adminNowMs ?? undefined
                  );
                  return (
                    <div
                      className={`p-2.5 rounded-xl border text-[11px] font-semibold flex items-center justify-between gap-2 ${
                        previewEval.effectiveIsOpen
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : 'bg-rose-50 border-rose-200 text-rose-800'
                      }`}
                    >
                      <span>Status Otomatis Saat Ini:</span>
                      <span className="font-bold">{previewEval.statusLabel}</span>
                    </div>
                  );
                })()}

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block font-semibold text-[#3B2618] mb-1">
                      Nomor Batch
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={batchNumberInput}
                      onChange={(e) => {
                        const nextVal = Math.max(
                          1,
                          Number.parseInt(e.target.value, 10) || 1
                        );
                        setBatchNumberInput(nextVal);
                        setBatchNameInput((prev) =>
                          /batch\s*#?\s*\d+/i.test(prev)
                            ? prev.replace(
                                /batch\s*#?\s*\d+/i,
                                `Batch #${nextVal}`
                              )
                            : prev
                        );
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-[#EADFD3] bg-[#FAF6F0]/50 font-bold"
                      required
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block font-semibold text-[#3B2618] mb-1">
                      Nama Batch Pre-Order
                    </label>
                    <input
                      type="text"
                      value={batchNameInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setBatchNameInput(val);
                        const detected = extractBatchNumber(val);
                        if (detected) {
                          setBatchNumberInput(detected);
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-[#EADFD3] bg-[#FAF6F0]/50"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-semibold text-[#3B2618] mb-1">
                      Mulai Buka Order (WITA)
                    </label>
                    <input
                      type="datetime-local"
                      value={batchOpenAtInput}
                      onChange={(e) => setBatchOpenAtInput(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#EADFD3] bg-[#FAF6F0]/50"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#3B2618] mb-1">
                      Batas Tutup Order (WITA)
                    </label>
                    <input
                      type="datetime-local"
                      value={batchCloseAtInput}
                      onChange={(e) => setBatchCloseAtInput(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#EADFD3] bg-[#FAF6F0]/50"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block font-semibold text-[#3B2618] mb-1">
                      Tanggal Pengambilan
                    </label>
                    <input
                      type="date"
                      value={batchPickupDateIsoInput}
                      onChange={(e) =>
                        setBatchPickupDateIsoInput(e.target.value)
                      }
                      className="w-full px-3 py-2 rounded-xl border border-[#EADFD3] bg-[#FAF6F0]/50"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#3B2618] mb-1">
                      Jam Mulai Ambil
                    </label>
                    <input
                      type="time"
                      value={batchPickupStartTimeInput}
                      onChange={(e) =>
                        setBatchPickupStartTimeInput(e.target.value)
                      }
                      className="w-full px-3 py-2 rounded-xl border border-[#EADFD3] bg-[#FAF6F0]/50"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#3B2618] mb-1">
                      Jam Selesai Ambil
                    </label>
                    <input
                      type="time"
                      value={batchPickupEndTimeInput}
                      onChange={(e) =>
                        setBatchPickupEndTimeInput(e.target.value)
                      }
                      className="w-full px-3 py-2 rounded-xl border border-[#EADFD3] bg-[#FAF6F0]/50"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-[#3B2618] mb-1">
                    Tempat / Lokasi Pengambilan
                  </label>
                  <input
                    type="text"
                    value={batchPickupLocationInput}
                    onChange={(e) =>
                      setBatchPickupLocationInput(e.target.value)
                    }
                    placeholder="Contoh: Konter Kampus / Lobi Gedung A"
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
                      Aktifkan Penerimaan Pre-Order Sesuai Jadwal
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

        {/* ================= TAB 4: PERHITUNGAN BAHAN PRODUKSI OTOMATIS ================= */}
        {activeTab === 'calculator' &&
          (() => {
            const validIngredients = calcIngredients.filter(
              (ing) => ing.needPerPcs > 0
            );
            const capacities = validIngredients.map((ing) => ({
              ...ing,
              maxPcs: Math.floor(ing.stockAvailable / ing.needPerPcs),
            }));
            const maxProduciblePcs =
              capacities.length > 0
                ? Math.min(...capacities.map((c) => c.maxPcs))
                : 0;
            const limitingIng = capacities.find(
              (c) => c.maxPcs === maxProduciblePcs
            );
            const matchedProduct = products.find(
              (p) =>
                p.name.toLowerCase() === calcSelectedProduct.toLowerCase() ||
                calcSelectedProduct
                  .toLowerCase()
                  .includes(p.name.toLowerCase())
            );
            const unitPrice = matchedProduct?.price || 25000;
            const estimatedRevenue = maxProduciblePcs * unitPrice;

            return (
              <div className="space-y-4">
                {/* Header & Pilihan Mode Kalkulator */}
                <div className="bg-white border border-[#EADFD3] rounded-2xl p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Scale className="w-4 h-4 text-[#5C3A21]" />
                      <h3 className="font-extrabold text-sm sm:text-base text-[#3B2618]">
                        Kalkulator Perhitungan Bahan &amp; Estimasi Produksi
                      </h3>
                    </div>
                    <p className="text-xs text-[#8C6D53]">
                      Input stok bahan baku (misal: 100g tepung, cokelat sekian
                      gram) untuk otomatis menentukan jumlah produk yang bisa
                      dibuat.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCalcMode('stock_to_pcs')}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                        calcMode === 'stock_to_pcs'
                          ? 'bg-[#5C3A21] text-white'
                          : 'bg-[#FAF6F0] text-[#5C3A21] border border-[#EADFD3]'
                      }`}
                    >
                      Stok Bahan &rarr; Jadi Berapa Pcs
                    </button>
                    <button
                      type="button"
                      onClick={() => setCalcMode('pcs_to_stock')}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                        calcMode === 'pcs_to_stock'
                          ? 'bg-[#5C3A21] text-white'
                          : 'bg-[#FAF6F0] text-[#5C3A21] border border-[#EADFD3]'
                      }`}
                    >
                      Target Pcs &rarr; Kebutuhan Bahan
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  {/* Kolom Kiri (7 Kolom): Input Bahan & Takaran */}
                  <div className="lg:col-span-7 bg-white border border-[#EADFD3] rounded-2xl p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#F4ECE1] pb-3">
                      <div>
                        <label className="block text-xs font-bold text-[#3B2618] mb-1">
                          Pilih Menu Produk Target:
                        </label>
                        <select
                          value={calcSelectedProduct}
                          onChange={(e) =>
                            setCalcSelectedProduct(e.target.value)
                          }
                          className="px-3.5 py-2 rounded-xl border border-[#EADFD3] bg-[#FAF6F0] text-xs font-bold text-[#3B2618] focus:outline-none focus:ring-2 focus:ring-[#5C3A21]"
                        >
                          <option value="Brownies (150g)">
                            Brownies (150g) — Rp22.000
                          </option>
                          <option value="Brownies (200g)">
                            Brownies (200g) — Rp28.000
                          </option>
                          <option value="Brownies Box">
                            Brownies Box — Rp60.000
                          </option>
                          <option value="Dubai Chewy Cookie">
                            Dubai Chewy Cookie — Rp25.000
                          </option>
                          <option value="Cookies Original">
                            Cookies Original — Rp8.000
                          </option>
                          <option value="Cookies Double Choco">
                            Cookies Double Choco — Rp11.000
                          </option>
                          <option value="Cookies Matcha">
                            Cookies Matcha — Rp11.000
                          </option>
                          <option value="Cookies Red Velvet">
                            Cookies Red Velvet — Rp13.000
                          </option>
                          <option value="Cookies Lotus Biscoff">
                            Cookies Lotus Biscoff — Rp15.000
                          </option>
                          <option value="Dessert Box">
                            Dessert Box — Rp10.000
                          </option>
                          <option value="Dimsum Original">
                            Dimsum Original — Rp21.000
                          </option>
                          <option value="Dimsum Mentai">
                            Dimsum Mentai — Rp26.000
                          </option>
                        </select>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            handleLoadRecipePreset(
                              calcSelectedProduct,
                              'simulasi_100'
                            )
                          }
                          className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-[11px] font-bold transition"
                        >
                          Contoh Simulasi (100g &rarr; 100 Pcs)
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleLoadRecipePreset(
                              calcSelectedProduct,
                              'standar_dapur'
                            )
                          }
                          className="px-2.5 py-1.5 rounded-lg bg-[#FAF6F0] hover:bg-[#F2E8DC] text-[#5C3A21] border border-[#EADFD3] text-[11px] font-bold transition"
                        >
                          Resep Dapur Standar
                        </button>
                      </div>
                    </div>

                    {calcMode === 'pcs_to_stock' && (
                      <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-3">
                        <span className="text-xs font-bold text-amber-950">
                          Target Jumlah Produksi ({calcSelectedProduct}):
                        </span>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={1}
                            value={calcTargetPcs}
                            onChange={(e) =>
                              setCalcTargetPcs(
                                Math.max(1, Number(e.target.value) || 1)
                              )
                            }
                            className="w-24 px-3 py-1.5 rounded-xl border border-amber-300 bg-white font-extrabold text-xs text-center text-[#3B2618]"
                          />
                          <span className="text-xs font-bold text-amber-900">
                            pcs
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Daftar Input Bahan Baku */}
                    <div className="space-y-2.5">
                      <div className="grid grid-cols-12 gap-2 text-[11px] font-bold text-[#8C6D53] px-1">
                        <div className="col-span-5">Nama Bahan Baku</div>
                        <div className="col-span-3 text-center">
                          Stok Tersedia
                        </div>
                        <div className="col-span-3 text-center">
                          Takaran / 1 Pcs
                        </div>
                        <div className="col-span-1"></div>
                      </div>

                      {calcIngredients.map((ing) => (
                        <div
                          key={ing.id}
                          className="grid grid-cols-12 gap-2 items-center bg-[#FAF6F0] p-2.5 rounded-xl border border-[#EADFD3] text-xs"
                        >
                          <div className="col-span-5 font-bold text-[#3B2618] truncate">
                            {ing.name}
                          </div>

                          <div className="col-span-3 flex items-center gap-1">
                            <input
                              type="number"
                              min={0}
                              step="any"
                              value={ing.stockAvailable}
                              onChange={(e) => {
                                const val = Math.max(
                                  0,
                                  Number(e.target.value) || 0
                                );
                                setCalcIngredients((prev) =>
                                  prev.map((item) =>
                                    item.id === ing.id
                                      ? { ...item, stockAvailable: val }
                                      : item
                                  )
                                );
                              }}
                              className="w-full px-2 py-1.5 rounded-lg border border-[#EADFD3] bg-white font-bold text-center text-[#3B2618]"
                            />
                            <span className="text-[10px] text-[#8C6D53] font-semibold">
                              {ing.unit}
                            </span>
                          </div>

                          <div className="col-span-3 flex items-center gap-1">
                            <input
                              type="number"
                              min={0.1}
                              step="any"
                              value={ing.needPerPcs}
                              onChange={(e) => {
                                const val = Math.max(
                                  0.01,
                                  Number(e.target.value) || 0.1
                                );
                                setCalcIngredients((prev) =>
                                  prev.map((item) =>
                                    item.id === ing.id
                                      ? { ...item, needPerPcs: val }
                                      : item
                                  )
                                );
                              }}
                              className="w-full px-2 py-1.5 rounded-lg border border-[#EADFD3] bg-white font-semibold text-center text-[#5C3A21]"
                            />
                            <span className="text-[10px] text-[#8C6D53]">
                              {ing.unit}
                            </span>
                          </div>

                          <div className="col-span-1 flex justify-end">
                            <button
                              type="button"
                              onClick={() =>
                                setCalcIngredients((prev) =>
                                  prev.filter((item) => item.id !== ing.id)
                                )
                              }
                              className="p-1 text-stone-400 hover:text-rose-600"
                              title="Hapus bahan"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Tambah Bahan Baru ke Kalkulator */}
                    <div className="pt-2 border-t border-[#F4ECE1]">
                      <p className="text-[11px] font-bold text-[#7D5E46] mb-2">
                        + Tambah Bahan Lain ke Perhitungan:
                      </p>
                      <div className="grid grid-cols-12 gap-2 items-center text-xs">
                        <input
                          type="text"
                          value={newIngName}
                          onChange={(e) => setNewIngName(e.target.value)}
                          placeholder="Nama bahan (misal: Kacang Almond)"
                          className="col-span-5 px-3 py-2 rounded-xl border border-[#EADFD3] bg-[#FAF6F0]/50"
                        />
                        <input
                          type="number"
                          min={0}
                          value={newIngStock}
                          onChange={(e) =>
                            setNewIngStock(Number(e.target.value) || 0)
                          }
                          placeholder="Stok (gr)"
                          className="col-span-2 px-2 py-2 rounded-xl border border-[#EADFD3] bg-[#FAF6F0]/50 text-center"
                        />
                        <input
                          type="number"
                          min={0.1}
                          step="any"
                          value={newIngNeed}
                          onChange={(e) =>
                            setNewIngNeed(Number(e.target.value) || 1)
                          }
                          placeholder="Per pcs"
                          className="col-span-2 px-2 py-2 rounded-xl border border-[#EADFD3] bg-[#FAF6F0]/50 text-center"
                        />
                        <select
                          value={newIngUnit}
                          onChange={(e) => setNewIngUnit(e.target.value)}
                          className="col-span-1 px-1 py-2 rounded-xl border border-[#EADFD3] bg-[#FAF6F0]/50 text-center"
                        >
                          <option value="gr">gr</option>
                          <option value="ml">ml</option>
                          <option value="btr">btr</option>
                          <option value="lbr">lbr</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            if (!newIngName.trim()) return;
                            setCalcIngredients((prev) => [
                              ...prev,
                              {
                                id: `ing-${Date.now()}`,
                                name: newIngName.trim(),
                                unit: newIngUnit,
                                stockAvailable: newIngStock,
                                needPerPcs: Math.max(0.01, newIngNeed),
                              },
                            ]);
                            setNewIngName('');
                          }}
                          className="col-span-2 py-2 px-3 rounded-xl bg-[#5C3A21] text-white font-bold hover:bg-[#462B18] transition"
                        >
                          Tambah
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Kolom Kanan (5 Kolom): Hasil Perhitungan Otomatis */}
                  <div className="lg:col-span-5 bg-white border border-[#EADFD3] rounded-2xl p-5 flex flex-col justify-between space-y-4">
                    <div className="space-y-4">
                      <div className="p-5 rounded-2xl bg-gradient-to-br from-[#5C3A21] to-[#3B2618] text-white text-center space-y-1.5 shadow-md">
                        <span className="text-[11px] uppercase tracking-wider font-semibold text-amber-200">
                          {calcMode === 'stock_to_pcs'
                            ? 'Hasil Estimasi Kapasitas Produksi Otomatis'
                            : 'Target Produksi yang Direncanakan'}
                        </span>
                        <p className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                          {calcMode === 'stock_to_pcs'
                            ? maxProduciblePcs
                            : calcTargetPcs}{' '}
                          <span className="text-lg font-bold text-amber-300">
                            {calcSelectedProduct.toLowerCase().includes('brownies')
                              ? 'Brownies'
                              : calcSelectedProduct.toLowerCase().includes('cookies')
                              ? 'Cookies'
                              : calcSelectedProduct.toLowerCase().includes('dimsum')
                              ? 'Porsi Dimsum'
                              : 'Pcs'}
                          </span>
                        </p>
                        <p className="text-xs text-stone-200 font-medium">
                          Menu: <strong>{calcSelectedProduct}</strong>
                        </p>
                        <div className="pt-2 mt-2 border-t border-white/15 flex items-center justify-between text-xs">
                          <span className="text-amber-200">
                            Potensi Nilai Penjualan:
                          </span>
                          <span className="font-extrabold text-sm text-emerald-300">
                            {formatRupiah(
                              (calcMode === 'stock_to_pcs'
                                ? maxProduciblePcs
                                : calcTargetPcs) * unitPrice
                            )}
                          </span>
                        </div>
                      </div>

                      {calcMode === 'stock_to_pcs' && limitingIng && (
                        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950">
                          <strong>Penentu Kapasitas (Pembatas):</strong> Stok{' '}
                          <strong>{limitingIng.name}</strong> ({limitingIng.stockAvailable}
                          {limitingIng.unit}) menghasilkan maksimal{' '}
                          <strong>{limitingIng.maxPcs} pcs</strong>.
                        </div>
                      )}

                      {/* Tabel Rincian Pemakaian & Sisa per Bahan */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold text-[#3B2618]">
                          {calcMode === 'stock_to_pcs'
                            ? 'Rincian Kapasitas & Sisa Bahan Baku:'
                            : `Total Kebutuhan Bahan untuk ${calcTargetPcs} Pcs:`}
                        </h4>

                        <div className="divide-y divide-[#F4ECE1] border border-[#EADFD3] rounded-xl bg-[#FAF6F0] px-3.5 text-xs">
                          {capacities.map((c) => {
                            const usedAmount =
                              (calcMode === 'stock_to_pcs'
                                ? maxProduciblePcs
                                : calcTargetPcs) * c.needPerPcs;
                            const remainingAmount =
                              c.stockAvailable - usedAmount;
                            const isShort = remainingAmount < 0;

                            return (
                              <div
                                key={c.id}
                                className="py-2.5 flex items-center justify-between gap-2"
                              >
                                <div>
                                  <p className="font-bold text-[#3B2618]">
                                    {c.name}
                                  </p>
                                  <p className="text-[11px] text-[#8C6D53]">
                                    {calcMode === 'stock_to_pcs'
                                      ? `Cukup hingga ${c.maxPcs} pcs (Pakai: ${Math.round(
                                          usedAmount * 10
                                        ) / 10}${c.unit})`
                                      : `Butuh: ${Math.round(usedAmount * 10) / 10}${
                                          c.unit
                                        } (Stok: ${c.stockAvailable}${c.unit})`}
                                  </p>
                                </div>

                                <span
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 ${
                                    isShort
                                      ? 'bg-rose-100 text-rose-700 border border-rose-200'
                                      : remainingAmount === 0
                                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  }`}
                                >
                                  {isShort
                                    ? `Kurang ${Math.abs(
                                        Math.round(remainingAmount * 10) / 10
                                      )}${c.unit}`
                                    : `Sisa ${
                                        Math.round(remainingAmount * 10) / 10
                                      }${c.unit}`}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-[#FAF6F0] border border-[#EADFD3] text-[11px] text-[#7D5E46]">
                      Anda dapat menyesuaikan angka <strong>Stok Tersedia</strong>{' '}
                      maupun <strong>Takaran / 1 Pcs</strong> di sebelah kiri
                      secara bebas sesuai takaran resep dapur AJCUlicious.
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
      </main>

      {/* ================= MODAL INFO DATA PELANGGAN & LIHAT BUKTI TF / QRIS ================= */}
      {selectedOrderInfo && (
        <div className="fixed inset-0 !m-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#EADFD3] rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#EADFD3] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-[#FAF6F0] text-[#5C3A21] border border-[#EADFD3]">
                    #{selectedOrderInfo.invoice_code}
                  </span>
                  {getStatusBadge(selectedOrderInfo.status)}
                </div>
                <h3 className="font-extrabold text-base text-[#3B2618] mt-1">
                  Data Pelanggan &amp; Bukti Pembayaran
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setSelectedOrderInfo(null)}
                className="p-1.5 rounded-full hover:bg-[#FAF6F0]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sub-Tab di dalam Modal: Data Pelanggan vs Bukti TF */}
            <div className="grid grid-cols-2 gap-2 bg-[#FAF6F0] p-1 rounded-xl border border-[#EADFD3]">
              <button
                type="button"
                onClick={() => setProofModalTab('info')}
                className={`py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  proofModalTab === 'info'
                    ? 'bg-[#5C3A21] text-white'
                    : 'text-[#5C3A21] hover:bg-white/60'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Detail Data Pelanggan</span>
              </button>
              <button
                type="button"
                onClick={() => setProofModalTab('proof')}
                className={`py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  proofModalTab === 'proof'
                    ? 'bg-[#5C3A21] text-white'
                    : 'text-[#5C3A21] hover:bg-white/60'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>
                  Lihat Bukti TF / QRIS{' '}
                  {selectedOrderInfo.payment_proof_url ? '✓' : ''}
                </span>
              </button>
            </div>

            {proofModalTab === 'info' ? (
              <div className="space-y-3 text-xs">
                <div className="p-4 rounded-2xl bg-[#FAF6F0] border border-[#EADFD3] space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[#8C6D53]">Nama Pemesan:</span>
                    <span className="font-extrabold text-sm text-[#3B2618]">
                      {selectedOrderInfo.customer_name}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-[#8C6D53]">Nomor WhatsApp:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-sm text-emerald-800">
                        {selectedOrderInfo.customer_phone || '-'}
                      </span>
                      {selectedOrderInfo.customer_phone &&
                        selectedOrderInfo.customer_phone !== '-' && (
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(
                                selectedOrderInfo.customer_phone || ''
                              );
                              showToast('Nomor WA pelanggan disalin!');
                            }}
                            className="p-1 rounded bg-white border border-[#EADFD3] text-[#5C3A21]"
                            title="Salin Nomor WA"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        )}
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-[#8C6D53]">Metode Pembayaran:</span>
                    <span className="font-bold text-[#3B2618]">
                      {selectedOrderInfo.payment_method === 'TRANSFER'
                        ? `Transfer Bank (${
                            selectedOrderInfo.bank_info || 'Rekening AJC'
                          })`
                        : selectedOrderInfo.payment_method}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-[#8C6D53]">Status Bayar:</span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        selectedOrderInfo.payment_status === 'SUDAH_BAYAR'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {selectedOrderInfo.payment_status === 'SUDAH_BAYAR'
                        ? 'SUDAH BAYAR (LUNAS)'
                        : 'BELUM BAYAR'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-[#8C6D53]">Waktu Pemesanan:</span>
                    <span className="font-semibold text-[#3B2618]">
                      {new Date(selectedOrderInfo.created_at).toLocaleString(
                        'id-ID'
                      )}
                    </span>
                  </div>

                  {selectedOrderInfo.customer_notes && (
                    <div className="pt-2 border-t border-[#EADFD3]">
                      <span className="text-[#8C6D53] block mb-0.5">
                        Fakultas / Catatan Pelanggan:
                      </span>
                      <p className="font-semibold text-[#3B2618]">
                        {selectedOrderInfo.customer_notes}
                      </p>
                    </div>
                  )}
                </div>

                {/* Daftar Item Pesanan */}
                <div className="p-4 rounded-2xl border border-[#EADFD3] bg-white space-y-2">
                  <p className="font-bold text-[#3B2618]">Rincian Menu:</p>
                  {(selectedOrderInfo.order_items ?? []).map((it) => (
                    <div
                      key={it.id}
                      className="flex justify-between items-center py-1 border-b border-[#F4ECE1] last:border-0"
                    >
                      <span>
                        <strong>{it.quantity}x</strong> {it.product_name_snapshot}
                      </span>
                      <span className="font-semibold">
                        {formatRupiah(it.subtotal)}
                      </span>
                    </div>
                  ))}
                  <div className="pt-2 flex justify-between items-center text-sm font-extrabold text-[#3B2618]">
                    <span>Total Tagihan</span>
                    <span className="text-[#5C3A21]">
                      {formatRupiah(selectedOrderInfo.total_price)}
                    </span>
                  </div>
                </div>

                {/* Tombol Kirim WA Langsung via Fonnte */}
                {selectedOrderInfo.customer_phone &&
                  selectedOrderInfo.customer_phone !== '-' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={sendingWaId === selectedOrderInfo.id}
                        onClick={() =>
                          handleSendDirectFonnteWa(selectedOrderInfo)
                        }
                        className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-center transition disabled:opacity-60"
                      >
                        {sendingWaId === selectedOrderInfo.id
                          ? 'Mengirim WA...'
                          : 'Kirim WA Pesanan Siap (Fonnte)'}
                      </button>

                      <button
                        type="button"
                        onClick={() => setProofModalTab('proof')}
                        className="py-2.5 px-3 rounded-xl border border-[#EADFD3] bg-[#FAF6F0] hover:bg-[#F2E8DC] text-[#5C3A21] font-bold text-center"
                      >
                        Lihat Bukti Pembayaran
                      </button>
                    </div>
                  )}
              </div>
            ) : (
              /* TAB BUKTI TF / QRIS */
              <div className="space-y-3 text-xs">
                {selectedOrderInfo.payment_proof_url ? (
                  <div className="space-y-3">
                    <div className="p-2 rounded-2xl border border-[#EADFD3] bg-[#FAF6F0] flex items-center justify-center">
                      <img
                        src={selectedOrderInfo.payment_proof_url}
                        alt={`Bukti Bayar #${selectedOrderInfo.invoice_code}`}
                        className="max-h-80 w-auto object-contain rounded-xl"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <a
                        href={selectedOrderInfo.payment_proof_url}
                        download={`Bukti_${selectedOrderInfo.invoice_code}.jpg`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-2 rounded-xl border border-[#EADFD3] bg-[#FAF6F0] text-[#5C3A21] font-bold hover:bg-[#F2E8DC]"
                      >
                        Buka Ukuran Penuh
                      </a>

                      {selectedOrderInfo.payment_status !== 'SUDAH_BAYAR' && (
                        <button
                          type="button"
                          onClick={async () => {
                            await handlePaymentStatusChange(
                              selectedOrderInfo.id,
                              selectedOrderInfo.invoice_code,
                              'SUDAH_BAYAR'
                            );
                            setSelectedOrderInfo((prev) =>
                              prev
                                ? { ...prev, payment_status: 'SUDAH_BAYAR' }
                                : null
                            );
                          }}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5"
                        >
                          <Check className="w-4 h-4" />
                          <span>Verifikasi &amp; Tandai Sudah Bayar</span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="py-10 px-4 text-center rounded-2xl bg-[#FAF6F0] border border-[#EADFD3] space-y-2">
                    <AlertCircle className="w-8 h-8 text-[#8C6D53] mx-auto" />
                    <p className="font-bold text-[#3B2618]">
                      {selectedOrderInfo.payment_method === 'COD'
                        ? 'Pesanan ini menggunakan metode COD (Bayar Saat Ambil)'
                        : 'Pelanggan belum mengunggah foto bukti transfer/QRIS'}
                    </p>
                    <p className="text-[11px] text-[#8C6D53]">
                      Metode: <strong>{selectedOrderInfo.payment_method}</strong>{' '}
                      &bull; Total:{' '}
                      <strong>{formatRupiah(selectedOrderInfo.total_price)}</strong>
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Tambah / Edit Produk & Komposisi Bahan */}
      {showProductModal && (
        <div className="fixed inset-0 !m-0 z-[60] bg-black/55 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#EADFD3] rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base text-[#3B2618]">
                {editingProductId ? 'Edit Detail Menu' : 'Tambah Menu Baru'}
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
