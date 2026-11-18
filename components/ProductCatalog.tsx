'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Minus,
  Search,
  X,
  Sparkles,
  Flame,
  Cookie,
  Droplets,
  Wheat,
  Milk,
  Nut,
  ShoppingBag,
  SlidersHorizontal,
  Check,
  Wand2,
} from 'lucide-react';
import { Product, CategorySlug, CartItem } from '../types/ajculicious';
import { formatRupiah } from '../utils/formatters';

interface ProductCatalogProps {
  products: Product[];
  activeCategory: CategorySlug;
  onSelectCategory: (cat: CategorySlug) => void;
  cart: CartItem[];
  onAddToCart: (product: Product) => void;
  onUpdateQuantity: (productId: string, delta: number) => void;
  isTourHighlighted?: boolean;
  isSwarmRebuilding?: boolean;
  onTriggerSwarmRebuild?: () => void;
}

const CATEGORIES: { id: CategorySlug; label: string }[] = [
  { id: 'all', label: 'Semua' },
  { id: 'dubai-cookies', label: 'Dubai Cookies' },
  { id: 'cookies', label: 'Soft Cookies' },
  { id: 'brownies', label: 'Brownies' },
  { id: 'dessert-box', label: 'Dessert Box' },
  { id: 'dimsum', label: 'Dimsum' },
];

const BROWNIES_SUGAR_OPTIONS = [
  { id: 'Normal Sugar', shortLabel: '100%', label: 'Normal Sugar', desc: 'Manis Standar' },
  { id: 'Less Sugar', shortLabel: '75%', label: 'Less Sugar', desc: 'Manis Pas' },
  { id: 'Half Sugar', shortLabel: '50%', label: 'Half Sugar', desc: 'Lebih Dark' },
  { id: 'No Sugar', shortLabel: '0%', label: 'No Sugar', desc: 'Tanpa Gula' },
] as const;

const BROWNIES_SALT_OPTIONS = [
  { id: 'Normal Salt', shortLabel: '100%', label: 'Normal Salt', desc: 'Gurih Pas' },
  { id: 'Less Salt', shortLabel: '50%', label: 'Less Salt', desc: 'Sedikit Garam' },
  { id: 'No Salt', shortLabel: '0%', label: 'No Salt', desc: 'Tanpa Garam' },
  { id: 'Extra Salt', shortLabel: 'Extra', label: 'Extra Salt', desc: 'Extra Sea Salt' },
] as const;

// Helper ikon visual untuk kotak komposisi bahan
function getIngredientIcon(ingredientName: string) {
  const lower = ingredientName.toLowerCase();
  if (lower.includes('choco') || lower.includes('cocoa') || lower.includes('cokelat')) {
    return <Cookie className="w-5 h-5 text-[#5C3A21]" />;
  }
  if (
    lower.includes('pistachio') ||
    lower.includes('almond') ||
    lower.includes('nut') ||
    lower.includes('wijen')
  ) {
    return <Nut className="w-5 h-5 text-[#5C3A21]" />;
  }
  if (
    lower.includes('butter') ||
    lower.includes('cream') ||
    lower.includes('milk') ||
    lower.includes('cheese') ||
    lower.includes('mascarpone')
  ) {
    return <Milk className="w-5 h-5 text-[#5C3A21]" />;
  }
  if (
    lower.includes('chili') ||
    lower.includes('mentai') ||
    lower.includes('torch') ||
    lower.includes('oil')
  ) {
    return <Flame className="w-5 h-5 text-[#5C3A21]" />;
  }
  if (
    lower.includes('flour') ||
    lower.includes('kunafa') ||
    lower.includes('sponge') ||
    lower.includes('crumb') ||
    lower.includes('kulit')
  ) {
    return <Wheat className="w-5 h-5 text-[#5C3A21]" />;
  }
  if (lower.includes('sugar') || lower.includes('spread') || lower.includes('vanilla')) {
    return <Droplets className="w-5 h-5 text-[#5C3A21]" />;
  }
  return <Sparkles className="w-5 h-5 text-[#5C3A21]" />;
}

