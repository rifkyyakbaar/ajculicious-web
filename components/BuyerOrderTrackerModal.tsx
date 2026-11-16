'use client';

import React, { useState } from 'react';
import {
  X,
  Search,
  Copy,
  Check,
  Upload,
  Clock,
  Sparkles,
  AlertCircle,
  Star,
  CheckCircle2,
  Package,
} from 'lucide-react';
import { OrderRecord, OrderStatus, ReviewRecord } from '../types/ajculicious';
import { OFFICIAL_INFO } from '../data/initial_data';
import { formatRupiah } from '../utils/formatters';

interface BuyerOrderTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: OrderRecord[];
  onUploadProof: (orderId: string, proofUrl: string) => void;
  onSubmitReview: (review: Omit<ReviewRecord, 'id' | 'isApproved'>) => void;
  initialInvoiceCode?: string;
}

export default function BuyerOrderTrackerModal({
  isOpen,
  onClose,
  orders,
  onUploadProof,
  onSubmitReview,
  initialInvoiceCode = '',
}: BuyerOrderTrackerModalProps) {
  const [searchInvoice, setSearchInvoice] = useState(initialInvoiceCode);
  const [hasSearched, setHasSearched] = useState(Boolean(initialInvoiceCode));
  const [copiedBank, setCopiedBank] = useState<string | null>(null);

  // Upload proof local state
  const [proofPreviewUrl, setProofPreviewUrl] = useState<string>('');
  const [isUploadingProof, setIsUploadingProof] = useState(false);

  // Review state
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewName, setReviewName] = useState('');
  const [reviewFaculty, setReviewFaculty] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState(false);

  if (!isOpen) return null;

  // Find exact or closest matching single order
  const matchedOrder = orders.find((o) => {
    const q = searchInvoice.trim().toLowerCase().replace('#', '');
    if (!q) return false;
    return o.invoiceCode.toLowerCase() === q || o.invoiceCode.toLowerCase().includes(q);
  });

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedBank(label);
    setTimeout(() => setCopiedBank(null), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleConfirmProof = (orderId: string) => {
    if (!proofPreviewUrl) return;
    onUploadProof(orderId, proofPreviewUrl);
    setIsUploadingProof(false);
    setProofPreviewUrl('');
  };

  const handleSendReview = (e: React.FormEvent, menuOrdered: string) => {
    e.preventDefault();
    if (!reviewName.trim() || !reviewComment.trim()) return;

    onSubmitReview({
      customerName: reviewName.trim(),
      faculty: reviewFaculty.trim() || 'Mahasiswa Kampus',
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
      setShowReviewForm(false);
      setReviewSuccess(false);
    }, 2500);
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'MENUNGGU_PEMBAYARAN':
        return (
          <span className="text-xs px-3 py-1 rounded-full bg-amber-100 text-amber-900 font-bold border border-amber-200">
            Menunggu Pembayaran
          </span>
        );
      case 'MENUNGGU_VERIFIKASI':
        return (
          <span className="text-xs px-3 py-1 rounded-full bg-sky-100 text-sky-800 font-bold border border-sky-200">
            Bukti Terkirim &bull; Menunggu Verifikasi
          </span>
        );
      case 'LUNAS_PRODUKSI':
        return (
          <span className="text-xs px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
            Lunas &bull; Sedang Diproduksi Dapur
          </span>
        );
      case 'READY_PICKUP':
        return (
          <span className="text-xs px-3 py-1 rounded-full bg-[#DCFCE7] text-[#166534] font-extrabold border border-emerald-400 shadow-2xs animate-pulse">
            Ready to Pick Up! (Siap Diambil)
          </span>
        );
      case 'SELESAI':
        return (
          <span className="text-xs px-3 py-1 rounded-full bg-emerald-600 text-white font-bold">
            Selesai Diambil
          </span>
        );
      case 'DITOLAK':
        return (
          <span className="text-xs px-3 py-1 rounded-full bg-rose-100 text-rose-700 font-bold border border-rose-200">
            Dibatalkan
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-[#FFFDF9] border border-[#E6D8C7] rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 bg-[#FAF6F0] border-b border-[#E6D8C7] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#5C3A21] text-white flex items-center justify-center font-bold text-sm">
              AJC
            </div>
            <div>
              <h3 className="font-extrabold text-base text-[#3B2618]">
                Lacak Kode Pesanan Saya
              </h3>
              <p className="text-xs text-[#7D5E46]">
                Khusus melihat status 1 pesanan Anda dan konfirmasi pembayaran
              </p>
            </div>
          </div>

          <button
            type="button"
            suppressHydrationWarning
            onClick={onClose}
            className="p-2 rounded-full bg-white hover:bg-[#F2E8DC] text-[#3B2618] border border-[#E6D8C7] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Input Pencarian Invoice Khusus Milik Pembeli */}
        <div className="p-4 border-b border-[#E6D8C7] bg-[#FFFDF9]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setHasSearched(true);
            }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#8C6D53] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                suppressHydrationWarning
                value={searchInvoice}
                onChange={(e) => {
                  setSearchInvoice(e.target.value);
                  setHasSearched(true);
                }}
                placeholder="Ketik Kode Invoice (misal: AJC-261117-001)..."
                className="w-full pl-9 pr-4 py-2.5 rounded-2xl border border-[#E6D8C7] bg-white text-xs text-[#3B2618] focus:outline-none focus:ring-2 focus:ring-[#5C3A21] shadow-2xs font-mono font-medium"
                required
              />
            </div>
            <button
              type="submit"
              suppressHydrationWarning
              className="px-4 py-2.5 rounded-2xl bg-[#5C3A21] text-white font-bold text-xs hover:bg-[#462B18] transition"
            >
              Cari
            </button>
          </form>
        </div>

        {/* Body: Single Order Card Only */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {!hasSearched || !searchInvoice.trim() ? (
            <div className="text-center py-10 bg-[#FAF6F0] rounded-3xl border border-[#E6D8C7] p-6 space-y-2">
              <div className="w-12 h-12 rounded-full bg-[#F2E8DC] text-[#5C3A21] flex items-center justify-center mx-auto mb-2">
                <Search className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-[#3B2618]">
                Masukkan Kode Invoice Pesanan Anda
              </p>
              <p className="text-xs text-[#7D5E46] max-w-sm mx-auto leading-relaxed">
                Kode invoice dapat dilihat di pesan konfirmasi WhatsApp yang Anda kirimkan saat checkout (format: <code>AJC-XXXXXX-XXX</code>).
              </p>
            </div>
          ) : !matchedOrder ? (
            <div className="text-center py-10 bg-rose-50 rounded-3xl border border-rose-200 p-6 space-y-2">
              <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
              <p className="text-sm font-bold text-rose-800">
                Pesanan Tidak Ditemukan
              </p>
              <p className="text-xs text-rose-700 max-w-sm mx-auto leading-relaxed">
                Tidak ada pesanan dengan kode invoice <strong>&ldquo;{searchInvoice}&rdquo;</strong>. Mohon periksa kembali huruf dan angka kode invoice Anda.
              </p>
            </div>
          ) : (
            /* ================= TAMPILKAN 1 PESANAN MILIK PEMBELI ================= */
            <div className="p-5 rounded-3xl border-2 border-[#E6D8C7] bg-white space-y-4 shadow-sm">
              {/* Header Single Order */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E6D8C7]/60 pb-3">
                <div>
                  <span className="font-mono font-black text-sm text-[#5C3A21] bg-[#F2E8DC] px-2.5 py-1 rounded-lg border border-[#E6D8C7]">
                    #{matchedOrder.invoiceCode}
                  </span>
                  <h4 className="font-extrabold text-base text-[#3B2618] mt-1.5">
                    Pesanan a.n. {matchedOrder.customerName}
                  </h4>
                  <span className="text-xs text-[#7D5E46]">
                    Waktu Pesan: {matchedOrder.createdAt}
                  </span>
                </div>
                <div>{getStatusBadge(matchedOrder.status)}</div>
              </div>

              {/* Rincian Titik Ambil & Bayar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-[#FAF6F0] p-3 rounded-2xl border border-[#E6D8C7]/60">
                <div>
                  <span className="text-[#7D5E46] block text-[11px]">Pengambilan:</span>
                  <span className="font-bold text-[#3B2618]">
                    {matchedOrder.pickupOption === 'kampus' ? 'Ambil di Kampus' : 'Antar Kurir'} &bull;{' '}
                    {matchedOrder.pickupLocation}
                  </span>
                </div>
                <div>
                  <span className="text-[#7D5E46] block text-[11px]">Metode Bayar:</span>
                  <span className="font-bold text-[#3B2618]">
                    {matchedOrder.paymentMethod === 'COD'
                      ? 'COD di Kampus (Tunai)'
                      : matchedOrder.paymentMethod === 'QRIS'
                      ? 'QRIS Statis'
                      : `Transfer ${matchedOrder.bankChosen || 'Bank'}`}
                  </span>
                </div>
              </div>

              {/* Daftar Menu Pesanan */}
              <div className="space-y-1.5 text-xs text-[#3B2618] border-b border-[#E6D8C7]/60 pb-3">
                <span className="font-bold text-[#7D5E46] block">Daftar Menu:</span>
                {matchedOrder.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between items-center py-1">
                    <span>
                      {it.quantity}x <strong>{it.productName}</strong>
                    </span>
                    <span className="font-bold text-[#5C3A21]">
                      {formatRupiah(it.subtotal)}
                    </span>
                  </div>
                ))}
                <div className="pt-2 flex justify-between font-black text-sm border-t border-stone-100">
                  <span>Total Tagihan</span>
                  <span className="text-[#5C3A21]">{formatRupiah(matchedOrder.totalPrice)}</span>
                </div>
              </div>

              {/* JIKA STATUS MENUNGGU PEMBAYARAN: FORM TRANSFER & UPLOAD BUKTI */}
              {matchedOrder.status === 'MENUNGGU_PEMBAYARAN' && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-3">
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-950">
                      <p className="font-bold">Instruksi Pembayaran Transfer Bank / QRIS</p>
                      <p className="text-[11px] mt-0.5 text-amber-800">
                        Silakan transfer sebesar <strong>{formatRupiah(matchedOrder.totalPrice)}</strong> ke rekening resmi berikut:
                      </p>
                    </div>
                  </div>

                  {/* Rekening Resmi Mandiri & BluBCA */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {OFFICIAL_INFO.bankAccounts.map((b) => (
                      <div
                        key={b.bankName}
                        className="p-2.5 rounded-xl bg-white border border-amber-200 flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-bold text-[#3B2618]">{b.bankName}</p>
                          <p className="font-mono font-black text-xs text-[#5C3A21]">
                            {b.accountNumber}
                          </p>
                          <p className="text-[10px] text-[#7D5E46]">a.n. {b.accountHolder}</p>
                        </div>
                        <button
                          type="button"
                          suppressHydrationWarning
                          onClick={() => handleCopy(b.accountNumberRaw, b.bankName)}
                          className="px-2.5 py-1 rounded-lg bg-[#FAF6F0] hover:bg-[#F2E8DC] text-[#5C3A21] font-bold text-[10px] border border-[#E6D8C7] flex items-center gap-1"
                        >
                          {copiedBank === b.bankName ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>{copiedBank === b.bankName ? 'Disalin' : 'Salin'}</span>
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Form Upload Bukti Transfer */}
                  {isUploadingProof ? (
                    <div className="p-3 bg-white rounded-2xl border border-amber-300 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#3B2618]">
                          Upload Bukti Transfer (.jpg/.png)
                        </span>
                        <button
                          type="button"
                          suppressHydrationWarning
                          onClick={() => {
                            setIsUploadingProof(false);
                            setProofPreviewUrl('');
                          }}
                          className="text-xs text-stone-500"
                        >
                          Batal
                        </button>
                      </div>

                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/jpg"
                        onChange={handleFileUpload}
                        className="block w-full text-xs text-stone-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#F2E8DC] file:text-[#5C3A21] hover:file:bg-[#E6D8C7]"
                      />

                      {proofPreviewUrl && (
                        <div className="space-y-2">
                          <img
                            src={proofPreviewUrl}
                            alt="Bukti Transfer Preview"
                            className="max-h-44 rounded-xl border border-stone-200 object-contain mx-auto"
                          />
                          <button
                            type="button"
                            suppressHydrationWarning
                            onClick={() => handleConfirmProof(matchedOrder.id)}
                            className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition"
                          >
                            Kirim Bukti Pembayaran &amp; Ajukan Verifikasi
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      suppressHydrationWarning
                      onClick={() => setIsUploadingProof(true)}
                      className="w-full py-2.5 rounded-xl bg-[#5C3A21] text-white font-bold text-xs hover:bg-[#462B18] transition flex items-center justify-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Bukti Transfer Sekarang</span>
                    </button>
                  )}
                </div>
              )}

              {/* JIKA STATUS READY TO PICK UP */}
              {matchedOrder.status === 'READY_PICKUP' && (
                <div className="p-4 rounded-2xl bg-[#DCFCE7] border border-emerald-300 space-y-1.5">
                  <p className="text-xs font-bold text-[#166534] flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    Pesanan Anda Sudah Ready to Pick Up di Kampus!
                  </p>
                  <p className="text-xs text-emerald-900 leading-relaxed">
                    Silakan temui staf konter AJCUlicious di{' '}
                    <strong>{matchedOrder.pickupLocation}</strong>. Sebutkan nama{' '}
                    <strong>{matchedOrder.customerName}</strong> atau tunjukkan nomor invoice{' '}
                    <strong>#{matchedOrder.invoiceCode}</strong>.
                  </p>
                </div>
              )}

              {/* JIKA STATUS SELESAI: FORM TESTIMONI */}
              {matchedOrder.status === 'SELESAI' && (
                <div className="pt-2">
                  {showReviewForm ? (
                    <form
                      onSubmit={(e) =>
                        handleSendReview(
                          e,
                          matchedOrder.items.map((i) => i.productName).join(', ')
                        )
                      }
                      className="p-3.5 bg-[#FAF6F0] rounded-2xl border border-[#E6D8C7] space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#3B2618]">
                          Tulis Ulasan Teman Kampus
                        </span>
                        <button
                          type="button"
                          suppressHydrationWarning
                          onClick={() => setShowReviewForm(false)}
                          className="text-xs text-stone-500"
                        >
                          Tutup
                        </button>
                      </div>

                      {reviewSuccess ? (
                        <div className="p-3 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold text-center">
                          Terima kasih! Ulasan Anda telah terkirim dan masuk moderasi.
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-[#7D5E46]">Rating:</span>
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  type="button"
                                  suppressHydrationWarning
                                  onClick={() => setReviewRating(star)}
                                  className="p-0.5 focus:outline-none"
                                >
                                  <Star
                                    className={`w-5 h-5 ${
                                      star <= reviewRating
                                        ? 'fill-amber-400 text-amber-400'
                                        : 'text-stone-300'
                                    }`}
                                  />
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              value={reviewName}
                              onChange={(e) => setReviewName(e.target.value)}
                              placeholder="Nama Anda"
                              className="px-3 py-1.5 rounded-xl border border-[#E6D8C7] bg-white text-xs text-[#3B2618]"
                              required
                            />
                            <input
                              type="text"
                              value={reviewFaculty}
                              onChange={(e) => setReviewFaculty(e.target.value)}
                              placeholder="Fakultas / Kampus"
                              className="px-3 py-1.5 rounded-xl border border-[#E6D8C7] bg-white text-xs text-[#3B2618]"
                            />
                          </div>

                          <textarea
                            rows={2}
                            value={reviewComment}
                            onChange={(e) => setReviewComment(e.target.value)}
                            placeholder="Bagaimana rasa cookies/brownies/dimsum favoritmu?"
                            className="w-full px-3 py-1.5 rounded-xl border border-[#E6D8C7] bg-white text-xs text-[#3B2618]"
                            required
                          />

                          <button
                            type="submit"
                            suppressHydrationWarning
                            className="w-full py-2 rounded-xl bg-[#5C3A21] text-white font-bold text-xs hover:bg-[#462B18]"
                          >
                            Kirim Ulasan Saya
                          </button>
                        </>
                      )}
                    </form>
                  ) : (
                    <button
                      type="button"
                      suppressHydrationWarning
                      onClick={() => {
                        setShowReviewForm(true);
                        setReviewName(matchedOrder.customerName);
                      }}
                      className="w-full py-2.5 rounded-2xl border border-[#E6D8C7] bg-[#FAF6F0] text-xs font-bold text-[#5C3A21] hover:bg-[#F2E8DC] flex items-center justify-center gap-1.5 transition"
                    >
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                      <span>Pesanan Telah Selesai! Klik untuk Beri Rating &amp; Ulasan</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
