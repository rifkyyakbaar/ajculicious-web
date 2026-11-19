'use client';

import React, { useEffect } from 'react';
import {
  ChevronRight,
  ChevronLeft,
  X,
  Calendar,
  Store,
  Cookie,
  ShoppingBag,
  CheckCircle2,
} from 'lucide-react';
import { useBodyScrollLock } from '../utils/useBodyScrollLock';

export type TourStep = 'welcome' | 1 | 2 | 3 | 4 | null;

interface OnboardingTourProps {
  currentStep: TourStep;
  onChangeStep: (step: TourStep) => void;
  onFinishOrSkip: () => void;
}

interface StepDetail {
  stepNumber: 1 | 2 | 3 | 4;
  targetId: string;
  badge: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  popupPositionClass: string;
}

const TOUR_STEPS: StepDetail[] = [
  {
    stepNumber: 1,
    targetId: 'tour-batch-info',
    badge: 'Langkah 1 / 4',
    title: 'Info Jadwal Pre-Order',
    description:
      'Cek status Pre-Order yang sedang aktif, batas waktu pemesanan, serta jadwal & jam pengambilan di bagian atas ini.',
    icon: <Calendar className="w-4 h-4 text-amber-300" />,
    popupPositionClass: 'top-32 left-1/2 -translate-x-1/2',
  },
  {
    stepNumber: 2,
    targetId: 'tour-hero-counter',
    badge: 'Langkah 2 / 4',
    title: 'Konter Interaktif',
    description:
      'Arahkan kursor ke karakter di konter untuk melihat rekomendasi menu favorit mereka, atau klik objek di etalase untuk memfilter kategori.',
    icon: <Store className="w-4 h-4 text-amber-300" />,
    popupPositionClass: 'bottom-6 left-1/2 -translate-x-1/2',
  },
  {
    stepNumber: 3,
    targetId: 'katalog-menu',
    badge: 'Langkah 3 / 4',
    title: 'Pilih Menu',
    description:
      'Pilih menu favoritmu dan klik tombol "+ Tambah" untuk memasukkannya ke keranjang.',
    icon: <Cookie className="w-4 h-4 text-amber-300" />,
    popupPositionClass: 'bottom-6 left-1/2 -translate-x-1/2',
  },
  {
    stepNumber: 4,
    targetId: 'tour-cart-nav',
    badge: 'Langkah 4 / 4',
    title: 'Checkout & Cek Pesanan',
    description:
      'Klik "Keranjang" untuk isi nama, nomor WA, & pilih pembayaran (COD / QRIS / Transfer Bank) langsung via web, atau klik "Cek Pesanan" untuk melacak status invoice.',
    icon: <ShoppingBag className="w-4 h-4 text-amber-300" />,
    popupPositionClass: 'top-20 right-4 sm:right-8',
  },
];

export default function OnboardingTour({
  currentStep,
  onChangeStep,
  onFinishOrSkip,
}: OnboardingTourProps) {
  useBodyScrollLock(Boolean(currentStep));

  useEffect(() => {
    if (typeof currentStep === 'number') {
      const stepData = TOUR_STEPS.find((s) => s.stepNumber === currentStep);
      if (stepData) {
        if (currentStep === 4 || currentStep === 1) {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          const el = document.getElementById(stepData.targetId);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }
    }
  }, [currentStep]);

  if (!currentStep) return null;

  if (currentStep === 'welcome') {
    return (
      <div className="fixed inset-0 !m-0 z-[60] bg-black/55 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
        <div className="bg-white border border-[#EADFD3] rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 relative animate-in zoom-in-95 duration-150">
          <button
            type="button"
            onClick={onFinishOrSkip}
            className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-[#FAF6F0] text-[#8C6D53]"
            aria-label="Lewati"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white border border-[#EADFD3] overflow-hidden flex items-center justify-center shrink-0 shadow-xs">
              <img
                src="/images/logo-ajculicious.jpg"
                alt="Logo AJCUlicious"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-[#3B2618]">
                Selamat Datang di AJCUlicious
              </h3>
              <p className="text-xs text-[#8C6D53]">
                Panduan singkat cara memesan
              </p>
            </div>
          </div>

          <p className="text-xs text-[#6E523D] leading-relaxed">
            Baru pertama kali berkunjung? Ikuti 4 langkah singkat untuk melihat cara memesan di website ini, atau lewati jika sudah paham.
          </p>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onFinishOrSkip}
              className="px-4 py-2.5 rounded-xl border border-[#EADFD3] bg-white hover:bg-[#FAF6F0] text-[#7D5E46] text-xs font-semibold transition"
            >
              Lewati
            </button>

            <button
              type="button"
              onClick={() => onChangeStep(1)}
              className="flex-1 inline-flex items-center justify-center gap-1 px-4 py-2.5 rounded-xl bg-[#5C3A21] hover:bg-[#462B18] text-white text-xs font-bold transition"
            >
              <span>Mulai Panduan</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const activeDetail = TOUR_STEPS.find((s) => s.stepNumber === currentStep);
  if (!activeDetail) return null;

  return (
    <>
      <div
        onClick={onFinishOrSkip}
        className="fixed inset-0 !m-0 z-[55] bg-black/40 transition-opacity duration-200"
      />

      <div
        className={`fixed z-[60] w-[90vw] max-w-sm ${activeDetail.popupPositionClass} transition-all duration-200 animate-in fade-in zoom-in-95`}
      >
        <div className="bg-white border border-[#D8C2A8] rounded-2xl p-4 shadow-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#5C3A21] text-white text-[11px] font-semibold">
              {activeDetail.icon}
              <span>{activeDetail.badge}</span>
            </div>

            <button
              type="button"
              onClick={onFinishOrSkip}
              className="text-xs font-medium text-[#8C6D53] hover:text-[#3B2618]"
            >
              Lewati
            </button>
          </div>

          <div className="space-y-1">
            <h4 className="font-bold text-sm text-[#3B2618]">
              {activeDetail.title}
            </h4>
            <p className="text-xs text-[#6E523D] leading-relaxed">
              {activeDetail.description}
            </p>
          </div>

          <div className="pt-2 border-t border-[#F4ECE1] flex items-center justify-between">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => onChangeStep(num as 1 | 2 | 3 | 4)}
                  className={`h-1.5 rounded-full transition-all ${
                    currentStep === num
                      ? 'w-5 bg-[#5C3A21]'
                      : 'w-1.5 bg-[#E6D8C7]'
                  }`}
                  aria-label={`Langkah ${num}`}
                />
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    onChangeStep((currentStep - 1) as 1 | 2 | 3 | 4)
                  }
                  className="p-1.5 rounded-lg border border-[#EADFD3] text-[#5C3A21] hover:bg-[#FAF6F0]"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              )}

              {currentStep < 4 ? (
                <button
                  type="button"
                  onClick={() =>
                    onChangeStep((currentStep + 1) as 1 | 2 | 3 | 4)
                  }
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#5C3A21] hover:bg-[#462B18] text-white text-xs font-semibold"
                >
                  <span>Lanjut</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onFinishOrSkip}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Selesai</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
