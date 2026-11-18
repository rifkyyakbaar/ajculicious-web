'use client';

import React, { useState } from 'react';
import {
  Plus,
  Check,
  Sparkles,
  Cookie,
  UtensilsCrossed,
  PackageCheck,
  Flame,
  MousePointerClick,
} from 'lucide-react';
import { TeamMember, Product, CategorySlug } from '../types/ajculicious';
import { formatRupiah } from '../utils/formatters';

interface HeroCounterProps {
  teamMembers: TeamMember[];
  activeMember: TeamMember;
  onSelectMember: (member: TeamMember) => void;
  products: Product[];
  onAddToCart: (product: Product) => void;
  onFilterCategory: (category: CategorySlug) => void;
  onOpenOrderTracker: () => void;
  addedToastProduct?: string | null;
  isTourHighlighted?: boolean;
}

export default function HeroCounter({
  teamMembers,
  onSelectMember,
  products,
  onAddToCart,
  onFilterCategory,
  onOpenOrderTracker,
  addedToastProduct,
  isTourHighlighted = false,
}: HeroCounterProps) {
  const [hoveredMemberId, setHoveredMemberId] = useState<string | null>(null);

  return (
    <div
      id="tour-hero-counter"
      className={`relative transition-all duration-300 ${
        isTourHighlighted
          ? 'z-40 ring-4 ring-amber-400 rounded-3xl shadow-2xl'
          : 'z-20'
      }`}
    >
      <div className="relative rounded-3xl border border-[#EADFD3] shadow-sm bg-white overflow-x-auto lg:overflow-visible">
        <div className="relative min-w-[850px] sm:min-w-[920px] w-full select-none">
          <img
            src="/images/storefront-counter.jpg"
            alt="Konter Interaktif AJCUlicious"
            width={1584}
            height={672}
            style={{ aspectRatio: '1584 / 672' }}
            className="w-full h-auto block rounded-3xl"
            loading="eager"
            fetchPriority="high"
          />

          {/* Area Interaktif Konter */}
          <button
            type="button"
            suppressHydrationWarning
            onClick={() => onFilterCategory('all')}
            style={{ left: '11.2%', top: '16.5%', width: '7.8%', height: '12%' }}
            className="absolute group bg-transparent focus:outline-none cursor-pointer z-20 flex items-center justify-center"
            aria-label="Lihat Menu"
          >
            <span className="opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-150 pointer-events-none bg-[#3B2618]/95 text-white text-[11px] font-semibold px-3 py-1 rounded-full shadow-md flex items-center gap-1 whitespace-nowrap">
              <MousePointerClick className="w-3 h-3 text-amber-300" />
              <span>Lihat Menu</span>
            </span>
          </button>

          <button
            type="button"
            suppressHydrationWarning
            onClick={() => onFilterCategory('all')}
            style={{ left: '29.8%', top: '9%', width: '26.2%', height: '20.5%' }}
            className="absolute group bg-transparent focus:outline-none cursor-pointer z-20 flex items-center justify-center"
            aria-label="Lihat Katalog Menu"
          >
            <span className="opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-150 pointer-events-none bg-[#3B2618]/95 text-white text-[11px] font-semibold px-3 py-1 rounded-full shadow-md flex items-center gap-1 whitespace-nowrap">
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span>Lihat Semua Menu</span>
            </span>
          </button>

          <button
            type="button"
            suppressHydrationWarning
            onClick={() => onFilterCategory('dubai-cookies')}
            style={{ left: '18.8%', top: '48.5%', width: '22%', height: '24%' }}
            className="absolute group bg-transparent focus:outline-none cursor-pointer z-20 flex items-center justify-center"
            aria-label="Menu Cookies"
          >
            <span className="opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-150 pointer-events-none bg-[#3B2618]/95 text-white text-[11px] font-semibold px-3 py-1 rounded-full shadow-md flex items-center gap-1 whitespace-nowrap">
              <Cookie className="w-3 h-3 text-amber-300" />
              <span>Menu Cookies</span>
            </span>
          </button>

          <button
            type="button"
            suppressHydrationWarning
            onClick={() => onFilterCategory('dimsum')}
            style={{ left: '53.8%', top: '56%', width: '11.5%', height: '17%' }}
            className="absolute group bg-transparent focus:outline-none cursor-pointer z-20 flex items-center justify-center"
            aria-label="Menu Dimsum"
          >
            <span className="opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-150 pointer-events-none bg-[#3B2618]/95 text-white text-[11px] font-semibold px-3 py-1 rounded-full shadow-md flex items-center gap-1 whitespace-nowrap">
              <UtensilsCrossed className="w-3 h-3 text-amber-300" />
              <span>Menu Dimsum</span>
            </span>
          </button>

          <button
            type="button"
            suppressHydrationWarning
            onClick={onOpenOrderTracker}
            style={{ left: '66%', top: '49%', width: '19%', height: '23%' }}
            className="absolute group bg-transparent focus:outline-none cursor-pointer z-20 flex items-center justify-center"
            aria-label="Cek Pesanan"
          >
            <span className="opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-150 pointer-events-none bg-[#3B2618]/95 text-white text-[11px] font-semibold px-3 py-1 rounded-full shadow-md flex items-center gap-1 whitespace-nowrap">
              <PackageCheck className="w-3 h-3 text-amber-300" />
              <span>Cek Pesanan</span>
            </span>
          </button>

          <button
            type="button"
            suppressHydrationWarning
            onClick={() => onFilterCategory('brownies')}
            style={{ left: '85.5%', top: '46.5%', width: '13.8%', height: '25.5%' }}
            className="absolute group bg-transparent focus:outline-none cursor-pointer z-20 flex items-center justify-center"
            aria-label="Menu Brownies"
          >
            <span className="opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-150 pointer-events-none bg-[#3B2618]/95 text-white text-[11px] font-semibold px-3 py-1 rounded-full shadow-md flex items-center gap-1 whitespace-nowrap">
              <Flame className="w-3 h-3 text-amber-300" />
              <span>Menu Brownies</span>
            </span>
          </button>

          {/* Karakter Anggota Tim */}
          {teamMembers.map((member, index) => {
            const isHovered = hoveredMemberId === member.id;
            const favoriteSlugMap: Record<string, string> = {
              'team-1': 'classic-chocochip-cookie',
              'team-2': 'fudgy-shiny-crust-brownies',
              'team-3': 'dubai-chewy-cookies-pistachio',
              'team-4': 'dimsum-ayam-udang',
              'team-5': 'lotus-biscoff-dessert-box',
            };
            const favoriteProduct =
              products.find(
                (p) =>
                  p.id === member.favoriteProductId ||
                  p.slug === favoriteSlugMap[member.id]
              ) || products[index % Math.max(products.length, 1)];

            const bubblePositionClass =
              index === 0
                ? 'left-0'
                : index === teamMembers.length - 1
                ? 'right-0'
                : 'left-1/2 -translate-x-1/2';

            const tailPositionClass =
              index === 0
                ? 'left-10'
                : index === teamMembers.length - 1
                ? 'right-12'
                : 'left-1/2 -translate-x-1/2';

            return (
              <div
                key={member.id}
                style={{
                  left: member.left,
                  top: member.top,
                  width: member.width,
                  height: member.height,
                }}
                onMouseEnter={() => {
                  setHoveredMemberId(member.id);
                  onSelectMember(member);
                }}
                onMouseLeave={() => setHoveredMemberId(null)}
                onClick={() => {
                  setHoveredMemberId((prev) =>
                    prev === member.id ? null : member.id
                  );
                  onSelectMember(member);
                }}
                className={`absolute cursor-pointer select-none ${
                  isHovered ? 'z-30' : 'z-10'
                }`}
              >
                {isHovered && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className={`absolute bottom-full pb-2.5 ${bubblePositionClass} w-72 sm:w-80 z-40 animate-in fade-in zoom-in-95 duration-150`}
                  >
                    <div className="relative bg-white border border-[#D8C2A8] rounded-2xl p-3 shadow-xl text-left space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-xs text-[#3B2618]">
                          {member.name}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FAF6F0] text-[#7D5E46] font-medium border border-[#EADFD3]">
                          {member.role}
                        </span>
                      </div>

                      <p className="text-xs text-[#5C3A21] leading-relaxed">
                        &ldquo;{member.greeting}&rdquo;
                      </p>

                      {favoriteProduct && (
                        <div className="pt-1.5 border-t border-[#F2E8DC] flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-bold text-[11px] text-[#3B2618] truncate">
                              {favoriteProduct.name}
                            </p>
                            <span className="text-[10px] font-semibold text-[#7D5E46]">
                              {formatRupiah(favoriteProduct.price)}
                            </span>
                          </div>

                          <button
                            type="button"
                            suppressHydrationWarning
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddToCart(favoriteProduct);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-[#5C3A21] text-white text-[10px] font-bold hover:bg-[#462B18] active:scale-95 transition-all shrink-0"
                          >
                            {addedToastProduct === favoriteProduct.id
                              ? 'Ditambah'
                              : '+ Tambah'}
                          </button>
                        </div>
                      )}

                      <div
                        className={`w-3 h-3 bg-white border-r border-b border-[#D8C2A8] rotate-45 absolute -bottom-1.5 ${tailPositionClass}`}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
