'use client';

import React from 'react';
import {
  ShoppingBag,
  Search,
  HelpCircle,
} from 'lucide-react';
import { formatRupiah } from '../utils/formatters';

interface NavbarProps {
  onOpenTour: () => void;
  onOpenOrderTracker: () => void;
  cartItemCount: number;
  cartTotalPrice: number;
  onOpenCart: () => void;
  isTourHighlighted?: boolean;
}

export default function Navbar({
  onOpenTour,
  onOpenOrderTracker,
  cartItemCount,
  cartTotalPrice,
  onOpenCart,
  isTourHighlighted = false,
}: NavbarProps) {
  return (
    <header
      className={`sticky top-0 bg-[#FAF6F0]/90 backdrop-blur-md border-b border-[#EADFD3] px-4 sm:px-8 py-3 transition-all ${
        isTourHighlighted ? 'z-50' : 'z-40'
      }`}
    >
      <div className="w-full max-w-[1600px] mx-auto flex items-center justify-between gap-3">
        {/* Clean Brand Identity */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#5C3A21] text-[#FAF6F0] flex items-center justify-center font-black text-sm shadow-2xs shrink-0">
            AJC
          </div>
          <span className="font-extrabold text-lg sm:text-xl tracking-tight text-[#3B2618]">
            AJCUlicious
          </span>
        </div>

        {/* Clean Navigation Actions */}
        <div
          id="tour-cart-nav"
          className={`flex items-center gap-2 transition-all duration-300 ${
            isTourHighlighted
              ? 'ring-4 ring-amber-400 bg-[#FFFDF9] p-1 rounded-full shadow-xl'
              : ''
          }`}
        >
          <button
            type="button"
            suppressHydrationWarning
            onClick={onOpenTour}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium text-[#5C3A21] hover:bg-[#F2E8DC] transition-colors"
            title="Panduan Cara Pesan"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Panduan</span>
          </button>

          <button
            type="button"
            suppressHydrationWarning
            onClick={onOpenOrderTracker}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold border border-[#E6D8C7] bg-white text-[#3B2618] hover:bg-[#F2E8DC] transition-colors"
          >
            <Search className="w-3.5 h-3.5 text-[#5C3A21]" />
            <span>Cek Pesanan</span>
          </button>

          <button
            type="button"
            suppressHydrationWarning
            onClick={onOpenCart}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold bg-[#5C3A21] text-white hover:bg-[#462B18] transition-all shadow-2xs active:scale-95"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Keranjang ({cartItemCount})</span>
            {cartTotalPrice > 0 && (
              <span className="hidden sm:inline pl-1.5 border-l border-white/20 text-[#FEF3C7] font-semibold">
                {formatRupiah(cartTotalPrice)}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
