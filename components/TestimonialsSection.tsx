'use client';

import React, { useState } from 'react';
import {
  Star,
  Plus,
  X,
  Loader2,
  Check,
  MessageSquarePlus,
} from 'lucide-react';
import { Product, ReviewRecord } from '../types/ajculicious';
import { submitCustomerReview } from '../actions/order-actions';
import { getReviewsFromDb } from '../actions/catalog-actions';

interface TestimonialsSectionProps {
  reviews: ReviewRecord[];
  products: Product[];
  onReviewsUpdated: (freshReviews: ReviewRecord[]) => void;
}

export default function TestimonialsSection({
  reviews,
  products,
  onReviewsUpdated,
}: TestimonialsSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [faculty, setFaculty] = useState('');
  const [rating, setRating] = useState(5);
  const [menuOrdered, setMenuOrdered] = useState(
    products[0]?.name || 'Dubai Chewy Cookies Pistachio'
  );
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState(false);

  const approvedReviews = reviews.filter((r) => r.isApproved);

  const handleOpenModal = () => {
    if (products.length > 0 && !menuOrdered) {
      setMenuOrdered(products[0].name);
    }
    setErrorMsg('');
    setSuccessMsg(false);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !comment.trim()) {
      setErrorMsg('Nama dan ulasan wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    const res = await submitCustomerReview({
      customerName: customerName.trim(),
      faculty: faculty.trim() || 'Pelanggan',
      rating,
      menuOrdered:
        menuOrdered.trim() || products[0]?.name || 'Menu AJCUlicious',
      comment: comment.trim(),
    });

    if (!res.success) {
      setErrorMsg(res.error || 'Gagal menyimpan ulasan ke database.');
      setIsSubmitting(false);
      return;
    }

    // Ambil ulang daftar ulasan terbaru langsung dari database Supabase
    const freshReviews = await getReviewsFromDb();
    onReviewsUpdated(freshReviews);

    setIsSubmitting(false);
    setSuccessMsg(true);
    setCustomerName('');
    setFaculty('');
    setRating(5);
    setComment('');

    setTimeout(() => {
      setSuccessMsg(false);
      setIsModalOpen(false);
    }, 1200);
  };

  return (
    <section className="space-y-4 pt-4">
      {/* Header & Tombol Tambah Ulasan */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-[#3B2618] tracking-tight">
            Ulasan Pelanggan ({approvedReviews.length})
          </h2>
          <p className="text-xs text-[#8C6D53]">
            Ulasan asli dari pelanggan AJCUlicious
          </p>
        </div>

        <button
          type="button"
          suppressHydrationWarning
          onClick={handleOpenModal}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#5C3A21] text-white text-xs font-semibold hover:bg-[#462B18] active:scale-95 transition-all shadow-2xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tambah Ulasan</span>
        </button>
      </div>

      {/* Daftar Ulasan dari Database Supabase */}
      {approvedReviews.length === 0 ? (
        <div className="bg-white border border-[#EADFD3] rounded-2xl p-8 text-center space-y-2">
          <MessageSquarePlus className="w-7 h-7 text-[#8C6D53] mx-auto" />
          <p className="text-sm font-bold text-[#3B2618]">
            Belum ada ulasan di database
          </p>
          <p className="text-xs text-[#8C6D53]">
            Jadilah yang pertama memberikan ulasan untuk menu AJCUlicious!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {approvedReviews.map((rev) => (
            <div
              key={rev.id}
              className="bg-white border border-[#EADFD3] rounded-2xl p-4 flex flex-col justify-between hover:border-[#D0B89E] transition-colors"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-0.5 text-amber-400">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${
                          i < rev.rating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-stone-200'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] text-[#A68A71]">{rev.date}</span>
                </div>

                <p className="text-xs text-[#462B18] mt-2.5 leading-relaxed">
                  &ldquo;{rev.comment}&rdquo;
                </p>
              </div>

              <div className="mt-3.5 pt-2.5 border-t border-[#F4ECE1] flex items-center justify-between gap-2 text-[11px]">
                <div className="min-w-0">
                  <p className="font-bold text-[#3B2618] truncate">
                    {rev.customerName}
                  </p>
                  {rev.faculty && (
                    <p className="text-[10px] text-[#8C6D53] truncate">
                      {rev.faculty}
                    </p>
                  )}
                </div>
                <span className="px-2 py-0.5 rounded-md bg-[#FAF6F0] border border-[#EADFD3] text-[#5C3A21] text-[10px] font-medium truncate max-w-[130px] shrink-0">
                  {rev.menuOrdered}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Tambah Ulasan Baru (Langsung Masuk ke Tabel `reviews` Supabase) */}
      {isModalOpen && (
        <div
          onClick={() => setIsModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-[#EADFD3] rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base text-[#3B2618]">
                  Tulis Ulasan Pelanggan
                </h3>
                <p className="text-xs text-[#8C6D53]">
                  Bagikan pengalamanmu menikmati menu AJCUlicious
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-[#FAF6F0] text-[#3B2618]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {successMsg ? (
              <div className="py-8 text-center space-y-2">
                <div className="w-11 h-11 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-emerald-900">
                  Ulasan Berhasil Ditambahkan!
                </p>
                <p className="text-xs text-[#8C6D53]">
                  Terima kasih atas ulasan Anda.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
                {/* Pilih Bintang Rating */}
                <div>
                  <label className="block font-bold text-[#3B2618] mb-1.5">
                    Rating Kepuasan
                  </label>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className="p-1 rounded-lg hover:bg-[#FAF6F0] transition"
                      >
                        <Star
                          className={`w-6 h-6 ${
                            star <= rating
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-stone-300'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="ml-2 font-bold text-[#5C3A21]">
                      {rating} / 5
                    </span>
                  </div>
                </div>

                {/* Nama & Keterangan/Fakultas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-bold text-[#3B2618] mb-1">
                      Nama Anda *
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Contoh: Nadia Putri"
                      className="w-full px-3 py-2 rounded-xl border border-[#EADFD3] bg-[#FAF6F0]/50 focus:outline-none focus:ring-2 focus:ring-[#5C3A21] focus:bg-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#3B2618] mb-1">
                      Fakultas / Keterangan
                    </label>
                    <input
                      type="text"
                      value={faculty}
                      onChange={(e) => setFaculty(e.target.value)}
                      placeholder="Contoh: FEB / Umum"
                      className="w-full px-3 py-2 rounded-xl border border-[#EADFD3] bg-[#FAF6F0]/50 focus:outline-none focus:ring-2 focus:ring-[#5C3A21] focus:bg-white"
                    />
                  </div>
                </div>

                {/* Pilih Menu dari Database */}
                <div>
                  <label className="block font-bold text-[#3B2618] mb-1">
                    Menu yang Dipesan
                  </label>
                  <select
                    value={menuOrdered}
                    onChange={(e) => setMenuOrdered(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#EADFD3] bg-[#FAF6F0]/50 focus:outline-none focus:ring-2 focus:ring-[#5C3A21] focus:bg-white"
                  >
                    {products.map((prod) => (
                      <option key={prod.id} value={prod.name}>
                        {prod.emoji} {prod.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Isi Ulasan */}
                <div>
                  <label className="block font-bold text-[#3B2618] mb-1">
                    Ulasan Anda *
                  </label>
                  <textarea
                    rows={3}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Ceritakan bagaimana rasa dan kualitas menu AJCUlicious..."
                    className="w-full px-3 py-2 rounded-xl border border-[#EADFD3] bg-[#FAF6F0]/50 focus:outline-none focus:ring-2 focus:ring-[#5C3A21] focus:bg-white"
                    required
                  />
                </div>

                {errorMsg && (
                  <p className="text-rose-600 font-semibold text-xs">
                    {errorMsg}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 rounded-xl bg-[#5C3A21] hover:bg-[#462B18] text-white font-bold transition flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Menyimpan ke Database...</span>
                    </>
                  ) : (
                    <span>Kirim Ulasan</span>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
