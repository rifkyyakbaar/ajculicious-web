'use client';

import React, { useState } from 'react';
import {
  Plus,
  Minus,
  Search,
  Sparkles,
  AlertCircle,
  PackageCheck,
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
}

const CATEGORIES: { id: CategorySlug; label: string }[] = [
  { id: 'all', label: 'Semua Menu' },
  { id: 'dubai-cookies', label: 'Dubai Chewy Cookies' },
  { id: 'cookies', label: 'Soft Cookies' },
  { id: 'brownies', label: 'Fudgy Brownies' },
  { id: 'dessert-box', label: 'Dessert Box' },
  { id: 'dimsum', label: 'Dimsum Hangat' },
];

export default function ProductCatalog({
  products,
  activeCategory,
  onSelectCategory,
  cart,
  onAddToCart,
  onUpdateQuantity,
}: ProductCatalogProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProducts = products.filter((product) => {
    if (!product.isActive) return false;
    const matchesCategory =
      activeCategory === 'all' || product.category === activeCategory;
    const matchesSearch =
      searchQuery.trim() === '' ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.categoryLabel.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <section id="katalog-menu" className="space-y-5 pt-3 scroll-mt-24">
      {/* Catalog Header */}
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-6 rounded-full bg-[#5C3A21]"></span>
            <h2 className="text-xl sm:text-2xl font-black text-[#3B2618] tracking-tight">
              Katalog Menu AJCUlicious
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-[#7D5E46] mt-1">
            Semua menu diproduksi segar dan siap diambil langsung di kampus (COD / QRIS Statis).
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-[#8C6D53] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            suppressHydrationWarning
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari cookies, brownies, dimsum..."
            className="w-full pl-9 pr-4 py-2 rounded-full border border-[#E6D8C7] bg-[#FFFDF9] text-xs text-[#3B2618] focus:outline-none focus:ring-2 focus:ring-[#5C3A21] placeholder:text-[#9C7A5E] shadow-2xs"
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

      {/* Tab Filter Kategori (Pill Shape, Active: Solid Dark Brown #5C3A21) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              suppressHydrationWarning
              onClick={() => onSelectCategory(cat.id)}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all shadow-2xs ${
                isActive
                  ? 'bg-[#5C3A21] text-white shadow-sm ring-2 ring-[#5C3A21]/30 scale-105'
                  : 'bg-[#FFFDF9] text-[#5C3A21] border border-[#E6D8C7] hover:bg-[#F2E8DC]'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Grid Produk: 2 Kolom di Desktop/Tablet, 1 Kolom di Mobile (Persis Referensi Gambar 2 & 3) */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-12 bg-[#FFFDF9] border border-[#E6D8C7] rounded-3xl p-6">
          <p className="text-base font-bold text-[#3B2618]">
            Tidak ada menu yang sesuai dengan pencarian &ldquo;{searchQuery}&rdquo;
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              onSelectCategory('all');
            }}
            className="mt-3 px-4 py-2 rounded-full bg-[#5C3A21] text-white text-xs font-semibold hover:bg-[#462B18]"
          >
            Tampilkan Semua Menu
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {filteredProducts.map((product) => {
            const inCart = cart.find((c) => c.product.id === product.id);
            const isSoldOut = product.stockQuota <= 0;

            return (
              <article
                key={product.id}
                className="bg-[#FFFDF9] border border-[#E6D8C7] rounded-3xl p-4 sm:p-5 flex flex-col justify-between shadow-xs hover:shadow-md transition-all duration-200 group relative"
              >
                <div>
                  {/* Bagian Atas: Ikon Produk & Badge Kategori + Keunggulan + Kuota */}
                  <div className="flex items-start justify-between gap-3">
                    {/* Ikon Produk */}
                    <div className="w-12 h-12 rounded-2xl bg-[#F2E8DC] border border-[#E6D8C7] flex items-center justify-center text-2xl shadow-2xs group-hover:scale-105 transition-transform">
                      {product.emoji}
                    </div>

                    {/* Badge Kanan Atas */}
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      {/* Badge Kategori */}
                      <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#F2E8DC] text-[#5C3A21] font-semibold border border-[#E6D8C7]/50">
                        {product.categoryLabel}
                      </span>

                      {/* Badges Keunggulan: Favorit Kampus / Premium Ingredient */}
                      {product.badges.map((badge, idx) => (
                        <span
                          key={idx}
                          className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] font-semibold border border-amber-300/40"
                        >
                          {badge}
                        </span>
                      ))}

                      {/* Indikator Kuota Real-Time */}
                      {isSoldOut ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold border border-rose-200">
                          Sold Out
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium border border-emerald-200 flex items-center gap-1">
                          <PackageCheck className="w-3 h-3 text-emerald-600" />
                          Sisa {product.stockQuota} kuota
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Nama Produk Tebal */}
                  <h3 className="font-extrabold text-base sm:text-lg text-[#3B2618] mt-3 group-hover:text-[#5C3A21] transition-colors">
                    {product.name}
                  </h3>

                  {/* Deskripsi Singkat yang Menggugah Selera */}
                  <p className="text-xs text-[#6E523D] mt-1.5 leading-relaxed line-clamp-2">
                    {product.description}
                  </p>
                </div>

                {/* Bagian Bawah: Label "Harga Kampus" + Harga Tebal & Tombol Pesan/Stepper */}
                <div className="mt-4 pt-3.5 border-t border-[#E6D8C7]/60 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] text-[#8C6D53] block leading-none font-medium">
                      Harga Kampus
                    </span>
                    <span className="font-black text-lg sm:text-xl text-[#3B2618] tracking-tight">
                      {formatRupiah(product.price)}
                    </span>
                  </div>

                  {/* Tombol Interaktif */}
                  {isSoldOut ? (
                    <button
                      type="button"
                      disabled
                      suppressHydrationWarning
                      className="px-4 py-2 rounded-2xl bg-stone-200 text-stone-500 text-xs font-bold cursor-not-allowed border border-stone-300"
                    >
                      Sold Out / Kuota Penuh
                    </button>
                  ) : inCart ? (
                    /* Tombol Stepper Jumlah (- [angka] +) dengan bg beige */
                    <div className="inline-flex items-center gap-2 bg-[#F2E8DC] border border-[#E6D8C7] rounded-2xl px-2 py-1 shadow-2xs">
                      <button
                        type="button"
                        suppressHydrationWarning
                        onClick={() => onUpdateQuantity(product.id, -1)}
                        className="w-7 h-7 rounded-xl bg-white text-[#5C3A21] flex items-center justify-center hover:bg-[#E6D8C7] active:scale-90 transition font-bold shadow-2xs"
                        aria-label={`Kurangi ${product.name}`}
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>

                      <span className="text-xs font-black min-w-[24px] text-center text-[#3B2618]">
                        {inCart.quantity}
                      </span>

                      <button
                        type="button"
                        suppressHydrationWarning
                        onClick={() => onUpdateQuantity(product.id, 1)}
                        disabled={inCart.quantity >= product.stockQuota}
                        className="w-7 h-7 rounded-xl bg-[#5C3A21] text-white flex items-center justify-center hover:bg-[#462B18] active:scale-90 disabled:opacity-40 transition font-bold shadow-2xs"
                        aria-label={`Tambah ${product.name}`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    /* Tombol Solid Cokelat "+ Pesan" */
                    <button
                      type="button"
                      suppressHydrationWarning
                      onClick={() => onAddToCart(product)}
                      className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2.5 rounded-2xl bg-[#5C3A21] text-white text-xs sm:text-sm font-bold hover:bg-[#462B18] active:scale-95 transition-all shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                      <span>+ Pesan</span>
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
