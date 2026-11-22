'use client';

import React from 'react';
import {
  MessageCircle,
  Lock,
} from 'lucide-react';
import { OFFICIAL_INFO } from '../data/initial_data';

interface FooterProps {
  onOpenAdminLogin: () => void;
}

export default function Footer({ onOpenAdminLogin }: FooterProps) {
  return (
    <footer className="mt-10 bg-white border-t border-[#EADFD3] py-4 sm:py-5 text-[#462B18]">
      <div className="w-full px-3 sm:px-6 lg:px-8 flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
          <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-white border border-[#EADFD3] overflow-hidden flex items-center justify-center shrink-0">
            <img
              src="/images/logo-ajculicious.jpg"
              alt="Logo AJCUlicious"
              className="w-full h-full object-cover"
            />
          </div>
          <span className="font-bold text-xs sm:text-sm text-[#3B2618] whitespace-nowrap">
            AJCUlicious
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <a
            href={`https://wa.me/${OFFICIAL_INFO.whatsappNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-semibold text-[11px] sm:text-xs hover:bg-emerald-700 transition whitespace-nowrap"
          >
            <MessageCircle className="w-3.5 h-3.5 shrink-0" />
            <span>WhatsApp Admin</span>
          </a>

          <button
            type="button"
            suppressHydrationWarning
            onClick={onOpenAdminLogin}
            className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-[#EADFD3] bg-[#FAF6F0] text-[#5C3A21] hover:bg-[#5C3A21] hover:text-white text-[11px] sm:text-xs font-semibold transition whitespace-nowrap"
          >
            <Lock className="w-3 h-3 shrink-0" />
            <span>Admin</span>
          </button>
        </div>
      </div>
    </footer>
  );
}
