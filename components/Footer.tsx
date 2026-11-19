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
    <footer className="mt-12 bg-white border-t border-[#EADFD3] py-6 text-[#462B18]">
      <div className="w-full px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-white border border-[#EADFD3] overflow-hidden flex items-center justify-center shrink-0">
            <img
              src="/images/logo-ajculicious.jpg"
              alt="Logo AJCUlicious"
              className="w-full h-full object-cover"
            />
          </div>
          <span className="font-bold text-sm text-[#3B2618]">
            AJCUlicious
          </span>
          <span className="text-[#8C6D53]">
            &bull; Homemade Cookies, Brownies &amp; Dimsum
          </span>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={`https://wa.me/${OFFICIAL_INFO.whatsappNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700 transition"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>WhatsApp Admin</span>
          </a>

          <button
            type="button"
            suppressHydrationWarning
            onClick={onOpenAdminLogin}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#EADFD3] bg-[#FAF6F0] text-[#5C3A21] hover:bg-[#5C3A21] hover:text-white text-xs font-semibold transition"
          >
            <Lock className="w-3 h-3" />
            <span>Admin</span>
          </button>
        </div>
      </div>
    </footer>
  );
}
