'use client';

import React, { useState } from 'react';
import { Menu, X, ShoppingBag } from 'lucide-react';
import { formatRupiah } from '../utils/formatters';

interface NavbarProps {
  onOpenTour: () => void;
  onOpenOrderTracker: () => void;
  cartItemCount: number;
  cartTotalPrice: number;
  onOpenCart: () => void;
  isTourHighlighted?: boolean;
  onTriggerSwarm?: () => void;
}

export default function Navbar({
  onOpenTour,
  onOpenOrderTracker,
  cartItemCount,
  cartTotalPrice,
  onOpenCart,
  isTourHighlighted = false,
  onTriggerSwarm,
}: NavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header
      className={`sticky top-0 bg-[#FAF6F0]/95 backdrop-blur-md border-b border-[#EADFD3] px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3 transition-all ${
        isTourHighlighted ? 'z-[58]' : 'z-40'
      }`}
    >
      <div className="w-full flex items-center justify-between gap-3">
        {/* Identitas Brand + Logo Lingkaran */}
        <div
          onClick={onTriggerSwarm}
          className="flex items-center gap-2 sm:gap-2.5 group cursor-pointer shrink-0"
          title="Klik logo untuk memutar animasi Swarm Rebuild"
        >
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white border border-[#EADFD3] overflow-hidden flex items-center justify-center shadow-2xs shrink-0 group-hover:scale-105 transition-transform">
            <img
              src="/images/logo-ajculicious.jpg"
              alt="Logo AJCUlicious"
              className="w-full h-full object-cover"
            />
          </div>
          <span className="font-extrabold text-base sm:text-xl tracking-tight text-[#3B2618] whitespace-nowrap">
            AJCUlicious
          </span>
        </div>

        {/* Navigasi Desktop (sm+) */}
        <div
          id="tour-cart-nav"
          className={`flex items-center gap-1.5 sm:gap-2 transition-all duration-300 ${
            isTourHighlighted
              ? 'ring-4 ring-amber-400 bg-[#FFFDF9] p-1 rounded-full shadow-xl'
              : ''
          }`}
        >
          <button
            type="button"
            suppressHydrationWarning
            onClick={onOpenTour}
            className="hidden sm:inline-flex px-3 py-2 rounded-full text-xs font-medium text-[#5C3A21] hover:bg-[#F2E8DC] transition-colors whitespace-nowrap"
            title="Panduan Cara Pesan"
          >
            Panduan
          </button>

          <button
            type="button"
            suppressHydrationWarning
            onClick={onOpenOrderTracker}
            className="hidden sm:inline-flex px-3.5 py-2 rounded-full text-xs font-semibold border border-[#E6D8C7] bg-white text-[#3B2618] hover:bg-[#F2E8DC] transition-colors whitespace-nowrap"
          >
            Cek Pesanan
          </button>

          <button
            type="button"
            suppressHydrationWarning
            onClick={() => {
              setIsMobileMenuOpen(false);
              onOpenCart();
            }}
            className="inline-flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 rounded-full text-xs font-bold bg-[#5C3A21] text-white hover:bg-[#462B18] transition-all shadow-2xs active:scale-95 whitespace-nowrap"
          >
            <ShoppingBag className="w-3.5 h-3.5 sm:hidden" />
            <span className="sm:hidden">{cartItemCount}</span>
            <span className="hidden sm:inline">
              Keranjang ({cartItemCount})
            </span>
            {cartTotalPrice > 0 && (
              <span className="hidden md:inline pl-1.5 border-l border-white/20 text-[#FEF3C7] font-semibold">
                {formatRupiah(cartTotalPrice)}
              </span>
            )}
          </button>

          {/* Hamburger Menu Khusus Layar Mobile (< sm) */}
          <button
            type="button"
            suppressHydrationWarning
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            className="sm:hidden p-2 rounded-full border border-[#EADFD3] bg-white text-[#3B2618] hover:bg-[#F2E8DC] transition"
            aria-label={isMobileMenuOpen ? 'Tutup menu' : 'Buka menu'}
          >
            {isMobileMenuOpen ? (
              <X className="w-4 h-4" />
            ) : (
              <Menu className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Dropdown Menu Ringkas Khusus Mobile */}
      {isMobileMenuOpen && (
        <div className="sm:hidden mt-2.5 pt-2.5 border-t border-[#EADFD3] flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-150">
          <button
            type="button"
            onClick={() => {
              setIsMobileMenuOpen(false);
              onOpenTour();
            }}
            className="flex-1 py-2 px-3 rounded-xl border border-[#EADFD3] bg-white text-xs font-semibold text-[#5C3A21] hover:bg-[#F2E8DC] transition text-center"
          >
            Panduan Pesan
          </button>
          <button
            type="button"
            onClick={() => {
              setIsMobileMenuOpen(false);
              onOpenOrderTracker();
            }}
            className="flex-1 py-2 px-3 rounded-xl border border-[#EADFD3] bg-white text-xs font-semibold text-[#3B2618] hover:bg-[#F2E8DC] transition text-center"
          >
            Cek Pesanan
          </button>
        </div>
      )}
    </header>
  );
}
