'use client';

import React, { useState } from 'react';
import {
  Plus,
  Minus,
  Search,
  X,
} from 'lucide-react';
import { Product, CategorySlug, CartItem } from '../types/ajculicious';
import { formatRupiah } from '../utils/formatters';
import { useBodyScrollLock } from '../utils/useBodyScrollLock';

interface ProductCatalogProps {
  products: Product[];
  activeCategory: CategorySlug;
  onSelectCategory: (cat: CategorySlug) => void;
  cart: CartItem[];
  onAddToCart: (product: Product) => void;
  onUpdateQuantity: (productId: string, delta: number) => void;
  isOrderOpen?: boolean;
  onBlockedByClosedPO?: () => void;
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
  isOrderOpen = true,
  onBlockedByClosedPO,
  isTourHighlighted = false,
  isSwarmRebuilding = false,
  onTriggerSwarmRebuild,
}: ProductCatalogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useBodyScrollLock(Boolean(selectedProduct));

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
      className={`flex flex-col gap-4 pt-2 min-w-0 scroll-mt-20 transition-all duration-300 ${
        isTourHighlighted
          ? 'relative z-[58] bg-[#FAF6F0] p-4 rounded-3xl ring-4 ring-amber-400 shadow-2xl'
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
            Klik produk untuk melihat detail menu &amp; opsi pesanan
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {filteredProducts.map((product) => {
            const isBrowniesCard = isMainBrowniesProduct(product);
            const inCart = cart.find((c) => c.product.id === product.id);
            const isBestSeller = Boolean(
              product.isBestSeller ||
                (isBrowniesCard && brownies200Product?.isBestSeller)
            );

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
                className={`rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-200 cursor-pointer group border ${
                  isBestSeller
                    ? 'bg-gradient-to-b from-amber-50/95 via-[#FFFDF8] to-white border-amber-300 ring-1 ring-amber-200/80 hover:border-amber-500 hover:shadow-md'
                    : 'bg-white border-[#EADFD3] hover:border-[#5C3A21]/60 hover:shadow-md'
                }`}
              >
                {/* Gambar Menu di Atas */}
                <div className="relative aspect-[4/3] w-full bg-[#FAF6F0] overflow-hidden border-b border-[#F4ECE1]">
                  {product.imageUrl &&
                  product.imageUrl !== '/images/storefront-counter.jpg' ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl select-none">
                      {product.emoji}
                    </div>
                  )}

                  {isBestSeller && (
                    <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-amber-400 text-[#3B2618] text-[10px] font-extrabold shadow-xs border border-amber-200">
                      Best Seller
                    </span>
                  )}
                </div>

                {/* Nama, Harga & Tombol Pesan di Bawah */}
                <div className="p-3 sm:p-3.5 flex flex-col justify-between flex-1 gap-2.5">
                  <div className="space-y-1">
                    <h3 className="font-bold text-xs sm:text-sm text-[#3B2618] group-hover:text-[#5C3A21] transition-colors leading-snug line-clamp-2 min-h-[2.25rem]">
                      {isBrowniesCard ? 'Brownies' : product.name}
                    </h3>

                    {isBrowniesCard ? (
                      <p className="font-extrabold text-sm sm:text-base text-[#5C3A21]">
                        Rp22.000{' '}
                        <span className="text-[11px] font-bold text-[#8C6D53]">
                          - Rp28.000
                        </span>
                      </p>
                    ) : (
                      <p className="font-extrabold text-sm sm:text-base text-[#5C3A21]">
                        {formatRupiah(product.price)}
                      </p>
                    )}
                  </div>

                  <div onClick={(e) => e.stopPropagation()}>
                    {isBrowniesCard ? (
                      <button
                        type="button"
                        suppressHydrationWarning
                        onClick={() => {
                          setBrowniesSize('150g');
                          setSelectedProduct(product);
                        }}
                        className="w-full py-2 px-3 rounded-xl bg-[#5C3A21] text-white text-xs font-semibold hover:bg-[#462B18] active:scale-95 transition-all"
                      >
                        Pilih Opsi
                        {totalBrowniesInCart > 0
                          ? ` (${totalBrowniesInCart})`
                          : ''}
                      </button>
                    ) : inCart ? (
                      <div className="w-full flex items-center justify-between bg-[#FAF6F0] border border-[#E6D8C7] rounded-xl px-2 py-1">
                        <button
                          type="button"
                          suppressHydrationWarning
                          onClick={() => onUpdateQuantity(product.id, -1)}
                          className="w-7 h-7 rounded-lg bg-white text-[#5C3A21] flex items-center justify-center hover:bg-[#E6D8C7] transition"
                          aria-label={`Kurangi ${product.name}`}
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>

                        <span className="text-xs font-bold text-[#3B2618]">
                          {inCart.quantity}
                        </span>

                        <button
                          type="button"
                          suppressHydrationWarning
                          onClick={() => onUpdateQuantity(product.id, 1)}
                          className="w-7 h-7 rounded-lg bg-[#5C3A21] text-white flex items-center justify-center hover:bg-[#462B18] transition"
                          aria-label={`Tambah ${product.name}`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        suppressHydrationWarning
                        onClick={() => onAddToCart(product)}
                        className="w-full py-2 px-3 rounded-xl bg-[#5C3A21] text-white text-xs font-semibold hover:bg-[#462B18] active:scale-95 transition-all"
                      >
                        + Tambah
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* ================= MODAL DETAIL PRODUK (GAMBAR DI ATAS, DETAIL & PESAN DI BAWAH) ================= */}
      {selectedProduct && (
        <div
          onClick={() => setSelectedProduct(null)}
          className="fixed inset-0 !m-0 z-[60] bg-black/55 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`bg-[#FFFDF9] border rounded-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col animate-in zoom-in-95 duration-200 ${
              isSelectedBrownies ? 'max-w-lg' : 'max-w-md'
            } ${
              selectedProduct.isBestSeller ||
              (isSelectedBrownies && brownies200Product?.isBestSeller)
                ? 'border-amber-300'
                : 'border-[#D8C2A8]'
            }`}
          >
            {/* Gambar di Atas */}
            <div className="relative bg-gradient-to-br from-[#F4ECE1] via-[#EFE5D8] to-[#E5D5C3] p-5 flex items-center justify-center border-b border-[#EADFD3]">
              <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between gap-2 z-10">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/90 text-[#5C3A21] border border-[#EADFD3]">
                    {selectedProduct.categoryLabel}
                  </span>
                  {(selectedProduct.isBestSeller ||
                    (isSelectedBrownies && brownies200Product?.isBestSeller)) && (
                    <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-amber-400 text-[#3B2618] border border-amber-200 shadow-2xs">
                      Best Seller
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="p-2 rounded-full bg-white/90 hover:bg-white text-[#3B2618] border border-[#EADFD3] shadow-2xs transition"
                  aria-label="Tutup detail"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {selectedProduct.imageUrl &&
              selectedProduct.imageUrl !== '/images/storefront-counter.jpg' ? (
                <div className="w-full max-w-[230px] sm:max-w-[260px] mt-6 rounded-2xl overflow-hidden border-4 border-white shadow-lg bg-white">
                  <img
                    src={selectedProduct.imageUrl}
                    alt={selectedProduct.name}
                    className="w-full h-52 sm:h-60 object-cover block"
                  />
                </div>
              ) : (
                <div className="w-36 h-36 mt-6 rounded-full bg-[#FFFDF9] border-4 border-white shadow-lg flex items-center justify-center text-7xl select-none">
                  {selectedProduct.emoji}
                </div>
              )}
            </div>

            {/* Detail, Opsi, & Tombol Pesan di Bawah */}
            <div className="p-5 sm:p-6 space-y-4">
              <div>
                <h3 className="font-black text-lg sm:text-xl text-[#3B2618] leading-tight">
                  {isSelectedBrownies
                    ? 'Brownies Fudgy AJCUlicious'
                    : selectedProduct.name}
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

              {/* Footer Modal: Tombol Tambah Keranjang */}
              <div className="pt-3 border-t border-[#EADFD3] flex items-center justify-end">
                {isSelectedBrownies && activeBrowniesTargetProduct ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (!isOrderOpen) {
                        setSelectedProduct(null);
                        onBlockedByClosedPO?.();
                        return;
                      }
                      onAddToCart(activeBrowniesTargetProduct);
                      setJustAddedCustomBrownies(true);
                      setTimeout(() => setJustAddedCustomBrownies(false), 1500);
                    }}
                    className="w-full py-3 px-5 rounded-xl bg-[#5C3A21] text-white text-xs font-bold hover:bg-[#462B18] active:scale-95 transition-all shadow-sm"
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
                  <div className="w-full flex items-center justify-between bg-[#FAF6F0] border border-[#D8C2A8] rounded-xl px-3 py-1.5">
                    <button
                      type="button"
                      onClick={() => onUpdateQuantity(selectedProduct.id, -1)}
                      className="w-8 h-8 rounded-lg bg-white text-[#5C3A21] flex items-center justify-center font-bold hover:bg-[#E6D8C7]"
                    >
                      -
                    </button>
                    <span className="text-xs font-extrabold text-[#3B2618]">
                      {selectedInCart.quantity} di Keranjang
                    </span>
                    <button
                      type="button"
                      onClick={() => onUpdateQuantity(selectedProduct.id, 1)}
                      className="w-8 h-8 rounded-lg bg-[#5C3A21] text-white flex items-center justify-center font-bold hover:bg-[#462B18]"
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (!isOrderOpen) {
                        setSelectedProduct(null);
                        onBlockedByClosedPO?.();
                        return;
                      }
                      onAddToCart(selectedProduct);
                    }}
                    className="w-full py-3 px-5 rounded-xl bg-[#5C3A21] text-white text-xs font-bold hover:bg-[#462B18] active:scale-95 transition-all shadow-sm"
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
