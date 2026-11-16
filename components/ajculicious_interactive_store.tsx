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

import {
  INITIAL_PRODUCTS,
  TEAM_MEMBERS,
  INITIAL_ORDERS,
  INITIAL_REVIEWS,
  INITIAL_EXPENSES,
  INITIAL_BATCH_CONFIG,
} from '../data/initial_data';

export default function AjculiciousInteractiveStore() {
  const [isMounted, setIsMounted] = useState<boolean>(false);

  // App View & Auth State
  const [currentView, setCurrentView] = useState<'store' | 'admin'>('store');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(false);

  // State Initialization (with localStorage hydration check)
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>(INITIAL_ORDERS);
  const [reviews, setReviews] = useState<ReviewRecord[]>(INITIAL_REVIEWS);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>(INITIAL_EXPENSES);
  const [batchConfig, setBatchConfig] = useState<BatchPOConfig>(INITIAL_BATCH_CONFIG);

  // UI Interactive States
  const [showHotspots, setShowHotspots] = useState<boolean>(true);
  // Default active team member: Tim #3 (Anggota 3 - Resep & Menu) sesuai referensi gambar
  const [activeTeamMember, setActiveTeamMember] = useState<TeamMember>(TEAM_MEMBERS[2]);
  const [activeCategory, setActiveCategory] = useState<CategorySlug>('all');

  // Modals
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isBuyerTrackerOpen, setIsBuyerTrackerOpen] = useState(false);
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

      const storedOrders = localStorage.getItem('ajc_orders');
      if (storedOrders) setOrders(JSON.parse(storedOrders));

      const storedCart = localStorage.getItem('ajc_cart');
      if (storedCart) setCart(JSON.parse(storedCart));

      const storedProducts = localStorage.getItem('ajc_products');
      if (storedProducts) setProducts(JSON.parse(storedProducts));

      const storedReviews = localStorage.getItem('ajc_reviews');
      if (storedReviews) setReviews(JSON.parse(storedReviews));

      const storedExpenses = localStorage.getItem('ajc_expenses');
      if (storedExpenses) setExpenses(JSON.parse(storedExpenses));

      const storedBatch = localStorage.getItem('ajc_batch');
      if (storedBatch) setBatchConfig(JSON.parse(storedBatch));
    } catch {
      // Fallback to initial data if localStorage error
    }
  }, []);

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

  // Cart Handlers
  const handleAddToCart = (product: Product) => {
    if (product.stockQuota <= 0) return;

    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => item.product.id === product.id);
      if (existingIndex > -1) {
        const currentQty = prev[existingIndex].quantity;
        if (currentQty >= product.stockQuota) return prev;
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: currentQty + 1,
        };
        return updated;
      }
      return [...prev, { product, quantity: 1 }];
    });

    // Show temporary feedback toast on product card
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
            if (newQty > item.product.stockQuota) return item;
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

  // Order Placement Handler: Deducts quota real-time & prepends to orders
  const handleOrderCreated = (newOrder: OrderRecord) => {
    // 1. Add to orders history
    setOrders((prev) => [newOrder, ...prev]);

    // 2. Reduce product stock quota real-time
    setProducts((prev) =>
      prev.map((prod) => {
        const orderedItem = newOrder.items.find((it) => it.productId === prod.id);
        if (orderedItem) {
          const updatedQuota = Math.max(0, prod.stockQuota - orderedItem.quantity);
          return { ...prod, stockQuota: updatedQuota };
        }
        return prod;
      })
    );
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

  // Review Submission Handler
  const handleSubmitReview = (
    newRev: Omit<ReviewRecord, 'id' | 'isApproved'>
  ) => {
    const createdReview: ReviewRecord = {
      ...newRev,
      id: `rev-${Date.now()}`,
      isApproved: true, // auto approve in demo
    };
    setReviews((prev) => [createdReview, ...prev]);
  };

  // Admin Order Status Update
  const handleUpdateOrderStatus = (orderId: string, nextStatus: OrderStatus) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
    );
  };

  // Admin Auth Handlers
  const handleAdminLoginSuccess = () => {
    setIsAdminLoggedIn(true);
    setCurrentView('admin');
    try {
      localStorage.setItem('ajc_admin_auth', 'true');
    } catch {}
  };

  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false);
    setCurrentView('store');
    try {
      localStorage.removeItem('ajc_admin_auth');
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
        onBackToStore={() => setCurrentView('store')}
        onLogout={handleAdminLogout}
        products={products}
        onUpdateProducts={(prods) => setProducts(prods)}
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
        onUpdateBatchConfig={(conf) => setBatchConfig(conf)}
      />
    );
  }

  // RENDER BUYER STOREFRONT
  return (
    <div
      className="min-h-screen bg-[#FAF6F0] text-[#3B2618] flex flex-col font-sans selection:bg-[#F2E8DC] selection:text-[#5C3A21]"
      suppressHydrationWarning
    >
      {/* 3.A. Sticky Top Navbar (Cleaned: Focused Strictly on Customer Experience) */}
      <Navbar
        showHotspots={showHotspots}
        onToggleHotspots={() => setShowHotspots((prev) => !prev)}
        onScrollToMenu={handleScrollToMenu}
        cartItemCount={totalCartItems}
        cartTotalPrice={totalCartPrice}
        onOpenCart={() => setIsCartOpen(true)}
      />

      {/* Main Body Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-6 sm:space-y-8">
        {/* 3.B. Banner Alur Pemesanan & Info Batch PO Aktif */}
        <BannerOrderFlow
          batchConfig={batchConfig}
          onOpenOrderTracker={() => {
            setBuyerTrackerInvoiceCode('');
            setIsBuyerTrackerOpen(true);
          }}
        />

        {/* 3.C. Hero Interactive Storefront Counter & Kartu Rekomendasi Staf */}
        <HeroCounter
          teamMembers={TEAM_MEMBERS}
          activeMember={activeTeamMember}
          onSelectMember={(member) => setActiveTeamMember(member)}
          showHotspots={showHotspots}
          products={products}
          onAddToCart={handleAddToCart}
          onFilterCategory={handleFilterCategory}
          onOpenOrderTracker={() => {
            setBuyerTrackerInvoiceCode('');
            setIsBuyerTrackerOpen(true);
          }}
          addedToastProduct={addedToastProductId}
        />

        {/* 3.D. Katalog Menu AJCUlicious */}
        <ProductCatalog
          products={products}
          activeCategory={activeCategory}
          onSelectCategory={(cat) => setActiveCategory(cat)}
          cart={cart}
          onAddToCart={handleAddToCart}
          onUpdateQuantity={handleUpdateCartQuantity}
        />

        {/* 3.E. Section Testimoni & Social Proof Pelanggan */}
        <TestimonialsSection
          reviews={reviews}
          onOpenReviewModal={() => {
            setBuyerTrackerInvoiceCode('');
            setIsBuyerTrackerOpen(true);
          }}
        />
      </main>

      {/* Footer & Elegant Admin Login / Track Order Links */}
      <Footer
        onOpenAdminLogin={() => {
          if (isAdminLoggedIn) {
            setCurrentView('admin');
          } else {
            setIsAdminLoginModalOpen(true);
          }
        }}
        onOpenBuyerTracker={() => {
          setBuyerTrackerInvoiceCode('');
          setIsBuyerTrackerOpen(true);
        }}
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
