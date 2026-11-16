'use client';

import React from 'react';
import { Star, CheckCircle, MessageSquareQuote } from 'lucide-react';
import { ReviewRecord } from '../types/ajculicious';

interface TestimonialsSectionProps {
  reviews: ReviewRecord[];
  onOpenReviewModal: () => void;
}

export default function TestimonialsSection({
  reviews,
  onOpenReviewModal,
}: TestimonialsSectionProps) {
  const approvedReviews = reviews.filter((r) => r.isApproved);

  return (
    <section className="space-y-4 pt-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-6 rounded-full bg-[#5C3A21]"></span>
            <h2 className="text-xl sm:text-2xl font-black text-[#3B2618] tracking-tight">
              Testimoni Teman Kampus
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-[#7D5E46] mt-1">
            Cerita jujur dari mahasiswa &amp; warga kampus penikmat setia batch PO AJCUlicious.
          </p>
        </div>

        <button
          type="button"
          suppressHydrationWarning
          onClick={onOpenReviewModal}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-[#E6D8C7] bg-[#FFFDF9] text-[#5C3A21] text-xs font-bold hover:bg-[#F2E8DC] transition shadow-2xs"
        >
          <MessageSquareQuote className="w-3.5 h-3.5 text-[#5C3A21]" />
          <span>Tulis Ulasan</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {approvedReviews.map((rev) => (
          <div
            key={rev.id}
            className="bg-[#FFFDF9] border border-[#E6D8C7] rounded-3xl p-4 sm:p-5 flex flex-col justify-between shadow-2xs hover:shadow-sm transition-all"
          >
            <div>
              {/* Stars & Badge */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-0.5 text-amber-400">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3.5 h-3.5 ${
                        i < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-stone-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold flex items-center gap-1">
                  <CheckCircle className="w-2.5 h-2.5 text-emerald-600" />
                  Verified
                </span>
              </div>

              {/* Komentar Ulasan */}
              <p className="text-xs text-[#462B18] mt-3 italic leading-relaxed">
                &ldquo;{rev.comment}&rdquo;
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-[#E6D8C7]/50">
              <p className="font-bold text-xs text-[#3B2618]">{rev.customerName}</p>
              <p className="text-[11px] text-[#7D5E46]">{rev.faculty}</p>
              <div className="mt-1.5 inline-block text-[10px] px-2 py-0.5 rounded-md bg-[#F2E8DC] text-[#5C3A21] font-medium">
                Menu: {rev.menuOrdered}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
