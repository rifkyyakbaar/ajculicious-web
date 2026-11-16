'use client';

import React from 'react';
import { ChevronRight, Clock, MapPin, Calendar, Sparkles, Search } from 'lucide-react';
import { BatchPOConfig } from '../types/ajculicious';

interface BannerOrderFlowProps {
  batchConfig: BatchPOConfig;
  onOpenOrderTracker: () => void;
}

export default function BannerOrderFlow({
  batchConfig,
  onOpenOrderTracker,
}: BannerOrderFlowProps) {
  return (
    <div className="space-y-3">
      {/* 3-Step Sequential Order Flow Card */}
      <div className="bg-[#FFFDF9] border border-[#E6D8C7] rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#FEF3C7] text-[#92400E] flex items-center justify-center font-bold shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs sm:text-sm font-bold text-[#3B2618]">
              Alur Pemesanan Cepat Tanpa Antre
            </p>
            <p className="text-[11px] sm:text-xs text-[#7D5E46]">
              Pilih menu langsung di konter kartun atau katalog di bawah, konfirmasi WA, lalu ambil di kampus.
            </p>
          </div>
        </div>

        {/* 3 Step Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] sm:text-xs w-full lg:w-auto justify-start sm:justify-end">
          <span className="px-3 py-1.5 rounded-full bg-[#F2E8DC] text-[#5C3A21] font-semibold border border-[#E6D8C7]/60">
            1. Pilih Menu di Konter
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-[#9C7A5E] shrink-0" />
          <span className="px-3 py-1.5 rounded-full bg-[#F2E8DC] text-[#5C3A21] font-semibold border border-[#E6D8C7]/60">
            2. Isi Nama &amp; COD/QRIS
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-[#9C7A5E] shrink-0" />
          {/* Highlight pill hijau mint lembut (#DCFCE7 / #166534) */}
          <span className="px-3 py-1.5 rounded-full bg-[#DCFCE7] text-[#166534] font-bold border border-emerald-300 shadow-2xs">
            3. Redirect WA &amp; Ambil di Kampus
          </span>
        </div>
      </div>

      {/* Baris Info Batch PO Berjalan & Jadwal Ready to Pick Up */}
      <div className="bg-gradient-to-r from-[#5C3A21] via-[#6E4628] to-[#5C3A21] text-white rounded-2xl px-4 py-2.5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-400/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            {batchConfig.batchName} ({batchConfig.isOpen ? 'Open PO Aktif' : 'PO Ditutup'})
          </span>

          <span className="inline-flex items-center gap-1 text-[#FEF3C7]">
            <Clock className="w-3.5 h-3.5" />
            <span>Batas Order: <strong>{batchConfig.orderDeadline}</strong></span>
          </span>

          <span className="hidden sm:inline text-white/40">&bull;</span>

          <span className="inline-flex items-center gap-1 text-white/90">
            <Calendar className="w-3.5 h-3.5 text-amber-300" />
            <span>Ready to Pick Up: <strong>{batchConfig.readyPickupDate} ({batchConfig.readyPickupTime})</strong></span>
          </span>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
          <span className="inline-flex items-center gap-1 text-xs text-[#F2E8DC]">
            <MapPin className="w-3.5 h-3.5 text-rose-300" />
            <span className="hidden lg:inline">Titik Utama:</span> Gazebo Teknik &amp; Lobi Perpus
          </span>
          <button
            type="button"
            suppressHydrationWarning
            onClick={onOpenOrderTracker}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-[#FEF3C7] hover:text-white transition text-[11px] font-semibold border border-white/20"
          >
            <Search className="w-3 h-3" />
            <span>Lacak Pesanan Saya &rarr;</span>
          </button>
        </div>
      </div>
    </div>
  );
}
