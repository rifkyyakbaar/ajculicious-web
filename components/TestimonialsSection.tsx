'use client';

import React, { useState, useRef } from 'react';
import {
  Star,
  Plus,
  X,
  Loader2,
  Check,
  MessageSquarePlus,
  ChevronLeft,
  ChevronRight,
  Search,
  AlertCircle,
} from 'lucide-react';
import { Product, ReviewRecord } from '../types/ajculicious';
import {
  submitCustomerReview,
  verifyInvoiceForReview,
} from '../actions/order-actions';
import { getReviewsFromDb } from '../actions/catalog-actions';
import { formatRupiah } from '../utils/formatters';
import { useBodyScrollLock } from '../utils/useBodyScrollLock';

interface TestimonialsSectionProps {
  reviews: ReviewRecord[];
  products: Product[];
  onReviewsUpdated: (freshReviews: ReviewRecord[]) => void;
}

interface VerifiedOrderSummary {
  invoiceCode: string;
  customerName: string;
  menuOrdered: string;
  totalPrice: number;
  createdAt: string;
  items: Array<{ productName: string; quantity: number }>;
}

const MAX_REVIEW_LENGTH = 180;
const PRIMARY_VISIBLE_LIMIT = 5;

export default function TestimonialsSection({
  reviews,
  onReviewsUpdated,
}: TestimonialsSectionProps) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAllReviewsModalOpen, setIsAllReviewsModalOpen] = useState(false);

  // Step 1: Cari & klik invoice dulu (persis seperti Cek Pesanan)
  const [searchInvoiceInput, setSearchInvoiceInput] = useState('');
  const [isSearchingInvoice, setIsSearchingInvoice] = useState(false);
  const [foundOrder, setFoundOrder] = useState<VerifiedOrderSummary | null>(
    null
  );
  // Step 2: Setelah kartu invoice diklik, tampilkan form Bintang + Ulasan
  const [selectedOrderForReview, setSelectedOrderForReview] =
    useState<VerifiedOrderSummary | null>(null);

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState(false);

  // Kunci scroll latar belakang saat popup terbuka
  useBodyScrollLock(isModalOpen || isAllReviewsModalOpen);

  const approvedReviews = reviews.filter((r) => r.isApproved);
  const primaryReviews = approvedReviews.slice(0, PRIMARY_VISIBLE_LIMIT);
  const hasMoreReviews = approvedReviews.length > PRIMARY_VISIBLE_LIMIT;

  const handleOpenModal = () => {
    setSearchInvoiceInput('');
    setFoundOrder(null);
    setSelectedOrderForReview(null);
    setRating(5);
    setComment('');
    setErrorMsg('');
    setSuccessMsg(false);
    setIsModalOpen(true);
  };

  const handleScrollReviews = (direction: 'left' | 'right') => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distance = direction === 'left' ? -320 : 320;
    el.scrollBy({ left: distance, behavior: 'smooth' });
  };

  const handleSearchInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = searchInvoiceInput.trim().replace(/^#/, '').toUpperCase();
    if (!clean || clean.length < 6) {
      setErrorMsg(
        'Masukkan kode invoice lengkap Anda (contoh: AJCU-7K4M9P), lalu klik Cari.'
      );
      setFoundOrder(null);
      return;
    }

    setIsSearchingInvoice(true);
    setErrorMsg('');
    setFoundOrder(null);
    setSelectedOrderForReview(null);

    const res = await verifyInvoiceForReview(clean);
    setIsSearchingInvoice(false);

    if (!res.success || !res.data) {
      setErrorMsg(
        res.error || 'Kode invoice tidak ditemukan atau sudah pernah diulas.'
      );
      return;
    }

    setFoundOrder(res.data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForReview) {
      setErrorMsg('Pilih pesanan dari hasil pencarian kode invoice terlebih dahulu.');
      return;
    }

    const cleanComment = comment.trim();
    if (!cleanComment) {
      setErrorMsg('Isi ulasan wajib ditulis.');
      return;
    }

    if (cleanComment.length > MAX_REVIEW_LENGTH) {
      setErrorMsg(`Ulasan maksimal ${MAX_REVIEW_LENGTH} karakter.`);
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    const res = await submitCustomerReview({
      invoiceCode: selectedOrderForReview.invoiceCode,
      customerName: selectedOrderForReview.customerName,
      rating,
      menuOrdered: selectedOrderForReview.menuOrdered,
      comment: cleanComment,
    });

    if (!res.success) {
      setErrorMsg(res.error || 'Gagal menyimpan ulasan ke database.');
      setIsSubmitting(false);
      return;
    }

    const freshReviews = await getReviewsFromDb();
    onReviewsUpdated(freshReviews);

    setIsSubmitting(false);
    setSuccessMsg(true);
    setSearchInvoiceInput('');
    setFoundOrder(null);
    setSelectedOrderForReview(null);
    setRating(5);
    setComment('');

    setTimeout(() => {
      setSuccessMsg(false);
      setIsModalOpen(false);
    }, 1200);
  };

  const renderReviewCard = (rev: ReviewRecord, compact = true) => (
    <div
      key={rev.id}
      className={`bg-white border border-[#EADFD3] rounded-2xl p-4 flex flex-col justify-between hover:border-[#D0B89E] transition-colors ${
        compact ? 'w-[265px] sm:w-[290px] shrink-0 snap-start' : 'w-full'
      }`}
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

        <p
          className={`text-xs text-[#462B18] mt-2.5 leading-relaxed ${
            compact ? 'line-clamp-3 min-h-[3.6rem]' : ''
          }`}
        >
          &ldquo;{rev.comment}&rdquo;
        </p>
      </div>

      <div className="mt-3.5 pt-2.5 border-t border-[#F4ECE1] flex items-center justify-between gap-2 text-[11px]">
        <div className="min-w-0">
          <p className="font-bold text-[#3B2618] truncate">
            {rev.customerName}
          </p>
        </div>
        <span className="px-2 py-0.5 rounded-md bg-[#FAF6F0] border border-[#EADFD3] text-[#5C3A21] text-[10px] font-medium truncate max-w-[125px] shrink-0">
          {rev.menuOrdered}
        </span>
      </div>
    </div>
  );

  return (
    <section className="flex flex-col gap-4 pt-4 min-w-0">
      {/* Header & Tombol Navigasi + Tambah Ulasan */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-[#3B2618] tracking-tight">
            Ulasan Pelanggan ({approvedReviews.length})
          </h2>
          <p className="text-xs text-[#8C6D53]">
            Geser ke samping untuk membaca ulasan terverifikasi kode invoice
          </p>
        </div>

        <div className="flex items-center gap-2">
          {approvedReviews.length > 1 && (
            <div className="hidden sm:flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleScrollReviews('left')}
                className="p-2 rounded-full border border-[#EADFD3] bg-white hover:bg-[#FAF6F0] text-[#5C3A21] transition"
                aria-label="Geser ulasan ke kiri"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleScrollReviews('right')}
                className="p-2 rounded-full border border-[#EADFD3] bg-white hover:bg-[#FAF6F0] text-[#5C3A21] transition"
                aria-label="Geser ulasan ke kanan"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {hasMoreReviews && (
            <button
              type="button"
              onClick={() => setIsAllReviewsModalOpen(true)}
              className="px-3.5 py-2 rounded-full border border-[#EADFD3] bg-white hover:bg-[#FAF6F0] text-xs font-semibold text-[#5C3A21] transition"
            >
              Lihat Semua ({approvedReviews.length})
            </button>
          )}

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
      </div>

      {/* Daftar Ulasan Horizontal Scroll (Maksimal 5 Ulasan Utama) */}
      {approvedReviews.length === 0 ? (
        <div className="bg-white border border-[#EADFD3] rounded-2xl p-8 text-center space-y-2">
          <MessageSquarePlus className="w-7 h-7 text-[#8C6D53] mx-auto" />
          <p className="text-sm font-bold text-[#3B2618]">
            Belum ada ulasan di database
          </p>
          <p className="text-xs text-[#8C6D53]">
            Pesan menu AJCUlicious lalu masukkan kode invoice untuk menulis ulasan pertama!
          </p>
        </div>
      ) : (
        <div
          ref={scrollContainerRef}
          className="flex gap-3.5 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth"
        >
          {primaryReviews.map((rev) => renderReviewCard(rev, true))}
        </div>
      )}

      {/* Modal Lihat Semua Ulasan (z-[60], latar terkunci) */}
      {isAllReviewsModalOpen && (
        <div
          onClick={() => setIsAllReviewsModalOpen(false)}
          className="fixed inset-0 !m-0 z-[60] bg-black/55 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#FAF6F0] border border-[#EADFD3] rounded-3xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
          >
            <div className="px-6 py-4 bg-white border-b border-[#EADFD3] flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base text-[#3B2618]">
                  Semua Ulasan Pelanggan ({approvedReviews.length})
                </h3>
                <p className="text-xs text-[#8C6D53]">
                  Seluruh ulasan terverifikasi kode invoice pesanan AJCUlicious
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAllReviewsModalOpen(false)}
                className="p-2 rounded-full hover:bg-[#FAF6F0] text-[#3B2618]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {approvedReviews.map((rev) => renderReviewCard(rev, false))}
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah Ulasan: Step 1 Cari & Klik Invoice -> Step 2 Isi Bintang & Ulasan */}
      {isModalOpen && (
        <div
          onClick={() => setIsModalOpen(false)}
          className="fixed inset-0 !m-0 z-[60] bg-black/55 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
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
                  {selectedOrderForReview
                    ? 'Beri rating bintang & ulasan untuk pesanan Anda'
                    : 'Cari kode invoice lengkap lalu klik pesanan Anda (1 kode = 1 ulasan)'}
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
            ) : !selectedOrderForReview ? (
              /* STEP 1: CARI KODE INVOICE & KLIK PESANANNYA */
              <div className="space-y-3.5 text-xs">
                <form onSubmit={handleSearchInvoice} className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-[#8C6D53] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchInvoiceInput}
                      onChange={(e) => {
                        setSearchInvoiceInput(e.target.value.toUpperCase());
                        if (errorMsg) setErrorMsg('');
                      }}
                      placeholder="Masukkan kode lengkap, misal: AJCU-7K4M9P"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#EADFD3] bg-[#FAF6F0]/50 font-mono uppercase text-xs text-[#3B2618] focus:outline-none focus:ring-2 focus:ring-[#5C3A21] focus:bg-white"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSearchingInvoice}
                    className="px-4 py-2.5 rounded-xl bg-[#5C3A21] hover:bg-[#462B18] text-white font-bold transition disabled:opacity-60 shrink-0"
                  >
                    {isSearchingInvoice ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Cari'
                    )}
                  </button>
                </form>

                {errorMsg && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {foundOrder ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedOrderForReview(foundOrder);
                      setErrorMsg('');
                    }}
                    className="w-full text-left p-4 rounded-2xl border-2 border-[#EADFD3] hover:border-[#5C3A21] bg-[#FAF6F0]/60 hover:bg-[#FAF6F0] transition space-y-2.5 group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-bold text-xs text-[#5C3A21] bg-white px-2.5 py-0.5 rounded-md border border-[#EADFD3]">
                        #{foundOrder.invoiceCode}
                      </span>
                      <span className="text-[11px] font-bold text-[#5C3A21] group-hover:underline">
                        Klik untuk Beri Ulasan &rarr;
                      </span>
                    </div>

                    <div>
                      <p className="font-bold text-sm text-[#3B2618]">
                        {foundOrder.customerName}
                      </p>
                      <p className="text-[11px] text-[#8C6D53]">
                        {new Date(foundOrder.createdAt).toLocaleDateString(
                          'id-ID',
                          {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          }
                        )}{' '}
                        &bull; {formatRupiah(foundOrder.totalPrice)}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-[#EADFD3] text-[11px] text-[#5C3A21] space-y-0.5">
                      {foundOrder.items.map((item, idx) => (
                        <p key={idx} className="truncate">
                          &bull; {item.quantity}x {item.productName}
                        </p>
                      ))}
                    </div>
                  </button>
                ) : (
                  <div className="py-6 text-center text-[#8C6D53] bg-[#FAF6F0]/50 rounded-2xl border border-dashed border-[#EADFD3] px-4 space-y-1">
                    <p className="font-semibold text-[#3B2618]">
                      Cari Kode Invoice Pesanan Anda
                    </p>
                    <p className="text-[11px]">
                      Ketik seluruh kode invoice pada struk pesanan lalu klik{' '}
                      <strong>Cari</strong>, kemudian klik hasil pesanan Anda untuk menulis ulasan.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* STEP 2: FORM ULASAN (HANYA BINTANG + TEKS ULASAN, NAMA & MENU OTOMATIS DARI INVOICE) */
              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div className="p-3 rounded-2xl bg-[#FAF6F0] border border-[#EADFD3] space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-[#5C3A21]">
                      #{selectedOrderForReview.invoiceCode} &bull;{' '}
                      {selectedOrderForReview.customerName}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedOrderForReview(null);
                        setErrorMsg('');
                      }}
                      className="text-[11px] font-semibold text-[#8C6D53] hover:text-[#3B2618] underline"
                    >
                      Ganti Kode
                    </button>
                  </div>
                  <p className="text-[11px] text-[#7D5E46]">
                    Menu: <strong className="text-[#3B2618]">{selectedOrderForReview.menuOrdered}</strong>
                  </p>
                </div>

                {/* Pilih Bintang Rating */}
                <div>
                  <label className="block font-bold text-[#3B2618] mb-1.5">
                    Rating Kepuasan *
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

                {/* Isi Ulasan (Maksimal 180 Karakter) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-[#3B2618]">
                      Ulasan Anda *
                    </label>
                    <span className="text-[10px] font-semibold text-[#8C6D53]">
                      {comment.length}/{MAX_REVIEW_LENGTH}
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    maxLength={MAX_REVIEW_LENGTH}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Bagikan pengalamanmu menikmati menu ini (maks. 180 karakter)..."
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
                      <span>Mengirim Ulasan...</span>
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
