'use client';

import React, { useState } from 'react';
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
}

const CATEGORIES: { id: CategorySlug; label: string }[] = [
  { id: 'all', label: 'Semua' },
  { id: 'dubai-cookies', label: 'Dubai Cookies' },
  { id: 'cookies', label: 'Soft Cookies' },
  { id: 'brownies', label: 'Brownies' },
  { id: 'dessert-box', label: 'Dessert Box' },
  { id: 'dimsum', label: 'Dimsum' },
];

// Helper ikon visual untuk kotak komposisi bahan (terinspirasi grid bahan Kopi Tuku)
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

export default function ProductCatalog({
  products,
  activeCategory,
  onSelectCategory,
  cart,
  onAddToCart,
  onUpdateQuantity,
  isTourHighlighted = false,
}: ProductCatalogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const filteredProducts = products.filter((product) => {
    if (!product.isActive) return false;
    const matchesCategory =
      activeCategory === 'all' || product.category === activeCategory;
    const matchesSearch =
      searchQuery.trim() === '' ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const selectedInCart = selectedProduct
    ? cart.find((c) => c.product.id === selectedProduct.id)
    : undefined;

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
          <h2 className="text-lg sm:text-xl font-extrabold text-[#3B2618] tracking-tight">
            Menu Pilihan
          </h2>
          <p className="text-xs text-[#8C6D53]">
            Klik produk untuk melihat detail komposisi bahan utama
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
                  ? 'bg-[#5C3A21] text-white shadow-2xs'
                  : 'bg-white text-[#6E523D] border border-[#EADFD3] hover:bg-[#F2E8DC]'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Clean Modern Product Grid (Tanpa Stok Karena Sistem Pre-Order) */}
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
            const inCart = cart.find((c) => c.product.id === product.id);
            const ingredientsList = product.ingredients ?? [];

            return (
              <article
                key={product.id}
                onClick={() => setSelectedProduct(product)}
                className="bg-white border border-[#EADFD3] rounded-2xl p-4 flex flex-col justify-between hover:border-[#5C3A21]/60 hover:shadow-md transition-all duration-200 cursor-pointer group"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-14 h-14 rounded-2xl bg-[#FAF6F0] border border-[#EADFD3] flex items-center justify-center text-3xl shrink-0 group-hover:scale-105 transition-transform">
                    {product.emoji}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-sm sm:text-base text-[#3B2618] group-hover:text-[#5C3A21] transition-colors leading-snug">
                        {product.name}
                      </h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FAF6F0] text-[#7D5E46] font-medium border border-[#EADFD3] shrink-0">
                        {product.categoryLabel}
                      </span>
                    </div>

                    <p className="text-xs text-[#7D5E46] mt-1 leading-relaxed line-clamp-2">
                      {product.description}
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
                    <span className="font-extrabold text-base text-[#3B2618]">
                      {formatRupiah(product.price)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedProduct(product)}
                      className="text-[11px] text-[#7D5E46] hover:text-[#3B2618] underline font-medium"
                    >
                      Lihat Bahan
                    </button>
                  </div>

                  {inCart ? (
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
                      className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-[#5C3A21] text-white text-xs font-semibold hover:bg-[#462B18] active:scale-95 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah</span>
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* ================= MODAL DETAIL PRODUK & KOMPOSISI BAHAN (GAYA SPLIT-VIEW KOPI TUKU X AJCULICIOUS) ================= */}
      {selectedProduct && (
        <div
          onClick={() => setSelectedProduct(null)}
          className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#FAF6F0] border border-[#D8C2A8] rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl grid grid-cols-1 md:grid-cols-12 animate-in zoom-in-95 duration-200"
          >
            {/* SISI KIRI (5 Kolom): Visual Produk Besar + Bar Komposisi Bawah */}
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

              {/* Gambar / Ilustrasi Produk Besar di Tengah */}
              <div className="my-auto py-6 flex flex-col items-center justify-center">
                <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-[#FFFDF9] border-4 border-white shadow-xl flex items-center justify-center text-7xl sm:text-8xl select-none">
                  {selectedProduct.emoji}
                </div>
              </div>

              {/* Bar Formula Komposisi di Bawah Gambar (Terinspirasi Bar Bawah Kopi Tuku) */}
              <div className="grid grid-cols-12 rounded-2xl overflow-hidden border border-[#5C3A21]/30 shadow-sm text-xs">
                <div className="col-span-5 bg-[#5C3A21] text-white p-2.5 flex items-center gap-1.5 font-bold">
                  <span className="text-base">{selectedProduct.emoji}</span>
                  <span className="truncate text-[11px] uppercase tracking-tight">
                    {selectedProduct.name.split(' ').slice(0, 2).join(' ')}
                  </span>
                </div>
                <div className="col-span-7 bg-[#FFFDF9] text-[#3B2618] p-2.5 flex items-center font-mono text-[10px] font-semibold uppercase tracking-tight leading-tight">
                  {(selectedProduct.ingredients ?? ['Bahan Premium']).join(' + ')}
                </div>
              </div>
            </div>

            {/* SISI KANAN (7 Kolom): Detail Menu, Grid Kotak Bahan-Bahan, & Tombol Pesan */}
            <div className="md:col-span-7 p-5 sm:p-7 flex flex-col justify-between space-y-5 bg-[#FFFDF9]">
              <div className="space-y-4">
                {/* Header Kanan */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-black text-xl sm:text-2xl text-[#3B2618] leading-tight">
                      {selectedProduct.name}
                    </h3>
                    <p className="font-extrabold text-lg text-[#5C3A21] mt-1">
                      {formatRupiah(selectedProduct.price)}
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

                {/* Grid Kotak Komposisi Bahan Utama (Gaya Grid Komposisi Kopi Tuku) */}
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
                        className="p-3 border-r border-b border-[#C8B197] flex flex-col items-center justify-center text-center gap-1.5 hover:bg-[#F2E8DC] transition-colors min-h-[82px]"
                      >
                        <div className="w-9 h-9 rounded-full bg-white border border-[#E6D8C7] flex items-center justify-center shadow-2xs">
                          {getIngredientIcon(ing)}
                        </div>
                        <span className="font-mono text-[10px] font-bold uppercase tracking-tight text-[#3B2618] leading-tight">
                          {ing}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer Modal: Pilih Produk Lain Cepat & Tombol Tambah Keranjang */}
              <div className="pt-4 border-t border-[#EADFD3] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 overflow-x-auto max-w-full sm:max-w-[55%] pb-1 scrollbar-none">
                  {filteredProducts.slice(0, 5).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedProduct(p)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap border transition ${
                        p.id === selectedProduct.id
                          ? 'bg-[#5C3A21] text-white border-[#5C3A21]'
                          : 'bg-white text-[#5C3A21] border-[#EADFD3] hover:bg-[#FAF6F0]'
                      }`}
                    >
                      {p.emoji} {p.name.split(' ')[0]}
                    </button>
                  ))}
                </div>

                {selectedInCart ? (
                  <div className="inline-flex items-center gap-2.5 bg-[#FAF6F0] border border-[#D8C2A8] rounded-xl px-3 py-1.5">
                    <button
                      type="button"
                      onClick={() => onUpdateQuantity(selectedProduct.id, -1)}
                      className="w-7 h-7 rounded-lg bg-white text-[#5C3A21] flex items-center justify-center font-bold hover:bg-[#E6D8C7]"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-extrabold min-w-[20px] text-center text-[#3B2618]">
                      {selectedInCart.quantity} di Keranjang
                    </span>
                    <button
                      type="button"
                      onClick={() => onUpdateQuantity(selectedProduct.id, 1)}
                      className="w-7 h-7 rounded-lg bg-[#5C3A21] text-white flex items-center justify-center font-bold hover:bg-[#462B18]"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onAddToCart(selectedProduct)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#5C3A21] text-white text-xs font-bold hover:bg-[#462B18] active:scale-95 transition-all shadow-sm"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>+ Tambah ke Keranjang</span>
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
