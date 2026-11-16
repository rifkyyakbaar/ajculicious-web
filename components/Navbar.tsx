'use client';

import React from 'react';
import {
  Eye,
  EyeOff,
  Store,
  ShoppingBag,
} from 'lucide-react';
import { formatRupiah } from '../utils/formatters';

interface NavbarProps {
  showHotspots: boolean;
  onToggleHotspots: () => void;
  onScrollToMenu: () => void;
  cartItemCount: number;
  cartTotalPrice: number;
  onOpenCart: () => void;
}

export default function Navbar({
  showHotspots,
  onToggleHotspots,
  onScrollToMenu,
  cartItemCount,
  cartTotalPrice,
  onOpenCart,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 bg-[#FAF6F0]/95 backdrop-blur-md border-b border-[#E6D8C7] px-3 sm:px-6 py-2.5 sm:py-3 shadow-xs transition-all">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        {/* Brand Identity: Left Header */}
        <div className="flex items-center gap-3">
          {/* Logo Lingkaran Cokelat Tua "AJC" */}
          <div className="w-11 h-11 rounded-full bg-[#5C3A21] text-[#FAF6F0] flex items-center justify-center font-black text-lg shadow-sm shrink-0 border-2 border-[#E6D8C7]">
            AJC
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl sm:text-2xl tracking-tight text-[#3B2618]">
                AJCUlicious
              </span>
              {/* Badge Pill "Ambil di Kampus" */}
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#F2E8DC] text-[#5C3A21] font-semibold border border-[#E6D8C7]">
                Ambil di Kampus
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#7D5E46] font-medium leading-none mt-0.5">
              Cookies, Dubai Chewy Cookies, Brownies &amp; Dimsum Hangat
            </p>
          </div>
        </div>

        {/* 3 Tombol Pill Navigasi Fokus Pengalaman Belanja Pembeli */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-start md:justify-end">
          {/* Button 1: Toggle Hotspot */}
          <button
            type="button"
            suppressHydrationWarning
            onClick={onToggleHotspots}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold border border-[#E6D8C7] bg-[#FFFDF9] text-[#5C3A21] hover:bg-[#F2E8DC] transition-all shadow-2xs"
            title={showHotspots ? 'Sembunyikan Pin Hotspot Konter' : 'Tampilkan Pin Hotspot Konter'}
          >
            {showHotspots ? (
              <>
                <EyeOff className="w-3.5 h-3.5 text-[#5C3A21]" />
                <span className="hidden xs:inline">Sembunyikan Hotspot</span>
                <span className="xs:hidden">Hotspot Off</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5 text-[#5C3A21]" />
                <span className="hidden xs:inline">Tampilkan Hotspot</span>
                <span className="xs:hidden">Hotspot On</span>
              </>
            )}
          </button>

          {/* Button 2: Menu Lengkap (Smooth Scroll to Catalog) */}
          <button
            type="button"
            suppressHydrationWarning
            onClick={onScrollToMenu}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold border border-[#E6D8C7] bg-[#FFFDF9] text-[#5C3A21] hover:bg-[#F2E8DC] transition-all shadow-2xs"
          >
            <Store className="w-3.5 h-3.5 text-[#5C3A21]" />
            <span>Menu Lengkap</span>
          </button>

          {/* Button 3: Solid Espresso Brown Pill Keranjang (Count) | RpTotal */}
          <button
            type="button"
            suppressHydrationWarning
            onClick={onOpenCart}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold bg-[#5C3A21] text-white hover:bg-[#462B18] transition-all shadow-sm group active:scale-95"
          >
            <ShoppingBag className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
            <span>Keranjang ({cartItemCount})</span>
            {cartTotalPrice > 0 && (
              <span className="pl-1.5 border-l border-white/20 text-[#FEF3C7] font-semibold">
                {formatRupiah(cartTotalPrice)}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
