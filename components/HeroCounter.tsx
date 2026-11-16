'use client';

import React from 'react';
import {
  Users,
  Plus,
  Cookie,
  UtensilsCrossed,
  Sparkles,
  Flame,
  PackageCheck,
  Check,
} from 'lucide-react';
import { TeamMember, Product, CategorySlug } from '../types/ajculicious';
import { formatRupiah } from '../utils/formatters';

interface HeroCounterProps {
  teamMembers: TeamMember[];
  activeMember: TeamMember;
  onSelectMember: (member: TeamMember) => void;
  showHotspots: boolean;
  products: Product[];
  onAddToCart: (product: Product) => void;
  onFilterCategory: (category: CategorySlug) => void;
  onOpenOrderTracker: () => void;
  addedToastProduct?: string | null;
}

export default function HeroCounter({
  teamMembers,
  activeMember,
  onSelectMember,
  showHotspots,
  products,
  onAddToCart,
  onFilterCategory,
  onOpenOrderTracker,
  addedToastProduct,
}: HeroCounterProps) {
  const favoriteProduct = products.find(
    (p) => p.id === activeMember.favoriteProductId
  );

  return (
    <div className="space-y-4">
      {/* Container Ilustrasi Konter Flat-Vector dengan Scroll Horizontal Responsif */}
      <div className="relative rounded-3xl overflow-hidden border-2 border-[#E6D8C7] shadow-md bg-[#FAF6F0]">
        <div className="overflow-x-auto">
          <div className="relative min-w-[850px] sm:min-w-[920px] w-full select-none">
            {/* Foto Ilustrasi Kedai Konter Bakery AJCUlicious */}
            <img
              src="/images/storefront-counter.jpg"
              alt="Konter Interaktif AJCUlicious dengan Staf dan Etalase"
              className="w-full h-auto block"
              loading="eager"
            />

            {/* HOTSPOT 1: Papan "PESAN DI SINI" */}
            <button
              type="button"
              suppressHydrationWarning
              onClick={() => onFilterCategory('all')}
              style={{ left: '11.2%', top: '16.5%', width: '7.8%', height: '12%' }}
              className="absolute group focus:outline-none"
              title="Pilih menu di katalog"
            >
              <div
                className={`w-full h-full rounded-xl transition-all flex items-end justify-center p-1 ${
                  showHotspots
                    ? 'ring-2 ring-amber-500 bg-amber-400/20 hover:bg-amber-400/35'
                    : 'hover:ring-2 hover:ring-white/80 hover:bg-white/10'
                }`}
              >
                {showHotspots && (
                  <span className="translate-y-6 bg-[#5C3A21] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md whitespace-nowrap">
                    Pesan di Sini
                  </span>
                )}
              </div>
            </button>

            {/* HOTSPOT 2: Papan "MENU AJCULICIOUS" */}
            <button
              type="button"
              suppressHydrationWarning
              onClick={() => onFilterCategory('all')}
              style={{ left: '29.8%', top: '9%', width: '26.2%', height: '20.5%' }}
              className="absolute group focus:outline-none"
              title="Lihat Papan Menu AJCUlicious"
            >
              <div
                className={`w-full h-full rounded-xl transition-all flex items-center justify-center ${
                  showHotspots
                    ? 'ring-2 ring-amber-500 bg-amber-400/15 hover:bg-amber-400/30'
                    : 'hover:ring-2 hover:ring-white/80 hover:bg-white/10'
                }`}
              >
                {showHotspots && (
                  <span className="bg-[#5C3A21]/95 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1.5 border border-[#E6D8C7]/50">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    Papan Menu AJCUlicious
                  </span>
                )}
              </div>
            </button>

            {/* HOTSPOT 3: Etalase Kaca Cookies & Brownies */}
            <button
              type="button"
              suppressHydrationWarning
              onClick={() => onFilterCategory('dubai-cookies')}
              style={{ left: '18.8%', top: '48.5%', width: '22%', height: '24%' }}
              className="absolute group focus:outline-none"
              title="Buka Menu Cookies & Brownies"
            >
              <div
                className={`w-full h-full rounded-2xl transition-all flex items-center justify-center ${
                  showHotspots
                    ? 'ring-2 ring-amber-400 bg-amber-500/20 hover:bg-amber-500/35'
                    : 'hover:ring-2 hover:ring-amber-300 hover:bg-amber-500/10'
                }`}
              >
                {showHotspots && (
                  <span className="bg-[#5C3A21]/95 text-[#FEF3C7] text-xs font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1.5 border border-[#E6D8C7]/40">
                    <Cookie className="w-3.5 h-3.5 text-amber-300" />
                    Etalase Cookies &amp; Brownies
                  </span>
                )}
              </div>
            </button>

            {/* HOTSPOT 4: Kukusan Dimsum Bambu */}
            <button
              type="button"
              suppressHydrationWarning
              onClick={() => onFilterCategory('dimsum')}
              style={{ left: '53.8%', top: '56%', width: '11.5%', height: '17%' }}
              className="absolute group focus:outline-none"
              title="Buka Menu Dimsum Hangat"
            >
              <div
                className={`w-full h-full rounded-2xl transition-all flex items-center justify-center ${
                  showHotspots
                    ? 'ring-2 ring-orange-500 bg-orange-500/20 hover:bg-orange-500/35'
                    : 'hover:ring-2 hover:ring-orange-300 hover:bg-orange-500/10'
                }`}
              >
                {showHotspots && (
                  <span className="bg-[#7C2D12]/95 text-orange-100 text-xs font-bold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1">
                    <UtensilsCrossed className="w-3 h-3 text-orange-300" />
                    Kukusan Dimsum
                  </span>
                )}
              </div>
            </button>

            {/* HOTSPOT 5: Tumpukan Kotak Dus Kemasan AJCUlicious */}
            <button
              type="button"
              suppressHydrationWarning
              onClick={onOpenOrderTracker}
              style={{ left: '66%', top: '49%', width: '19%', height: '23%' }}
              className="absolute group focus:outline-none"
              title="Cek Status Box & Pickup Kampus"
            >
              <div
                className={`w-full h-full rounded-2xl transition-all flex items-center justify-center ${
                  showHotspots
                    ? 'ring-2 ring-sky-400 bg-sky-500/20 hover:bg-sky-500/35'
                    : 'hover:ring-2 hover:ring-sky-300 hover:bg-sky-500/10'
                }`}
              >
                {showHotspots && (
                  <span className="bg-[#0F172A]/90 text-sky-100 text-xs font-bold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1 border border-sky-300/30">
                    <PackageCheck className="w-3.5 h-3.5 text-sky-300" />
                    Box &amp; Cek Invoice
                  </span>
                )}
              </div>
            </button>

            {/* HOTSPOT 6: Oven Kue Kanan */}
            <button
              type="button"
              suppressHydrationWarning
              onClick={() => onFilterCategory('brownies')}
              style={{ left: '85.5%', top: '46.5%', width: '13.8%', height: '25.5%' }}
              className="absolute group focus:outline-none"
              title="Fresh dari Oven"
            >
              <div
                className={`w-full h-full rounded-2xl transition-all flex items-center justify-center ${
                  showHotspots
                    ? 'ring-2 ring-rose-400 bg-rose-500/20 hover:bg-rose-500/35'
                    : 'hover:ring-2 hover:ring-rose-300 hover:bg-rose-500/10'
                }`}
              >
                {showHotspots && (
                  <span className="bg-[#4C1D95]/90 text-rose-100 text-xs font-bold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1 border border-rose-300/30">
                    <Flame className="w-3.5 h-3.5 text-amber-300" />
                    Fresh dari Oven
                  </span>
                )}
              </div>
            </button>

            {/* HOTSPOTS 7-11: Karakter Anggota Tim (Tim #1 s.d. Tim #5) */}
            {teamMembers.map((member, index) => {
              const isSelected = activeMember?.id === member.id;
              return (
                <button
                  key={member.id}
                  type="button"
                  suppressHydrationWarning
                  onClick={() => onSelectMember(member)}
                  style={{
                    left: member.left,
                    top: member.top,
                    width: member.width,
                    height: member.height,
                  }}
                  className="absolute group focus:outline-none"
                  title={`Klik untuk sapa ${member.name}`}
                >
                  <div
                    className={`w-full h-full rounded-2xl transition-all flex items-start justify-center pt-1 ${
                      isSelected
                        ? 'ring-3 ring-white bg-white/30 shadow-lg'
                        : showHotspots
                        ? 'ring-2 ring-white/80 bg-white/10 hover:bg-white/25'
                        : 'hover:ring-2 hover:ring-white/80 hover:bg-white/15'
                    }`}
                  >
                    {(showHotspots || isSelected) && (
                      <span
                        className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full shadow-md transition-all ${
                          isSelected
                            ? 'bg-[#5C3A21] text-white scale-110 ring-2 ring-white'
                            : 'bg-white/95 text-[#5C3A21] hover:scale-105'
                        }`}
                      >
                        Tim #{index + 1}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* KARTU REKOMENDASI STAF (Tepat di Bawah Konter - Persis Sesuai Gambar 2) */}
      <div className="bg-[#FFFDF9] border border-[#E6D8C7] rounded-3xl p-4 sm:p-5 shadow-xs transition-all">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          {/* Sisi Kiri: Avatar & Info Anggota Tim */}
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#5C3A21] text-white flex items-center justify-center shrink-0 shadow-xs border border-[#E6D8C7]">
              <Users className="w-6 h-6 text-[#FAF6F0]" />
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-extrabold text-base text-[#3B2618]">
                  {activeMember.name}
                </span>
                {/* Badge Role (Beige #F2E8DC / text #5C3A21) */}
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#F2E8DC] text-[#5C3A21] font-semibold border border-[#E6D8C7]">
                  {activeMember.badge}
                </span>
                <span className="text-xs text-[#7D5E46]">
                  ({activeMember.description})
                </span>
              </div>

              {/* Kutipan Personal Staf */}
              <p className="text-sm text-[#462B18] italic leading-relaxed">
                &ldquo;{activeMember.greeting}&rdquo;
              </p>
            </div>
          </div>

          {/* Sisi Kanan: Kotak Inner Beige Rekomendasi Menu & Tombol Tambah */}
          {favoriteProduct && (
            <div className="w-full md:w-auto flex items-center justify-between gap-3 bg-[#F2E8DC] border border-[#E6D8C7] rounded-2xl px-4 py-3 shrink-0 shadow-2xs">
              <div className="text-xs pr-2">
                <span className="text-[#7D5E46] font-medium block">
                  Rekomendasi Menu:
                </span>
                <span className="font-bold text-sm text-[#3B2618]">
                  {favoriteProduct.emoji} {favoriteProduct.name}{' '}
                  <span className="text-[#5C3A21]">
                    ({formatRupiah(favoriteProduct.price)})
                  </span>
                </span>
              </div>

              <button
                type="button"
                suppressHydrationWarning
                onClick={() => onAddToCart(favoriteProduct)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#5C3A21] text-white text-xs font-bold hover:bg-[#462B18] active:scale-95 transition-all shadow-sm shrink-0"
              >
                {addedToastProduct === favoriteProduct.id ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Ditambahkan!</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>+ Tambah</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
