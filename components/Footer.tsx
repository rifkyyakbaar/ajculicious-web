'use client';

import React from 'react';
import {
  MessageCircle,
  MapPin,
  ShieldCheck,
  Lock,
  Heart,
  Search,
} from 'lucide-react';
import { OFFICIAL_INFO } from '../data/initial_data';

interface FooterProps {
  onOpenAdminLogin: () => void;
  onOpenBuyerTracker: () => void;
}

export default function Footer({ onOpenAdminLogin, onOpenBuyerTracker }: FooterProps) {
  return (
    <footer className="mt-12 bg-[#FAF6F0] border-t border-[#E6D8C7] pt-10 pb-8 text-[#462B18]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Brand Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-[#5C3A21] text-white flex items-center justify-center font-black text-base shadow-xs">
                AJC
              </div>
              <span className="font-black text-xl text-[#3B2618]">
                AJCUlicious
              </span>
            </div>
            <p className="text-xs text-[#7D5E46] leading-relaxed">
              Toko dessert dan camilan homemade sistem Pre-Order (PO) per Batch &amp; &ldquo;Ambil di Kampus&rdquo;. Menyediakan Soft Cookies, Dubai Chewy Cookies Pistachio, Fudgy Brownies, Dessert Box, dan Dimsum Hangat.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F2E8DC] text-[#5C3A21] text-[11px] font-semibold border border-[#E6D8C7]">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                <span>100% Homemade &amp; Halal</span>
              </div>
              <button
                type="button"
                suppressHydrationWarning
                onClick={onOpenBuyerTracker}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFFDF9] hover:bg-[#F2E8DC] text-[#5C3A21] text-[11px] font-bold border border-[#D8C2A8] transition shadow-2xs"
              >
                <Search className="w-3 h-3 text-[#5C3A21]" />
                <span>Lacak Pesanan Saya</span>
              </button>
            </div>
          </div>

          {/* Official WhatsApp Business Contact */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-sm text-[#3B2618] uppercase tracking-wider">
              Kontak WhatsApp Resmi
            </h4>
            <p className="text-xs text-[#7D5E46]">
              Konfirmasi pesanan PO dan pertanyaan seputar menu langsung ke admin kami:
            </p>
            <a
              href={`https://wa.me/${OFFICIAL_INFO.whatsappNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition shadow-xs"
            >
              <MessageCircle className="w-4 h-4" />
              <span>{OFFICIAL_INFO.whatsappDisplay}</span>
            </a>
            <p className="text-[11px] text-[#7D5E46]">
              Jam Operasional: Senin &ndash; Sabtu (08:00 &ndash; 21:00 WITA)
            </p>
          </div>

          {/* Official Bank Accounts */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-sm text-[#3B2618] uppercase tracking-wider">
              Rekening Pembayaran Resmi
            </h4>
            <div className="space-y-2 text-xs">
              {OFFICIAL_INFO.bankAccounts.map((bank) => (
                <div
                  key={bank.bankName}
                  className="p-2.5 rounded-xl bg-[#FFFDF9] border border-[#E6D8C7] space-y-0.5"
                >
                  <p className="font-bold text-[#3B2618]">{bank.bankName}</p>
                  <p className="font-mono font-black text-xs text-[#5C3A21]">
                    {bank.accountNumber}
                  </p>
                  <p className="text-[11px] text-[#7D5E46]">a.n. {bank.accountHolder}</p>
                </div>
              ))}
              <p className="text-[10px] text-[#8C6D53]">
                *Juga melayani pembayaran COD di Kampus &amp; QRIS Statis.
              </p>
            </div>
          </div>

          {/* Campus Pickup Locations */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-sm text-[#3B2618] uppercase tracking-wider">
              Titik Pengambilan Kampus
            </h4>
            <ul className="text-xs space-y-1.5 text-[#6E523D]">
              <li className="flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#5C3A21] shrink-0 mt-0.5" />
                <span>Gazebo Fakultas Teknik (Titik Kumpul Utama)</span>
              </li>
              <li className="flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#5C3A21] shrink-0 mt-0.5" />
                <span>Lobi Perpustakaan Pusat</span>
              </li>
              <li className="flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#5C3A21] shrink-0 mt-0.5" />
                <span>Kantin Fakultas Ekonomi &amp; Bisnis (FEB)</span>
              </li>
              <li className="flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#5C3A21] shrink-0 mt-0.5" />
                <span>Gedung Rektorat Lt. 1 &amp; Kurir Kampus</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Admin Panel Link */}
        <div className="pt-6 border-t border-[#E6D8C7] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#7D5E46]">
          <p className="flex items-center gap-1">
            &copy; 2026 <strong>AJCUlicious</strong>. Dibuat dengan{' '}
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 inline" /> untuk Teman Kampus.
          </p>

          <div className="flex items-center gap-3">
            <span className="text-[11px] text-[#9C7A5E]">
              Sistem PO Batch &bull; Ambil di Kampus
            </span>

            {/* Tombol Akses Login Admin (Pojok Kanan Bawah Sesuai Permintaan) */}
            <button
              type="button"
              suppressHydrationWarning
              onClick={onOpenAdminLogin}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#D8C2A8] bg-[#FFFDF9] text-[#5C3A21] hover:bg-[#5C3A21] hover:text-white text-[11px] font-bold shadow-2xs transition-all"
              title="Akses Sistem Pengelola AJCUlicious"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Login Admin</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