function isMainBrowniesProduct(product: Product): boolean {
  const slug = product.slug.toLowerCase();
  const name = product.name.toLowerCase();
  return (
    slug === 'fudgy-shiny-crust-brownies' ||
    name === 'brownies' ||
    name === 'brownies (150g)'
  );
}

function isBrownies200gVariant(product: Product): boolean {
  const slug = product.slug.toLowerCase();
  const name = product.name.toLowerCase();
  return slug === 'brownies-200g' || name === 'brownies (200g)';
}

export default function ProductCatalog({
  products,
  activeCategory,
  onSelectCategory,
  cart,
  onAddToCart,
  onUpdateQuantity,
  isTourHighlighted = false,
  isSwarmRebuilding = false,
  onTriggerSwarmRebuild,
}: ProductCatalogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // State khusus kustomisasi Brownies (150g / 200g + Opsi Bulat Gula & Garam ala Kopi Kenangan)
  const [browniesSize, setBrowniesSize] = useState<'150g' | '200g'>('150g');
  const [browniesSugar, setBrowniesSugar] = useState<string>('Normal Sugar');
  const [browniesSalt, setBrowniesSalt] = useState<string>('Normal Salt');
  const [justAddedCustomBrownies, setJustAddedCustomBrownies] = useState(false);

  // Cari produk Brownies 150g (Rp22.000) dan Brownies 200g (Rp28.000) dari daftar produk
  const brownies150Product = products.find(isMainBrowniesProduct);
  const brownies200Product = products.find(isBrownies200gVariant);

  // Sembunyikan varian 200g dari grid utama karena sudah digabung ke dalam pilihan kartu "Brownies"
  const filteredProducts = products.filter((product) => {
    if (!product.isActive) return false;
    if (isBrownies200gVariant(product) && brownies150Product) return false;

    const matchesCategory =
      activeCategory === 'all' || product.category === activeCategory;
    const matchesSearch =
      searchQuery.trim() === '' ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const isSelectedBrownies =
    selectedProduct &&
    (isMainBrowniesProduct(selectedProduct) ||
      isBrownies200gVariant(selectedProduct));

  // Produk aktif yang dipakai ketika tombol "+ Tambah ke Keranjang" diklik di dalam modal
  const activeBrowniesTargetProduct: Product | null = isSelectedBrownies
    ? browniesSize === '200g' && brownies200Product
      ? {
          ...brownies200Product,
          name: `Brownies (200g • ${browniesSugar}, ${browniesSalt})`,
          price: 28000,
        }
      : {
          ...(brownies150Product || selectedProduct!),
          name: `Brownies (150g • ${browniesSugar}, ${browniesSalt})`,
          price: 22000,
        }
    : null;

  const selectedInCart = selectedProduct
    ? isSelectedBrownies && activeBrowniesTargetProduct
      ? cart.find((c) => c.product.id === activeBrowniesTargetProduct.id)
      : cart.find((c) => c.product.id === selectedProduct.id)
    : undefined;

  // Hitung total Brownies (150g + 200g) yang sudah ada di keranjang
  const totalBrowniesInCart = cart
    .filter(
      (c) =>
        isMainBrowniesProduct(c.product) ||
        isBrownies200gVariant(c.product) ||
        c.product.name.toLowerCase().startsWith('brownies (')
    )
    .reduce((sum, c) => sum + c.quantity, 0);

  return (
    <section
      id="katalog-menu"
      className={`space-y-4 pt-2 scroll-mt-20 transition-all duration-300 ${
        isTourHighlighted
          ? 'relative z-40 bg-[#FAF6F0] p-4 rounded-3xl ring-4 ring-amber-400 shadow-2xl'
          : ''
      }`}
    >
      {/* Header & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg sm:text-xl font-extrabold text-[#3B2618] tracking-tight">
              Menu Pilihan AJCUlicious
            </h2>
          </div>
          <p className="text-xs text-[#8C6D53]">
            Klik produk untuk melihat poster katalog, komposisi bahan, &amp; opsi kustomisasi
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-[#8C6D53] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            suppressHydrationWarning
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari menu..."
            className="w-full pl-9 pr-4 py-2 rounded-full border border-[#EADFD3] bg-white text-xs text-[#3B2618] focus:outline-none focus:ring-2 focus:ring-[#5C3A21] placeholder:text-[#A68A71]"
          />
          {searchQuery && (
            <button
              type="button"
              suppressHydrationWarning
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8C6D53] hover:text-[#3B2618]"
            >
              &times;
            </button>
          )}
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              suppressHydrationWarning
              onClick={() => onSelectCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-[#5C3A21] text-white shadow-2xs scale-105'
                  : 'bg-white text-[#6E523D] border border-[#EADFD3] hover:bg-[#F2E8DC]'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Product Grid dengan Animasi Scroll Reveal & Swarm Rebuild */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-10 bg-white border border-[#EADFD3] rounded-2xl p-6">
          <p className="text-sm font-semibold text-[#3B2618]">
            Menu &ldquo;{searchQuery}&rdquo; tidak ditemukan
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              onSelectCategory('all');
            }}
            className="mt-2.5 px-4 py-1.5 rounded-full bg-[#5C3A21] text-white text-xs font-semibold hover:bg-[#462B18]"
          >
            Reset Filter
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredProducts.map((product) => {
            const isBrowniesCard = isMainBrowniesProduct(product);
            const inCart = cart.find((c) => c.product.id === product.id);
            const ingredientsList = product.ingredients ?? [];

            return (
              <article
                key={product.id}
                data-product-id={product.id}
                onClick={() => {
                  if (isBrowniesCard) {
                    setBrowniesSize('150g');
                  }
                  setSelectedProduct(product);
                }}
                className="bg-white border border-[#EADFD3] rounded-2xl p-4 flex flex-col justify-between hover:border-[#5C3A21]/60 hover:shadow-md transition-all duration-200 cursor-pointer group"
              >
                <div className="flex items-start gap-3.5">
                  {product.imageUrl &&
                  product.imageUrl !== '/images/storefront-counter.jpg' ? (
                    <div className="w-20 h-24 sm:w-24 sm:h-28 rounded-2xl bg-[#FAF6F0] border border-[#EADFD3] overflow-hidden shrink-0 shadow-2xs relative">
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-[#FAF6F0] border border-[#EADFD3] flex items-center justify-center text-3xl shrink-0 group-hover:scale-105 transition-transform">
                      {product.emoji}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-sm sm:text-base text-[#3B2618] group-hover:text-[#5C3A21] transition-colors leading-snug">
                          {isBrowniesCard ? 'Brownies' : product.name}
                        </h3>
                        {isBrowniesCard && (
                          <div className="flex flex-wrap items-center gap-1 mt-1">
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 font-bold border border-amber-200">
                              Pilihan: 150g (22K) / 200g (28K)
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FAF6F0] text-[#5C3A21] font-semibold border border-[#EADFD3]">
                              Custom Gula &amp; Garam
                            </span>
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FAF6F0] text-[#7D5E46] font-medium border border-[#EADFD3] shrink-0">
                        {product.categoryLabel}
                      </span>
                    </div>

                    <p className="text-xs text-[#7D5E46] mt-1.5 leading-relaxed line-clamp-2">
                      {isBrowniesCard
                        ? 'Soft and chewy fudgy brownies panggang dengan shiny crust renyah. Tersedia ukuran 150g & 200g dengan opsi takaran gula dan garam.'
                        : product.description}
                    </p>

                    {ingredientsList.length > 0 && (
                      <p className="text-[10px] text-[#9C7A5E] font-medium mt-1.5 truncate">
                        Komposisi: {ingredientsList.join(' + ')}
                      </p>
                    )}
                  </div>
                </div>

                <div
                  onClick={(e) => e.stopPropagation()}
                  className="mt-3.5 pt-3 border-t border-[#F4ECE1] flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2">
                    {isBrowniesCard ? (
                      <div>
                        <span className="font-extrabold text-sm sm:text-base text-[#3B2618]">
                          Rp22.000
                        </span>
                        <span className="text-xs font-bold text-[#8C6D53]">
                          {' '}
                          - Rp28.000
                        </span>
                      </div>
                    ) : (
                      <span className="font-extrabold text-base text-[#3B2618]">
                        {formatRupiah(product.price)}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedProduct(product)}
                      className="text-[11px] text-[#7D5E46] hover:text-[#3B2618] underline font-medium"
                    >
                      {isBrowniesCard ? 'Pilih Ukuran & Opsi' : 'Lihat Bahan'}
                    </button>
                  </div>

                  {isBrowniesCard ? (
                    <button
                      type="button"
                      suppressHydrationWarning
                      onClick={() => setSelectedProduct(product)}
                      className="px-3.5 py-1.5 rounded-xl bg-[#5C3A21] text-white text-xs font-semibold hover:bg-[#462B18] active:scale-95 transition-all"
                    >
                      Pilih Opsi
                      {totalBrowniesInCart > 0
                        ? ` (${totalBrowniesInCart})`
                        : ''}
                    </button>
                  ) : inCart ? (
                    <div className="inline-flex items-center gap-2 bg-[#FAF6F0] border border-[#E6D8C7] rounded-xl px-2 py-1">
                      <button
                        type="button"
                        suppressHydrationWarning
                        onClick={() => onUpdateQuantity(product.id, -1)}
                        className="w-6 h-6 rounded-lg bg-white text-[#5C3A21] flex items-center justify-center hover:bg-[#E6D8C7] transition"
                        aria-label={`Kurangi ${product.name}`}
                      >
                        <Minus className="w-3 h-3" />
                      </button>

                      <span className="text-xs font-bold min-w-[20px] text-center text-[#3B2618]">
                        {inCart.quantity}
                      </span>

                      <button
                        type="button"
                        suppressHydrationWarning
                        onClick={() => onUpdateQuantity(product.id, 1)}
                        className="w-6 h-6 rounded-lg bg-[#5C3A21] text-white flex items-center justify-center hover:bg-[#462B18] transition"
                        aria-label={`Tambah ${product.name}`}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      suppressHydrationWarning
                      onClick={() => onAddToCart(product)}
                      className="px-3.5 py-1.5 rounded-xl bg-[#5C3A21] text-white text-xs font-semibold hover:bg-[#462B18] active:scale-95 transition-all"
                    >
                      + Tambah
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* ================= MODAL DETAIL PRODUK & OPSI KUSTOMISASI BROWNIES (ALA KOPI KENANGAN) ================= */}
      {selectedProduct && (
        <div
          onClick={() => setSelectedProduct(null)}
          className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#FAF6F0] border border-[#D8C2A8] rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl grid grid-cols-1 md:grid-cols-12 animate-in zoom-in-95 duration-200"
          >
            {/* SISI KIRI (5 Kolom): Poster Katalog Besar + Bar Komposisi Bawah */}
            <div className="md:col-span-5 bg-gradient-to-br from-[#EFE5D8] via-[#E5D5C3] to-[#D8C2A8] p-6 flex flex-col justify-between relative min-h-[280px] sm:min-h-[360px]">
              {/* Label Kategori Kiri Atas */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full bg-white/80 text-[#5C3A21] backdrop-blur-xs">
                  {selectedProduct.categoryLabel}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="md:hidden p-2 rounded-full bg-white/80 text-[#3B2618]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Gambar / Poster Katalog Produk Besar di Tengah */}
              <div className="my-auto py-4 flex flex-col items-center justify-center">
                {selectedProduct.imageUrl &&
                selectedProduct.imageUrl !== '/images/storefront-counter.jpg' ? (
                  <div className="w-full max-w-[260px] rounded-2xl overflow-hidden border-4 border-white shadow-xl bg-white">
                    <img
                      src={selectedProduct.imageUrl}
                      alt={selectedProduct.name}
                      className="w-full h-auto object-contain block"
                    />
                  </div>
                ) : (
                  <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-[#FFFDF9] border-4 border-white shadow-xl flex items-center justify-center text-7xl sm:text-8xl select-none">
                    {selectedProduct.emoji}
                  </div>
                )}
              </div>

              {/* Bar Formula Komposisi di Bawah Gambar */}
              <div className="grid grid-cols-12 rounded-2xl overflow-hidden border border-[#5C3A21]/30 shadow-sm text-xs">
                <div className="col-span-5 bg-[#5C3A21] text-white p-2.5 flex items-center justify-center font-bold">
                  <span className="truncate text-[11px] uppercase tracking-tight">
                    {isSelectedBrownies
                      ? `Brownies ${browniesSize}`
                      : selectedProduct.name.split(' ').slice(0, 2).join(' ')}
                  </span>
                </div>
                <div className="col-span-7 bg-[#FFFDF9] text-[#3B2618] p-2.5 flex items-center font-mono text-[10px] font-semibold uppercase tracking-tight leading-tight">
                  {(selectedProduct.ingredients ?? ['Bahan Premium']).join(' + ')}
                </div>
              </div>
            </div>

            {/* SISI KANAN (7 Kolom): Detail Menu, Opsi Bulat KopKen (Khusus Brownies), & Komposisi */}
            <div className="md:col-span-7 p-5 sm:p-7 flex flex-col justify-between space-y-5 bg-[#FFFDF9]">
              <div className="space-y-4">
                {/* Header Kanan */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-black text-xl sm:text-2xl text-[#3B2618] leading-tight">
                      {isSelectedBrownies ? 'Brownies Fudgy AJCUlicious' : selectedProduct.name}
                    </h3>
                    <p className="font-extrabold text-lg text-[#5C3A21] mt-1">
                      {isSelectedBrownies
                        ? formatRupiah(browniesSize === '200g' ? 28000 : 22000)
                        : formatRupiah(selectedProduct.price)}
                      {isSelectedBrownies && (
                        <span className="text-xs font-semibold text-[#8C6D53] ml-1.5">
                          ({browniesSize} &bull; {browniesSugar} &bull; {browniesSalt})
                        </span>
                      )}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedProduct(null)}
                    className="hidden md:flex p-2 rounded-full bg-[#FAF6F0] hover:bg-[#F2E8DC] text-[#3B2618] border border-[#EADFD3] transition"
                    aria-label="Tutup detail"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Deskripsi Produk */}
                <p className="text-xs sm:text-sm text-[#6E523D] leading-relaxed">
                  {selectedProduct.description}
                </p>

                {/* ================= KHUSUS BROWNIES: PILIHAN UKURAN (150g / 200g) & OPSI BULAT ALA KOPI KENANGAN ================= */}
                {isSelectedBrownies && (
                  <div className="p-4 rounded-2xl bg-[#FAF6F0] border border-[#EADFD3] space-y-4">
                    {/* 1. Pilihan Ukuran / Gramasi (150g = 22K, 200g = 28K) */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#3B2618]">
                          1. Pilih Ukuran Gramasi
                        </span>
                        <span className="text-[10px] font-bold text-[#5C3A21] bg-white px-2 py-0.5 rounded-full border border-[#EADFD3]">
                          Wajib Pilih 1
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <button
                          type="button"
                          onClick={() => setBrowniesSize('150g')}
                          className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between ${
                            browniesSize === '150g'
                              ? 'bg-[#5C3A21] text-white border-[#5C3A21] shadow-sm scale-[1.01]'
                              : 'bg-white text-[#3B2618] border-[#EADFD3] hover:bg-[#F2E8DC]/50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs border ${
                                browniesSize === '150g'
                                  ? 'bg-amber-300 text-[#3B2618] border-amber-200'
                                  : 'bg-[#FAF6F0] text-[#5C3A21] border-[#EADFD3]'
                              }`}
                            >
                              150g
                            </div>
                            <div>
                              <p className="text-xs font-extrabold">Ukuran 150g</p>
                              <p
                                className={`text-[10px] ${
                                  browniesSize === '150g'
                                    ? 'text-amber-200'
                                    : 'text-[#8C6D53]'
                                }`}
                              >
                                Porsi Personal
                              </p>
                            </div>
                          </div>
                          <span className="font-extrabold text-xs">Rp22.000</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setBrowniesSize('200g')}
                          className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between ${
                            browniesSize === '200g'
                              ? 'bg-[#5C3A21] text-white border-[#5C3A21] shadow-sm scale-[1.01]'
                              : 'bg-white text-[#3B2618] border-[#EADFD3] hover:bg-[#F2E8DC]/50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs border ${
                                browniesSize === '200g'
                                  ? 'bg-amber-300 text-[#3B2618] border-amber-200'
                                  : 'bg-[#FAF6F0] text-[#5C3A21] border-[#EADFD3]'
                              }`}
                            >
                              200g
                            </div>
                            <div>
                              <p className="text-xs font-extrabold">Ukuran 200g</p>
                              <p
                                className={`text-[10px] ${
                                  browniesSize === '200g'
                                    ? 'text-amber-200'
                                    : 'text-[#8C6D53]'
                                }`}
                              >
                                Porsi Lebih Puas
                              </p>
                            </div>
                          </div>
                          <span className="font-extrabold text-xs">Rp28.000</span>
                        </button>
                      </div>
                    </div>

                    {/* 2. Opsi Bulat Level Gula (Sugar Level ala Kopi Kenangan) */}
                    <div className="space-y-2 pt-2 border-t border-[#EADFD3]">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#3B2618]">
                          2. Level Gula (Sugar Level)
                        </span>
                        <span className="text-[10px] text-[#8C6D53] font-semibold">
                          Dipilih: <strong className="text-[#5C3A21]">{browniesSugar}</strong>
                        </span>
                      </div>

                      <div className="grid grid-cols-4 gap-2">
                        {BROWNIES_SUGAR_OPTIONS.map((opt) => {
                          const active = browniesSugar === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => setBrowniesSugar(opt.id)}
                              className="flex flex-col items-center text-center gap-1.5 group focus:outline-none"
                            >
                              <div
                                className={`w-13 h-13 sm:w-14 sm:h-14 rounded-full flex items-center justify-center border-2 transition-all duration-200 ${
                                  active
                                    ? 'bg-[#5C3A21] text-white border-[#5C3A21] ring-4 ring-amber-300/60 scale-105 shadow-md'
                                    : 'bg-white text-[#5C3A21] border-[#D8C2A8] group-hover:border-[#5C3A21] group-hover:bg-[#FFFDF9]'
                                }`}
                              >
                                <span className="text-xs font-black leading-none">
                                  {opt.shortLabel}
                                </span>
                              </div>
                              <div>
                                <p
                                  className={`text-[11px] leading-tight ${
                                    active
                                      ? 'font-extrabold text-[#3B2618]'
                                      : 'font-semibold text-[#6E523D]'
                                  }`}
                                >
                                  {opt.label}
                                </p>
                                <p className="text-[9px] text-[#8C6D53]">
                                  {opt.desc}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 3. Opsi Bulat Taburan Garam (Sea Salt Level ala Kopi Kenangan) */}
                    <div className="space-y-2 pt-2 border-t border-[#EADFD3]">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#3B2618]">
                          3. Taburan Garam (Sea Salt Level)
                        </span>
                        <span className="text-[10px] text-[#8C6D53] font-semibold">
                          Dipilih: <strong className="text-[#5C3A21]">{browniesSalt}</strong>
                        </span>
                      </div>

                      <div className="grid grid-cols-4 gap-2">
                        {BROWNIES_SALT_OPTIONS.map((opt) => {
                          const active = browniesSalt === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => setBrowniesSalt(opt.id)}
                              className="flex flex-col items-center text-center gap-1.5 group focus:outline-none"
                            >
                              <div
                                className={`w-13 h-13 sm:w-14 sm:h-14 rounded-full flex items-center justify-center border-2 transition-all duration-200 ${
                                  active
                                    ? 'bg-[#5C3A21] text-white border-[#5C3A21] ring-4 ring-amber-300/60 scale-105 shadow-md'
                                    : 'bg-white text-[#5C3A21] border-[#D8C2A8] group-hover:border-[#5C3A21] group-hover:bg-[#FFFDF9]'
                                }`}
                              >
                                <span className="text-xs font-black leading-none">
                                  {opt.shortLabel}
                                </span>
                              </div>
                              <div>
                                <p
                                  className={`text-[11px] leading-tight ${
                                    active
                                      ? 'font-extrabold text-[#3B2618]'
                                      : 'font-semibold text-[#6E523D]'
                                  }`}
                                >
                                  {opt.label}
                                </p>
                                <p className="text-[9px] text-[#8C6D53]">
                                  {opt.desc}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Grid Kotak Komposisi Bahan Utama */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#7D5E46]">
                      Komposisi &amp; Bahan Utama
                    </span>
                    <span className="text-[11px] text-[#8C6D53] font-medium">
                      100% Fresh Homemade
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 border-t border-l border-[#C8B197] rounded-xl overflow-hidden bg-[#FAF6F0]">
                    {(selectedProduct.ingredients ?? []).map((ing, idx) => (
                      <div
                        key={idx}
                        className="p-3 border-r border-b border-[#C8B197] flex flex-col items-center justify-center text-center gap-1 hover:bg-[#F2E8DC] transition-colors min-h-[58px]"
                      >
                        <span className="font-mono text-[10px] font-bold uppercase tracking-tight text-[#3B2618] leading-tight">
                          {ing}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer Modal: Tombol Tambah Keranjang */}
              <div className="pt-4 border-t border-[#EADFD3] flex items-center justify-end">
                {isSelectedBrownies && activeBrowniesTargetProduct ? (
                  <button
                    type="button"
                    onClick={() => {
                      onAddToCart(activeBrowniesTargetProduct);
                      setJustAddedCustomBrownies(true);
                      setTimeout(() => setJustAddedCustomBrownies(false), 1500);
                    }}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#5C3A21] text-white text-xs font-bold hover:bg-[#462B18] active:scale-95 transition-all shadow-sm"
                  >
                    {justAddedCustomBrownies
                      ? `Berhasil Ditambah (${browniesSize} - ${formatRupiah(
                          activeBrowniesTargetProduct.price
                        )})`
                      : `+ Tambah Brownies ${browniesSize} (${formatRupiah(
                          activeBrowniesTargetProduct.price
                        )})`}
                  </button>
                ) : selectedInCart ? (
                  <div className="inline-flex items-center gap-2.5 bg-[#FAF6F0] border border-[#D8C2A8] rounded-xl px-3 py-1.5">
                    <button
                      type="button"
                      onClick={() => onUpdateQuantity(selectedProduct.id, -1)}
                      className="w-7 h-7 rounded-lg bg-white text-[#5C3A21] flex items-center justify-center font-bold hover:bg-[#E6D8C7]"
                    >
                      -
                    </button>
                    <span className="text-xs font-extrabold min-w-[20px] text-center text-[#3B2618]">
                      {selectedInCart.quantity} di Keranjang
                    </span>
                    <button
                      type="button"
                      onClick={() => onUpdateQuantity(selectedProduct.id, 1)}
                      className="w-7 h-7 rounded-lg bg-[#5C3A21] text-white flex items-center justify-center font-bold hover:bg-[#462B18]"
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onAddToCart(selectedProduct)}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#5C3A21] text-white text-xs font-bold hover:bg-[#462B18] active:scale-95 transition-all shadow-sm"
                  >
                    + Tambah ke Keranjang
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
