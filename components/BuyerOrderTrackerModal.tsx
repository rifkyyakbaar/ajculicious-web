'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  Sparkles,
  AlertCircle,
  Star,
  Loader2,
  Calendar,
  Clock,
  MapPin,
  Check,
  Eye,
} from 'lucide-react';
import { OrderRecord, ReviewRecord, BatchPOConfig } from '../types/ajculicious';
import { OrderWithItems, DbOrderStatus } from '../types/database';
import {
  getOrderByInvoice,
  getOrdersByInvoiceList,
} from '../actions/order-actions';
import { INITIAL_BATCH_CONFIG } from '../data/initial_data';
import {
  formatRupiah,
  getSavedInvoicesFromBrowserHistory,
} from '../utils/formatters';
import { useBodyScrollLock } from '../utils/useBodyScrollLock';

interface BuyerOrderTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: OrderRecord[];
  reviews?: ReviewRecord[];
  onUploadProof?: (orderId: string, proofUrl: string) => void;
  onSubmitReview: (
    review: Omit<ReviewRecord, 'id' | 'isApproved'>
  ) => Promise<{ success: boolean; error?: string }> | void;
  initialInvoiceCode?: string;
  batchConfig?: BatchPOConfig;
}

export default function BuyerOrderTrackerModal({
  isOpen,
  onClose,
  reviews = [],
  onSubmitReview,
  initialInvoiceCode = '',
  batchConfig = INITIAL_BATCH_CONFIG,
}: BuyerOrderTrackerModalProps) {
  const [searchQuery, setSearchQuery] = useState(initialInvoiceCode);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [foundOrders, setFoundOrders] = useState<OrderWithItems[]>([]);

  const [reviewOrderId, setReviewOrderId] = useState<string | null>(null);
  const [reviewName, setReviewName] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    if (initialInvoiceCode.trim()) {
      setSearchQuery(initialInvoiceCode);
      handleSearch(initialInvoiceCode);
      return;
    }

    // Otomatis muat riwayat pesanan yang pernah dibuat di perangkat/browser ini (tanpa login)
    const savedCodes = getSavedInvoicesFromBrowserHistory();
    if (savedCodes.length > 0) {
      setIsSearching(true);
      setHasSearched(true);
      getOrdersByInvoiceList(savedCodes).then((res) => {
        if (res.success && res.data && res.data.length > 0) {
          setFoundOrders(res.data);
        } else {
          setHasSearched(false);
        }
        setIsSearching(false);
      });
    }
  }, [isOpen, initialInvoiceCode]);

  if (!isOpen) return null;

  const handleSearch = async (queryText: string) => {
    const cleanCode = queryText.trim().replace(/^#/, '').toUpperCase();
    if (!cleanCode || cleanCode.length < 6) {
      setSearchError(
        'Masukkan Kode Invoice lengkap Anda (contoh: AJCU-7K4M9P), lalu klik Cari.'
      );
      return;
    }

    setIsSearching(true);
    setSearchError('');
    setHasSearched(true);

    const res = await getOrderByInvoice(cleanCode);
    if (!res.success) {
      setSearchError(res.error || 'Gagal mencari pesanan.');
      setFoundOrders([]);
    } else {
      setFoundOrders(res.data ?? []);
    }
    setIsSearching(false);
  };

  const handleSendReview = async (
    e: React.FormEvent,
    invoiceCode: string,
    menuOrdered: string
  ) => {
    e.preventDefault();
    if (!reviewName.trim() || !reviewComment.trim()) return;

    setReviewError('');
    setIsSubmittingReview(true);

    const result = await onSubmitReview({
      invoiceCode,
      customerName: reviewName.trim(),
      rating: reviewRating,
      menuOrdered,
      comment: reviewComment.trim().slice(0, 180),
      date: new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
    });

    setIsSubmittingReview(false);

    if (result && !result.success) {
      setReviewError(result.error || 'Gagal mengirim ulasan.');
      return;
    }

    setReviewSuccess(true);
    setReviewComment('');
    setTimeout(() => {
      setReviewOrderId(null);
      setReviewSuccess(false);
      setReviewError('');
    }, 1800);
  };

  const getDbStatusBadge = (status: DbOrderStatus) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 font-semibold border border-amber-200">
            Diproses
          </span>
        );
      case 'SIAP_DIAMBIL':
        return (
          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-300">
            Siap Diambil
          </span>
        );
      case 'SELESAI':
        return (
          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-600 text-white font-semibold">
            Selesai
          </span>
        );
      case 'BATAL':
        return (
          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-600 font-semibold border border-rose-200">
            Dibatalkan
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 !m-0 z-[60] bg-black/55 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-[#EADFD3] rounded-3xl max-w-lg w-full max-h-[88vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#EADFD3] flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-base text-[#3B2618]">
              Cek Status Pesanan
            </h3>
            <p className="text-xs text-[#8C6D53]">
              Masukkan Kode Invoice lengkap lalu klik Cari
            </p>
          </div>

          <button
            type="button"
            suppressHydrationWarning
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[#FAF6F0] text-[#3B2618] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-[#F4ECE1] bg-[#FAF6F0]/50">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch(searchQuery);
            }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-[#8C6D53] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                suppressHydrationWarning
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value.toUpperCase());
                  if (searchError) setSearchError('');
                }}
                placeholder="Masukkan kode lengkap, misal: AJCU-7K4M9P"
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-[#EADFD3] bg-white text-xs font-mono text-[#3B2618] focus:outline-none focus:ring-2 focus:ring-[#5C3A21]"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              suppressHydrationWarning
              className="px-4 py-2 rounded-xl bg-[#5C3A21] text-white font-semibold text-xs hover:bg-[#462B18] disabled:opacity-60 transition"
            >
              {isSearching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Cari'
              )}
            </button>
          </form>
        </div>

        {/* Results */}
        <div className="p-5 overflow-y-auto space-y-3.5 flex-1">
          {searchError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{searchError}</span>
            </div>
          )}

          {!hasSearched ? (
            <div className="text-center py-10 space-y-1.5">
              <Search className="w-7 h-7 text-[#C4A98E] mx-auto" />
              <p className="text-xs font-semibold text-[#3B2618]">
                Masukkan Kode Invoice Lengkap Anda
              </p>
              <p className="text-[11px] text-[#8C6D53]">
                Contoh kode: <code>AJCU-7K4M9P</code> lalu klik tombol Cari.
              </p>
            </div>
          ) : isSearching ? (
            <div className="text-center py-10 space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-[#5C3A21] mx-auto" />
              <p className="text-xs text-[#8C6D53]">Mencari pesanan...</p>
            </div>
          ) : foundOrders.length === 0 ? (
            <div className="text-center py-10 space-y-1.5">
              <AlertCircle className="w-7 h-7 text-rose-400 mx-auto" />
              <p className="text-xs font-bold text-[#3B2618]">
                Pesanan tidak ditemukan
              </p>
              <p className="text-[11px] text-[#8C6D53]">
                Pastikan seluruh kode invoice sudah diketik dengan lengkap dan benar.
              </p>
            </div>
          ) : (
            foundOrders.map((order) => (
              <div
                key={order.id}
                className="p-4 rounded-2xl border border-[#EADFD3] bg-white space-y-3"
              >
                <div className="flex items-center justify-between gap-2 border-b border-[#F4ECE1] pb-2.5">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-[#5C3A21] bg-[#FAF6F0] px-2 py-0.5 rounded border border-[#EADFD3]">
                        #{order.invoice_code}
                      </span>
                      <span className="font-bold text-sm text-[#3B2618]">
                        {order.customer_name}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      <span className="text-[11px] text-[#8C6D53]">
                        {new Date(order.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        &bull; {order.payment_method}
                      </span>
                      {order.payment_status === 'SUDAH_BAYAR' ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                          Sudah Bayar (Lunas)
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 font-semibold border border-amber-200">
                          Belum Bayar
                        </span>
                      )}
                    </div>
                  </div>
                  {getDbStatusBadge(order.status)}
                </div>

                {/* Items */}
                <div className="space-y-1 text-xs text-[#3B2618]">
                  {(order.order_items ?? []).map((it) => (
                    <div
                      key={it.id}
                      className="flex justify-between items-center py-0.5"
                    >
                      <span>
                        {it.quantity}x {it.product_name_snapshot}
                      </span>
                      <span className="font-semibold text-[#5C3A21]">
                        {formatRupiah(it.subtotal)}
                      </span>
                    </div>
                  ))}
                  <div className="pt-2 mt-1 flex justify-between font-bold text-sm border-t border-[#F4ECE1]">
                    <span>Total</span>
                    <span className="text-[#3B2618]">
                      {formatRupiah(order.total_price)}
                    </span>
                  </div>
                </div>

                {/* Info Jadwal Pengambilan */}
                <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 space-y-1 text-[11px] text-amber-950">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-1 font-semibold">
                      <Calendar className="w-3.5 h-3.5 text-[#5C3A21]" />
                      Ambil: <strong>{batchConfig.readyPickupDate}</strong>
                    </span>
                    <span className="flex items-center gap-1 font-semibold">
                      <Clock className="w-3.5 h-3.5 text-[#5C3A21]" />
                      Jam: <strong>{batchConfig.readyPickupTime}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-1 font-semibold">
                    <MapPin className="w-3.5 h-3.5 text-[#5C3A21] shrink-0" />
                    <span>
                      Lokasi:{' '}
                      <strong>
                        {batchConfig.pickupLocations?.[0] ||
                          'Konter Kampus AJCUlicious'}
                      </strong>
                    </span>
                  </div>
                </div>

                {order.payment_proof_url && (
                  <div className="p-2.5 rounded-xl bg-[#FAF6F0] border border-[#EADFD3] flex items-center justify-between gap-2 text-xs">
                    <span className="text-[11px] font-semibold text-emerald-800 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      Bukti {order.payment_method} telah diunggah ke sistem web
                    </span>
                    <a
                      href={order.payment_proof_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-white border border-[#EADFD3] text-[11px] font-bold text-[#5C3A21] hover:bg-[#F2E8DC] flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Lihat Bukti</span>
                    </a>
                  </div>
                )}

                {order.status === 'SIAP_DIAMBIL' && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      Pesanan siap diambil! Tunjukkan kode{' '}
                      <strong>#{order.invoice_code}</strong> pada staf konter.
                    </span>
                  </div>
                )}

                {order.status === 'SELESAI' && (
                  <div>
                    {reviews.some(
                      (r) =>
                        r.invoiceCode?.toUpperCase() ===
                        order.invoice_code.toUpperCase()
                    ) ? (
                      <div className="w-full py-2 px-3 rounded-xl border border-emerald-200 bg-emerald-50 text-xs font-semibold text-emerald-800 flex items-center justify-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Ulasan untuk invoice ini sudah dikirim</span>
                      </div>
                    ) : reviewOrderId === order.id ? (
                      <form
                        onSubmit={(e) =>
                          handleSendReview(
                            e,
                            order.invoice_code,
                            (order.order_items ?? [])
                              .map((i) => i.product_name_snapshot)
                              .join(', ')
                          )
                        }
                        className="p-3 bg-[#FAF6F0] rounded-xl border border-[#EADFD3] space-y-2.5"
                      >
                        {reviewSuccess ? (
                          <p className="text-xs font-semibold text-emerald-700 text-center py-2">
                            Terima kasih atas ulasan Anda!
                          </p>
                        ) : (
                          <>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <button
                                    key={star}
                                    type="button"
                                    onClick={() => setReviewRating(star)}
                                  >
                                    <Star
                                      className={`w-4 h-4 ${
                                        star <= reviewRating
                                          ? 'fill-amber-400 text-amber-400'
                                          : 'text-stone-300'
                                      }`}
                                    />
                                  </button>
                                ))}
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setReviewOrderId(null);
                                  setReviewError('');
                                }}
                                className="text-[11px] text-[#8C6D53]"
                              >
                                Batal
                              </button>
                            </div>

                            <div>
                              <textarea
                                rows={2}
                                maxLength={180}
                                value={reviewComment}
                                onChange={(e) =>
                                  setReviewComment(e.target.value)
                                }
                                placeholder="Tulis ulasan singkat (maks. 180 karakter)..."
                                className="w-full px-3 py-1.5 rounded-lg border border-[#EADFD3] bg-white text-xs"
                                required
                              />
                              <p className="text-[10px] text-[#8C6D53] text-right mt-0.5">
                                {reviewComment.length}/180
                              </p>
                            </div>

                            {reviewError && (
                              <p className="text-[11px] font-semibold text-rose-600">
                                {reviewError}
                              </p>
                            )}

                            <button
                              type="submit"
                              disabled={isSubmittingReview}
                              className="w-full py-1.5 rounded-lg bg-[#5C3A21] text-white font-semibold text-xs disabled:opacity-60"
                            >
                              {isSubmittingReview
                                ? 'Mengirim...'
                                : 'Kirim Ulasan'}
                            </button>
                          </>
                        )}
                      </form>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setReviewOrderId(order.id);
                          setReviewName(order.customer_name);
                          setReviewError('');
                        }}
                        className="w-full py-2 rounded-xl border border-[#EADFD3] bg-[#FAF6F0] text-xs font-semibold text-[#5C3A21] hover:bg-[#F2E8DC] flex items-center justify-center gap-1.5 transition"
                      >
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>Beri Ulasan</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
