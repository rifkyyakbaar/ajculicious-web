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
      className={`bg-white border border-[#EADFD3] rounded-2xl px-3.5 sm:px-4 py-2.5 shadow-2xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 text-[11px] sm:text-xs transition-all duration-300 ${
        isTourHighlighted
          ? 'relative z-[58] ring-4 ring-amber-400 shadow-xl'
          : ''
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-semibold border text-[11px] shrink-0 ${
            batchConfig.isOpen
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-rose-50 text-rose-700 border-rose-200'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              batchConfig.isOpen
                ? 'bg-emerald-500 animate-pulse'
                : 'bg-rose-500'
            }`}
          ></span>
          {batchConfig.isOpen ? 'Pre-Order Dibuka' : 'Pre-Order Ditutup'}
        </span>
        <span className="font-bold text-[#3B2618]">
          {batchConfig.batchName.replace(/\s*\(Aktif\)/i, '')}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5 text-[#7D5E46]">
        <span className="px-2.5 py-1 rounded-lg bg-[#FAF6F0] border border-[#EADFD3]">
          Batas Order:{' '}
          <strong className="text-[#3B2618]">{batchConfig.orderDeadline}</strong>
        </span>

        <span className="px-2.5 py-1 rounded-lg bg-[#FAF6F0] border border-[#EADFD3]">
          Ambil:{' '}
          <strong className="text-[#3B2618]">
            {batchConfig.readyPickupDate} ({batchConfig.readyPickupTime})
          </strong>
        </span>

        <span className="px-2.5 py-1 rounded-lg bg-[#FAF6F0] border border-[#EADFD3]">
          Lokasi:{' '}
          <strong className="text-[#3B2618]">
            {batchConfig.pickupLocations?.[0] || 'Konter Kampus AJCUlicious'}
          </strong>
        </span>
      </div>
    </div>
  );
}
