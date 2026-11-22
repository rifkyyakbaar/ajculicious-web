'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Navbar from './Navbar';
import BannerOrderFlow from './BannerOrderFlow';
import HeroCounter from './HeroCounter';
import ProductCatalog from './ProductCatalog';
import TestimonialsSection from './TestimonialsSection';
import CartDrawer from './CartDrawer';
import BuyerOrderTrackerModal from './BuyerOrderTrackerModal';
import AdminLoginModal from './AdminLoginModal';
import AdminDashboardView from './AdminDashboardView';
import Footer from './Footer';
import OnboardingTour, { TourStep } from './OnboardingTour';
import SwarmRebuildEngine from './SwarmRebuildEngine';

import {
  Product,
  CartItem,
  TeamMember,
  OrderRecord,
  ReviewRecord,
  ExpenseRecord,
  BatchPOConfig,
  CategorySlug,
  OrderStatus,
} from '../types/ajculicious';
import { AdminUserProfile } from '../types/database';

import {
  TEAM_MEMBERS,
  INITIAL_BATCH_CONFIG,
} from '../data/initial_data';
import { submitCustomerReview } from '../actions/order-actions';
import { getStorefrontInitialData } from '../actions/catalog-actions';
import { useBodyScrollLock } from '../utils/useBodyScrollLock';
import {
  evaluateBatchOpenStatus,
  formatWitaDateTimeDisplay,
} from '../utils/batchSchedule';

interface AjculiciousInteractiveStoreProps {
  initialProducts?: Product[];
  initialReviews?: ReviewRecord[];
  initialBatchConfig?: BatchPOConfig;
  initialCategory?: CategorySlug;
  openTrackerInitially?: boolean;
}

