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
  const [tourStep, setTourStep] = useState<TourStep>(
    openTrackerInitially ? null : 'welcome'
  );

  // Modals
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isBuyerTrackerOpen, setIsBuyerTrackerOpen] = useState(openTrackerInitially);
  const [buyerTrackerInvoiceCode, setBuyerTrackerInvoiceCode] = useState('');
  const [isAdminLoginModalOpen, setIsAdminLoginModalOpen] = useState(false);
  const [addedToastProductId, setAddedToastProductId] = useState<string | null>(null);

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

  // Cart Handlers (Sistem Pre-Order: Tanpa Batas Stok)
  const handleAddToCart = (product: Product) => {
    if (!product.isActive) return;

    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => item.product.id === product.id);
      if (existingIndex > -1) {
        const currentQty = prev[existingIndex].quantity;
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
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
  ) => {
    const res = await submitCustomerReview({
      customerName: newRev.customerName,
      faculty: newRev.faculty,
      rating: newRev.rating,
      menuOrdered: newRev.menuOrdered,
      comment: newRev.comment,
    });
    if (res.success && res.data) {
      setReviews((prev) => [res.data!, ...prev]);
    }
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
      className="min-h-screen bg-[#FAF6F0] text-[#3B2618] flex flex-col font-sans selection:bg-[#F2E8DC] selection:text-[#5C3A21]"
      suppressHydrationWarning
    >
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
      />

      {/* Main Body Content */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-8 py-4 sm:py-6 space-y-6">
        {/* 3.B. Bar Info Batch PO Aktif */}
        <BannerOrderFlow
          batchConfig={batchConfig}
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

      {/* 4.1. Drawer / Modal Keranjang & Checkout WhatsApp */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onClearCart={handleClearCart}
        batchConfig={batchConfig}
        onOrderCreated={handleOrderCreated}
        onBrowseMenu={handleScrollToMenu}
      />

      {/* 4.2. Modal "Lacak Kode Pesanan Saya" (Khusus Pembeli, Single Order Search) */}
      <BuyerOrderTrackerModal
        isOpen={isBuyerTrackerOpen}
        onClose={() => setIsBuyerTrackerOpen(false)}
        orders={orders}
        onUploadProof={handleUploadProof}
        onSubmitReview={handleSubmitReview}
        initialInvoiceCode={buyerTrackerInvoiceCode}
      />

      {/* 4.3. Modal Login Admin (Otorisasi Terproteksi) */}
      <AdminLoginModal
        isOpen={isAdminLoginModalOpen}
        onClose={() => setIsAdminLoginModalOpen(false)}
        onLoginSuccess={handleAdminLoginSuccess}
      />
    </div>
  );
}
