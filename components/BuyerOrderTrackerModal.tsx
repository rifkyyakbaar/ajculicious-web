'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  Sparkles,
  AlertCircle,
  Star,
  Loader2,
  QrCode,
  MessageCircle,
} from 'lucide-react';
import { OrderRecord, ReviewRecord } from '../types/ajculicious';
import { OrderWithItems, DbOrderStatus } from '../types/database';
import { getOrderByInvoice } from '../actions/order-actions';
import { OFFICIAL_INFO } from '../data/initial_data';
import { formatRupiah } from '../utils/formatters';

interface BuyerOrderTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: OrderRecord[];
  onUploadProof?: (orderId: string, proofUrl: string) => void;
  onSubmitReview: (review: Omit<ReviewRecord, 'id' | 'isApproved'>) => void;
  initialInvoiceCode?: string;
}

export default function BuyerOrderTrackerModal({
  isOpen,
  onClose,
  onSubmitReview,
  initialInvoiceCode = '',
}: BuyerOrderTrackerModalProps) {
  const [searchQuery, setSearchQuery] = useState(initialInvoiceCode);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [foundOrders, setFoundOrders] = useState<OrderWithItems[]>([]);

  const [reviewOrderId, setReviewOrderId] = useState<string | null>(null);
  const [reviewName, setReviewName] = useState('');
  const [reviewFaculty, setReviewFaculty] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState(false);

  useEffect(() => {
    if (isOpen && initialInvoiceCode.trim()) {
      setSearchQuery(initialInvoiceCode);
      handleSearch(initialInvoiceCode);
    }
  }, [isOpen, initialInvoiceCode]);

  if (!isOpen) return null;

  const handleSearch = async (queryText: string) => {
    const q = queryText.trim();
    if (!q || q.length < 2) {
      setSearchError('Masukkan minimal 2 karakter Kode Invoice atau Nama.');
      return;
    }

    setIsSearching(true);
    setSearchError('');
    setHasSearched(true);

    const res = await getOrderByInvoice(q);
    if (!res.success) {
      setSearchError(res.error || 'Gagal mencari pesanan.');
      setFoundOrders([]);
    } else {
      setFoundOrders(res.data ?? []);
    }
    setIsSearching(false);
  };

  const handleSendReview = (e: React.FormEvent, menuOrdered: string) => {
    e.preventDefault();
    if (!reviewName.trim() || !reviewComment.trim()) return;

    onSubmitReview({
      customerName: reviewName.trim(),
      faculty: reviewFaculty.trim() || 'Pelanggan',
      rating: reviewRating,
      menuOrdered,
      comment: reviewComment.trim(),
      date: new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
    });

    setReviewSuccess(true);
    setTimeout(() => {
      setReviewOrderId(null);
      setReviewSuccess(false);
    }, 2000);
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
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-[#EADFD3] rounded-3xl max-w-lg w-full max-h-[88vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#EADFD3] flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-base text-[#3B2618]">
              Cek Status Pesanan
            </h3>
            <p className="text-xs text-[#8C6D53]">
              Cari dengan Kode Invoice atau Nama Pemesan
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
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Contoh: AJC-261117-001 atau Nama..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-[#EADFD3] bg-white text-xs text-[#3B2618] focus:outline-none focus:ring-2 focus:ring-[#5C3A21]"
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
                Masukkan Kode Invoice atau Nama Anda
              </p>
              <p className="text-[11px] text-[#8C6D53]">
                Contoh kode: <code>AJC-261117-001</code>
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
                Pastikan kode invoice atau nama sudah benar.
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

                {order.status === 'PENDING' &&
                  order.payment_method === 'QRIS' && (
                    <div className="p-3 rounded-xl bg-[#FAF6F0] border border-[#EADFD3] flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <QrCode className="w-5 h-5 text-[#5C3A21] shrink-0" />
                        <span className="text-[11px] text-[#6E523D]">
                          Kirim bukti bayar QRIS via WhatsApp
                        </span>
                      </div>
                      <a
                        href={`https://wa.me/${
                          OFFICIAL_INFO.whatsappNumber
                        }?text=${encodeURIComponent(
                          `Halo Admin AJCUlicious, berikut bukti pembayaran QRIS untuk Invoice #${order.invoice_code} a.n. ${order.customer_name}.`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold text-[11px] hover:bg-emerald-700 shrink-0 flex items-center gap-1"
                      >
                        <MessageCircle className="w-3 h-3" />
                        <span>WhatsApp</span>
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
                    {reviewOrderId === order.id ? (
                      <form
                        onSubmit={(e) =>
                          handleSendReview(
                            e,
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
                                onClick={() => setReviewOrderId(null)}
                                className="text-[11px] text-[#8C6D53]"
                              >
                                Batal
                              </button>
                            </div>

                            <input
                              type="text"
                              value={reviewFaculty}
                              onChange={(e) => setReviewFaculty(e.target.value)}
                              placeholder="Fakultas / Keterangan (opsional)"
                              className="w-full px-3 py-1.5 rounded-lg border border-[#EADFD3] bg-white text-xs"
                            />

                            <textarea
                              rows={2}
                              value={reviewComment}
                              onChange={(e) => setReviewComment(e.target.value)}
                              placeholder="Tulis ulasan singkat..."
                              className="w-full px-3 py-1.5 rounded-lg border border-[#EADFD3] bg-white text-xs"
                              required
                            />

                            <button
                              type="submit"
                              className="w-full py-1.5 rounded-lg bg-[#5C3A21] text-white font-semibold text-xs"
                            >
                              Kirim Ulasan
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