export default function AjculiciousInteractiveStore({
  initialProducts = [],
  initialReviews = [],
  initialBatchConfig = INITIAL_BATCH_CONFIG,
  initialCategory = 'all',
  openTrackerInitially = false,
}: AjculiciousInteractiveStoreProps = {}) {
  const [isMounted, setIsMounted] = useState<boolean>(false);

  // App View & Auth State
  const [currentView, setCurrentView] = useState<'store' | 'admin'>('store');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(false);
  const [adminProfile, setAdminProfile] = useState<AdminUserProfile | null>(null);

  // Seluruh data (products, reviews, batchConfig) berasal 100% dinamis dari Database Supabase
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [reviews, setReviews] = useState<ReviewRecord[]>(initialReviews);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [batchConfig, setBatchConfig] = useState<BatchPOConfig>(initialBatchConfig);

  // UI Interactive States
  const [activeTeamMember, setActiveTeamMember] = useState<TeamMember>(TEAM_MEMBERS[2]);
  const [activeCategory, setActiveCategory] = useState<CategorySlug>(initialCategory);
  const [tourStep, setTourStep] = useState<TourStep>(null);

  // Modals
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isBuyerTrackerOpen, setIsBuyerTrackerOpen] = useState(openTrackerInitially);
  const [buyerTrackerInvoiceCode, setBuyerTrackerInvoiceCode] = useState('');
  const [isAdminLoginModalOpen, setIsAdminLoginModalOpen] = useState(false);
  const [isClosedPOModalOpen, setIsClosedPOModalOpen] = useState(false);
  const [addedToastProductId, setAddedToastProductId] = useState<string | null>(null);
  const [isSwarmRebuilding, setIsSwarmRebuilding] = useState(false);
  const [swarmTriggerCount, setSwarmTriggerCount] = useState(0);
  const [nowTimestamp, setNowTimestamp] = useState<number | null>(null);

  useBodyScrollLock(isClosedPOModalOpen);

  // Perbarui jam lokal tiap 15 detik agar status buka/tutup PO berubah otomatis saat deadline lewat
  useEffect(() => {
    const initTimer = setTimeout(() => {
      setNowTimestamp(Date.now());
    }, 0);
    const timer = setInterval(() => {
      setNowTimestamp(Date.now());
    }, 15000);
    return () => {
      clearTimeout(initTimer);
      clearInterval(timer);
    };
  }, []);

  const scheduleEvaluation = useMemo(() => {
    if (nowTimestamp === null) {
      return {
        effectiveIsOpen: batchConfig.isOpen,
        reason: batchConfig.isOpen ? ('OPEN' as const) : ('MANUALLY_CLOSED' as const),
        statusLabel: batchConfig.isOpen ? 'Pre-Order Dibuka' : 'Pre-Order Ditutup',
      };
    }
    return evaluateBatchOpenStatus(
      {
        isOpen: batchConfig.manualIsOpen ?? batchConfig.isOpen,
        orderOpenAt: batchConfig.orderOpenAt,
        orderCloseAt: batchConfig.orderCloseAt,
      },
      nowTimestamp
    );
  }, [batchConfig, nowTimestamp]);

  const effectiveBatchConfig = useMemo<BatchPOConfig>(
    () => ({
      ...batchConfig,
      isOpen: scheduleEvaluation.effectiveIsOpen,
    }),
    [batchConfig, scheduleEvaluation.effectiveIsOpen]
  );

  const handleTriggerSwarmRebuild = () => {
    setIsSwarmRebuilding(true);
    setSwarmTriggerCount((prev) => prev + 1);
    setTimeout(() => setIsSwarmRebuilding(false), 1400);
  };

  // Hydrate from localStorage on client-side mount
  useEffect(() => {
    setIsMounted(true);
    try {
      const storedAuth = localStorage.getItem('ajc_admin_auth');
      if (storedAuth === 'true') {
        setIsAdminLoggedIn(true);
      }
      const storedProfile = localStorage.getItem('ajc_admin_profile');
      if (storedProfile) {
        setAdminProfile(JSON.parse(storedProfile));
      }

      const storedCart = localStorage.getItem('ajc_cart');
      if (storedCart) setCart(JSON.parse(storedCart));
    } catch {
      // Fallback if localStorage error
    }

    // Selalu sinkronkan data terbaru dari Database Supabase saat komponen dimuat
    getStorefrontInitialData().then((fresh) => {
      if (fresh.products.length > 0) setProducts(fresh.products);
      setReviews(fresh.reviews);
      setBatchConfig(fresh.batchConfig);
    });
  }, []);

  const handleCloseOrFinishTour = () => {
    setTourStep(null);
  };

  // Sync state changes to localStorage only after mounted
  useEffect(() => {
    if (!isMounted) return;
    try {
      localStorage.setItem('ajc_cart', JSON.stringify(cart));
    } catch {}
  }, [cart, isMounted]);

  useEffect(() => {
    if (!isMounted) return;
    try {
      localStorage.setItem('ajc_orders', JSON.stringify(orders));
    } catch {}
  }, [orders, isMounted]);

  useEffect(() => {
    if (!isMounted) return;
    try {
      localStorage.setItem('ajc_products', JSON.stringify(products));
    } catch {}
  }, [products, isMounted]);

  useEffect(() => {
    if (!isMounted) return;
    try {
      localStorage.setItem('ajc_reviews', JSON.stringify(reviews));
    } catch {}
  }, [reviews, isMounted]);

  useEffect(() => {
    if (!isMounted) return;
    try {
      localStorage.setItem('ajc_expenses', JSON.stringify(expenses));
    } catch {}
  }, [expenses, isMounted]);

  useEffect(() => {
    if (!isMounted) return;
    try {
      localStorage.setItem('ajc_batch', JSON.stringify(batchConfig));
    } catch {}
  }, [batchConfig, isMounted]);

  // Cart Calculations
  const totalCartItems = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  const totalCartPrice = useMemo(
    () => cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [cart]
  );

  // Cart Handlers (Sistem Pre-Order: Ditolak + muncul popup jika PO sedang ditutup / di luar jadwal)
  const handleAddToCart = (product: Product) => {
    if (!effectiveBatchConfig.isOpen) {
      setIsClosedPOModalOpen(true);
      return;
    }
    if (!product.isActive) return;

    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => item.product.id === product.id);
      if (existingIndex > -1) {
        const currentQty = prev[existingIndex].quantity;
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          product,
          quantity: currentQty + 1,
        };
        return updated;
      }
      return [...prev, { product, quantity: 1 }];
    });

    setAddedToastProductId(product.id);
    setTimeout(() => setAddedToastProductId(null), 1500);
  };

  const handleUpdateCartQuantity = (productId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const handleRemoveCartItem = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  // Order Placement Handler
  const handleOrderCreated = (newOrder: OrderRecord) => {
    setOrders((prev) => [newOrder, ...prev]);
  };

  // Upload Transfer Proof Handler
  const handleUploadProof = (orderId: string, proofUrl: string) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: 'MENUNGGU_VERIFIKASI',
              transferProofUrl: proofUrl,
            }
          : o
      )
    );
  };

  // Review Submission Handler (Langsung tersimpan ke Tabel `reviews` di Database Supabase)
  const handleSubmitReview = async (
    newRev: Omit<ReviewRecord, 'id' | 'isApproved'>
  ): Promise<{ success: boolean; error?: string }> => {
    const res = await submitCustomerReview({
      invoiceCode: newRev.invoiceCode,
      customerName: newRev.customerName,
      rating: newRev.rating,
      menuOrdered: newRev.menuOrdered,
      comment: newRev.comment,
    });
    if (res.success && res.data) {
      setReviews((prev) => [res.data!, ...prev]);
      return { success: true };
    }
    return {
      success: false,
      error: res.error || 'Gagal mengirim ulasan.',
    };
  };

  // Admin Order Status Update
  const handleUpdateOrderStatus = (orderId: string, nextStatus: OrderStatus) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
    );
  };

  // Admin Auth Handlers
  const handleAdminLoginSuccess = (profile?: AdminUserProfile) => {
    setIsAdminLoggedIn(true);
    if (profile) setAdminProfile(profile);
    setCurrentView('admin');
    try {
      localStorage.setItem('ajc_admin_auth', 'true');
      if (profile) {
        localStorage.setItem('ajc_admin_profile', JSON.stringify(profile));
      }
    } catch {}
  };

  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false);
    setAdminProfile(null);
    setCurrentView('store');
    try {
      localStorage.removeItem('ajc_admin_auth');
      localStorage.removeItem('ajc_admin_profile');
    } catch {}
  };

  // Smooth scroll to catalog
  const handleScrollToMenu = () => {
    const el = document.getElementById('katalog-menu');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Filter category and smooth scroll
  const handleFilterCategory = (category: CategorySlug) => {
    setActiveCategory(category);
    handleScrollToMenu();
  };

  // RENDER ADMIN DASHBOARD VIEW IF ACTIVE
  if (currentView === 'admin' && isAdminLoggedIn) {
    return (
      <AdminDashboardView
        adminProfile={adminProfile}
        onBackToStore={() => setCurrentView('store')}
        onLogout={handleAdminLogout}
        products={products}
        onUpdateProducts={setProducts}
        orders={orders}
        onUpdateOrderStatus={handleUpdateOrderStatus}
        expenses={expenses}
        onAddExpense={(newExp) =>
          setExpenses((prev) => [{ ...newExp, id: `exp-${Date.now()}` }, ...prev])
        }
        onDeleteExpense={(id) =>
          setExpenses((prev) => prev.filter((e) => e.id !== id))
        }
        batchConfig={batchConfig}
        onUpdateBatchConfig={setBatchConfig}
      />
    );
  }

  // RENDER BUYER STOREFRONT
  return (
    <div
      data-swarm-preload={!openTrackerInitially ? 'true' : undefined}
      className="min-h-screen w-full min-w-0 bg-[#FAF6F0] text-[#3B2618] flex flex-col font-sans selection:bg-[#F2E8DC] selection:text-[#5C3A21]"
      suppressHydrationWarning
    >
      <SwarmRebuildEngine
        triggerKey={swarmTriggerCount}
        onInitialBuildComplete={() => {
          if (!openTrackerInitially) {
            if (!effectiveBatchConfig.isOpen) {
              setIsClosedPOModalOpen(true);
            } else {
              setTourStep('welcome');
            }
          }
        }}
      />

      {/* 3.A. Sticky Top Navbar */}
      <Navbar
        onOpenTour={() => setTourStep('welcome')}
        onOpenOrderTracker={() => {
          setBuyerTrackerInvoiceCode('');
          setIsBuyerTrackerOpen(true);
        }}
        cartItemCount={totalCartItems}
        cartTotalPrice={totalCartPrice}
        onOpenCart={() => setIsCartOpen(true)}
        isTourHighlighted={tourStep === 4}
        onTriggerSwarm={handleTriggerSwarmRebuild}
      />

      {/* Main Body Content */}
      <main className="flex-1 w-full min-w-0 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex flex-col gap-6">
        {/* 3.B. Bar Info Batch PO Aktif */}
        <BannerOrderFlow
          batchConfig={effectiveBatchConfig}
          isTourHighlighted={tourStep === 1}
        />

        {/* 3.C. Hero Interactive Storefront Counter */}
        <HeroCounter
          teamMembers={TEAM_MEMBERS}
          activeMember={activeTeamMember}
          onSelectMember={(member) => setActiveTeamMember(member)}
          products={products}
          onAddToCart={handleAddToCart}
          onFilterCategory={handleFilterCategory}
          onOpenOrderTracker={() => {
            setBuyerTrackerInvoiceCode('');
            setIsBuyerTrackerOpen(true);
          }}
          addedToastProduct={addedToastProductId}
          isTourHighlighted={tourStep === 2}
        />

        {/* 3.D. Katalog Menu AJCUlicious */}
        <ProductCatalog
          products={products}
          activeCategory={activeCategory}
          onSelectCategory={(cat) => setActiveCategory(cat)}
          cart={cart}
          onAddToCart={handleAddToCart}
          onUpdateQuantity={handleUpdateCartQuantity}
          isOrderOpen={effectiveBatchConfig.isOpen}
          onBlockedByClosedPO={() => setIsClosedPOModalOpen(true)}
          isTourHighlighted={tourStep === 3}
        />

        {/* 3.E. Section Testimoni & Social Proof Pelanggan (100% Dinamis dari Database) */}
        <TestimonialsSection
          reviews={reviews}
          products={products}
          onReviewsUpdated={(freshReviews) => setReviews(freshReviews)}
        />
      </main>

      {/* Footer */}
      <Footer
        onOpenAdminLogin={() => {
          if (isAdminLoggedIn) {
            setCurrentView('admin');
          } else {
            setIsAdminLoginModalOpen(true);
          }
        }}
      />

      {/* Interactive Onboarding Step-by-Step Tour */}
      <OnboardingTour
        currentStep={tourStep}
        onChangeStep={(step) => setTourStep(step)}
        onFinishOrSkip={handleCloseOrFinishTour}
      />

      {/* 4.1. Drawer / Modal Keranjang & Checkout Web */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onClearCart={handleClearCart}
        batchConfig={effectiveBatchConfig}
        onOrderCreated={handleOrderCreated}
        onBrowseMenu={handleScrollToMenu}
        onOpenOrderTrackerWithCode={(code) => {
          setBuyerTrackerInvoiceCode(code);
          setIsBuyerTrackerOpen(true);
        }}
        onBlockedByClosedPO={() => setIsClosedPOModalOpen(true)}
      />

      {/* 4.2. Modal "Lacak Kode Pesanan Saya" (Khusus Pembeli, Single Order Search) */}
      <BuyerOrderTrackerModal
        isOpen={isBuyerTrackerOpen}
        onClose={() => setIsBuyerTrackerOpen(false)}
        orders={orders}
        reviews={reviews}
        onUploadProof={handleUploadProof}
        onSubmitReview={handleSubmitReview}
        initialInvoiceCode={buyerTrackerInvoiceCode}
        batchConfig={effectiveBatchConfig}
      />

      {/* 4.3. Modal Login Admin (Otorisasi Terproteksi) */}
      <AdminLoginModal
        isOpen={isAdminLoginModalOpen}
        onClose={() => setIsAdminLoginModalOpen(false)}
        onLoginSuccess={handleAdminLoginSuccess}
      />

      {/* 4.4. Popup Info Pre-Order Sedang Ditutup / Di Luar Jadwal */}
      {isClosedPOModalOpen && (
        <div
          onClick={() => setIsClosedPOModalOpen(false)}
          className="fixed inset-0 !m-0 z-[60] bg-black/55 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-[#EADFD3] rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
          >
            <div className="space-y-1.5">
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold">
                {scheduleEvaluation.reason === 'NOT_YET_OPEN'
                  ? 'Belum Dibuka'
                  : scheduleEvaluation.reason === 'EXPIRED'
                  ? 'Batas Order Berakhir'
                  : 'Pre-Order Ditutup'}
              </span>
              <h3 className="font-extrabold text-base text-[#3B2618]">
                {scheduleEvaluation.reason === 'NOT_YET_OPEN'
                  ? 'Jadwal Pre-Order Belum Dimulai'
                  : scheduleEvaluation.reason === 'EXPIRED'
                  ? 'Waktu Pre-Order Sudah Berakhir'
                  : 'Pemesanan Belum Dibuka Saat Ini'}
              </h3>
              <p className="text-xs text-[#6E523D] leading-relaxed">
                {scheduleEvaluation.reason === 'NOT_YET_OPEN' &&
                effectiveBatchConfig.orderOpenAt ? (
                  <>
                    Pemesanan untuk{' '}
                    <strong>
                      {effectiveBatchConfig.batchName.replace(/\s*\(Aktif\)/i, '')}
                    </strong>{' '}
                    akan dibuka otomatis pada{' '}
                    <strong>
                      {formatWitaDateTimeDisplay(effectiveBatchConfig.orderOpenAt)}
                    </strong>
                    .
                  </>
                ) : scheduleEvaluation.reason === 'EXPIRED' ? (
                  <>
                    Batas waktu pemesanan untuk{' '}
                    <strong>
                      {effectiveBatchConfig.batchName.replace(/\s*\(Aktif\)/i, '')}
                    </strong>{' '}
                    telah berakhir pada{' '}
                    <strong>{effectiveBatchConfig.orderDeadline}</strong>.
                  </>
                ) : (
                  <>
                    Maaf, penerimaan pesanan baru untuk{' '}
                    <strong>
                      {effectiveBatchConfig.batchName.replace(/\s*\(Aktif\)/i, '')}
                    </strong>{' '}
                    sedang ditutup sementara oleh admin.
                  </>
                )}
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-[#FAF6F0] border border-[#EADFD3] text-[11px] text-[#5C3A21] space-y-1">
              <p>
                Jadwal Pengambilan:{' '}
                <strong className="text-[#3B2618]">
                  {effectiveBatchConfig.readyPickupDate} (
                  {effectiveBatchConfig.readyPickupTime})
                </strong>
              </p>
              <p>
                Lokasi Ambil:{' '}
                <strong className="text-[#3B2618]">
                  {effectiveBatchConfig.pickupLocations?.[0] ||
                    'Konter Kampus AJCUlicious'}
                </strong>
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsClosedPOModalOpen(false);
                  setBuyerTrackerInvoiceCode('');
                  setIsBuyerTrackerOpen(true);
                }}
                className="flex-1 py-2.5 px-3 rounded-xl border border-[#EADFD3] bg-white hover:bg-[#FAF6F0] text-[#5C3A21] font-bold text-xs transition"
              >
                Cek Pesanan
              </button>
              <button
                type="button"
                onClick={() => setIsClosedPOModalOpen(false)}
                className="flex-1 py-2.5 px-3 rounded-xl bg-[#5C3A21] hover:bg-[#462B18] text-white font-bold text-xs transition"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
