'use client';

import React from 'react';
import { BatchPOConfig } from '../types/ajculicious';

interface BannerOrderFlowProps {
  batchConfig: BatchPOConfig;
  isTourHighlighted?: boolean;
}

export default function BannerOrderFlow({
  batchConfig,
  isTourHighlighted = false,
}: BannerOrderFlowProps) {
  return (
    <div
      id="tour-batch-info"
      className={`bg-white border border-[#EADFD3] rounded-2xl px-4 py-2.5 shadow-2xs flex flex-wrap items-center justify-between gap-2 text-xs transition-all duration-300 ${
        isTourHighlighted
          ? 'relative z-40 ring-4 ring-amber-400 shadow-xl'
          : ''
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200 text-[11px]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          {batchConfig.isOpen ? 'Pre-Order Dibuka' : 'Pre-Order Ditutup'}
        </span>
        <span className="font-bold text-[#3B2618]">
          {batchConfig.batchName.replace(/\s*\(Aktif\)/i, '')}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 sm:gap-3.5 text-[#7D5E46]">
        <div>
          <span>
            Batas Order:{' '}
            <strong className="text-[#3B2618]">{batchConfig.orderDeadline}</strong>
          </span>
        </div>

        <span className="hidden sm:inline text-[#D8C2A8]">|</span>

        <div className="px-2.5 py-1 rounded-lg bg-[#FAF6F0] border border-[#EADFD3]">
          <span>
            Jadwal &amp; Jam Pengambilan:{' '}
            <strong className="text-[#3B2618]">
              {batchConfig.readyPickupDate} ({batchConfig.readyPickupTime})
            </strong>
          </span>
        </div>
      </div>
    </div>
  );
}
