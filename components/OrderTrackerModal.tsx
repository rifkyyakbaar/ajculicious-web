'use client';

import React, { useState } from 'react';
import {
  X,
  Search,
  Copy,
  Check,
  Upload,
  Image as ImageIcon,
  Star,
  CheckCircle2,
  Clock,
  Sparkles,
  MessageCircle,
  AlertCircle,
} from 'lucide-react';
import { OrderRecord, OrderStatus, ReviewRecord } from '../types/ajculicious';
import { OFFICIAL_INFO } from '../data/initial_data';
import { formatRupiah } from '../utils/formatters';
import { useBodyScrollLock } from '../utils/useBodyScrollLock';

interface OrderTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: OrderRecord[];
  onUploadProof: (orderId: string, proofUrl: string) => void;
  onSubmitReview: (review: Omit<ReviewRecord, 'id' | 'isApproved'>) => void;
}

export default function OrderTrackerModal({
  isOpen,
  onClose,
  orders,
  onUploadProof,
  onSubmitReview,
}: OrderTrackerModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedBank, setCopiedBank] = useState<string | null>(null);

  // Upload proof local state per order
  const [selectedOrderIdForProof, setSelectedOrderIdForProof] = useState<string | null>(null);
  const [proofPreviewUrl, setProofPreviewUrl] = useState<string>('');

  // Review state for completed orders
  const [reviewOrderId, setReviewOrderId] = useState<string | null>(null);
  const [reviewName, setReviewName] = useState('');
  const [reviewFaculty, setReviewFaculty] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState(false);

  useBodyScrollLock(isOpen);

  if (!isOpen) return null;

  const filteredOrders = orders.filter((o) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      o.invoiceCode.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      o.customerPhone.includes(q)
    );
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
    setSelectedOrderIdForProof(null);
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
      setReviewOrderId(null);
      setReviewSuccess(false);
      setReviewName('');
      setReviewComment('');
    }, 2500);
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'MENUNGGU_PEMBAYARAN':
        return (
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 font-bold border border-amber-200">
            Menunggu Pembayaran
          </span>
        );
      case 'MENUNGGU_VERIFIKASI':
        return (
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-sky-100 text-sky-800 font-bold border border-sky-200">
            Menunggu Verifikasi Admin
          </span>
        );
      case 'LUNAS_PRODUKSI':
        return (
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
            Lunas &bull; Antrean Dapur
          </span>
        );
      case 'READY_PICKUP':
        return (
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-[#DCFCE7] text-[#166534] font-extrabold border border-emerald-400 shadow-2xs animate-pulse">
            Ready to Pick Up!
          </span>
        );
      case 'SELESAI':
        return (
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-600 text-white font-bold">
            Selesai
          </span>
        );
      case 'DITOLAK':
        return (
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 font-bold border border-rose-200">
            Dibatalkan / Tolak
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 !m-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="bg-[#FFFDF9] border border-[#E6D8C7] rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-[#FAF6F0] border-b border-[#E6D8C7] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#5C3A21] text-white flex items-center justify-center font-bold text-sm">
              AJC
            </div>
            <div>
              <h3 className="font-extrabold text-base text-[#3B2618]">
                Lacak Status Pesanan &amp; Konfirmasi Bayar
              </h3>
              <p className="text-xs text-[#7D5E46]">
                Cek antrean pesanan, upload bukti transfer, atau klaim pengambilan di kampus
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-white hover:bg-[#F2E8DC] text-[#3B2618] border border-[#E6D8C7] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar Input */}
        <div className="p-4 border-b border-[#E6D8C7] bg-[#FFFDF9]">
          <div className="relative">
            <Search className="w-4 h-4 text-[#8C6D53] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari Kode Invoice (contoh: AJC-261117-001) atau Nama Anda..."
              className="w-full pl-9 pr-4 py-2.5 rounded-2xl border border-[#E6D8C7] bg-white text-xs text-[#3B2618] focus:outline-none focus:ring-2 focus:ring-[#5C3A21] shadow-2xs"
            />
          </div>
        </div>

        {/* Modal Body: Order List */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12 bg-[#FAF6F0] rounded-3xl border border-[#E6D8C7] p-6 space-y-2">
              <p className="text-sm font-bold text-[#5C3A21]">
                Pesanan tidak ditemukan
              </p>
              <p className="text-xs text-[#7D5E46]">
                Pastikan kode invoice atau nama yang Anda masukkan sudah benar.
              </p>
            </div>
          ) : (
            filteredOrders.map((order) => (
              <div
                key={order.id}
                className="p-4 sm:p-5 rounded-3xl border border-[#E6D8C7] bg-white space-y-3 shadow-2xs hover:shadow-xs transition"
              >
                {/* Header Card Order */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-[#5C3A21] bg-[#F2E8DC] px-2.5 py-1 rounded-md border border-[#E6D8C7]">
                      #{order.invoiceCode}
                    </span>
                    <span className="font-extrabold text-sm text-[#3B2618]">
                      {order.customerName}
                    </span>
                  </div>
                  <div>{getStatusBadge(order.status)}</div>
                </div>

                {/* Info Pengambilan & Metode Bayar */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-[#FAF6F0] p-3 rounded-2xl border border-[#E6D8C7]/50">
                  <div>
                    <span className="text-[#7D5E46] block text-[11px]">Pengambilan:</span>
                    <span className="font-semibold text-[#3B2618]">
                      {order.pickupOption === 'kampus' ? 'Ambil di Kampus' : 'Antar Kurir'} &bull;{' '}
                      {order.pickupLocation}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#7D5E46] block text-[11px]">Pembayaran:</span>
                    <span className="font-semibold text-[#3B2618]">
                      {order.paymentMethod === 'COD'
                        ? 'COD (Bayar saat ambil)'
                        : order.paymentMethod === 'QRIS'
                        ? 'QRIS Statis'
                        : `Transfer ${order.bankChosen || 'Bank'}`}
                    </span>
                  </div>
                </div>

                {/* Items List */}
                <div className="text-xs text-[#462B18] space-y-1 pl-1">
                  {order.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span>
                        {it.quantity}x {it.productName}
                      </span>
                      <span className="font-bold">{formatRupiah(it.subtotal)}</span>
                    </div>
                  ))}
                </div>

                {/* Total & Tanggal */}
                <div className="pt-2 border-t border-[#E6D8C7]/60 flex items-center justify-between text-xs">
                  <span className="text-[#7D5E46]">{order.createdAt}</span>
                  <span className="font-black text-sm text-[#5C3A21]">
                    Total: {formatRupiah(order.totalPrice)}
                  </span>
                </div>

                {/* ================= SECTION: MENUNGGU PEMBAYARAN (UPLOAD BUKTI) ================= */}
                {order.status === 'MENUNGGU_PEMBAYARAN' && (
                  <div className="mt-3 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 space-y-3">
                    <div className="flex items-start gap-2">
                      <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <div className="text-xs text-amber-950">
                        <p className="font-bold">Menunggu Pembayaran Transfer / QRIS</p>
                        <p className="text-[11px] mt-0.5 text-amber-800">
                          Silakan bayar sebesar <strong>{formatRupiah(order.totalPrice)}</strong> melalui {order.paymentMethod === 'QRIS' ? 'QRIS resmi AJCUlicious' : 'rekening resmi berikut'} lalu upload bukti pembayaran:
                        </p>
                      </div>
                    </div>

                    {order.paymentMethod === 'QRIS' ? (
                      <div className="max-w-[240px] mx-auto rounded-2xl border-2 border-[#5C3A21] bg-white overflow-hidden">
                        <img
                          src={OFFICIAL_INFO.qris.imageUrl}
                          alt={`QRIS ${OFFICIAL_INFO.qris.merchantName}`}
                          className="w-full h-auto block"
                        />
                        <div className="px-3 py-1.5 bg-[#FAF6F0] border-t border-[#EADFD3] text-center text-[10px] font-bold text-[#5C3A21]">
                          NMID: {OFFICIAL_INFO.qris.nmid} • {formatRupiah(order.totalPrice)}
                        </div>
                      </div>
                    ) : (
                      /* Bank Mandiri & BluBCA Cards */
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
                    )}

                    {/* Form Upload Bukti Transfer */}
                    {selectedOrderIdForProof === order.id ? (
                      <div className="p-3 bg-white rounded-2xl border border-amber-300 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#3B2618]">
                            Upload File Bukti Transfer (.jpg/.png)
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedOrderIdForProof(null);
                              setProofPreviewUrl('');
                            }}
                            className="text-xs text-stone-500 hover:text-stone-800"
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
                            <p className="text-[11px] font-semibold text-[#7D5E46]">
                              Pratinjau Bukti Transfer:
                            </p>
                            <img
                              src={proofPreviewUrl}
                              alt="Pratinjau Bukti Bayar"
                              className="max-h-40 rounded-xl border border-stone-200 object-contain mx-auto"
                            />
                            <button
                              type="button"
                              onClick={() => handleConfirmProof(order.id)}
                              className="w-full py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition"
                            >
                              Kirim Bukti &amp; Ajukan Verifikasi
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSelectedOrderIdForProof(order.id)}
                        className="w-full py-2 rounded-xl bg-[#5C3A21] text-white font-bold text-xs hover:bg-[#462B18] transition flex items-center justify-center gap-1.5"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Bukti Transfer Sekarang</span>
                      </button>
                    )}
                  </div>
                )}

                {/* ================= SECTION: READY TO PICK UP NOTIFICATION ================= */}
                {order.status === 'READY_PICKUP' && (
                  <div className="p-3.5 rounded-2xl bg-[#DCFCE7] border border-emerald-300 space-y-1.5">
                    <p className="text-xs font-bold text-[#166534] flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      Pesanan Siap Diambil di Kampus!
                    </p>
                    <p className="text-[11px] text-emerald-900 leading-relaxed">
                      Silakan temui staf konter AJCUlicious di{' '}
                      <strong>{order.pickupLocation}</strong>. Tunjukkan kode invoice ini{' '}
                      <strong>#{order.invoiceCode}</strong> kepada staf saat serah terima.
                    </p>
                  </div>
                )}

                {/* ================= SECTION: STATUS SELESAI (FORM TESTIMONI) ================= */}
                {order.status === 'SELESAI' && (
                  <div className="mt-2 pt-2 border-t border-[#E6D8C7]">
                    {reviewOrderId === order.id ? (
                      <form
                        onSubmit={(e) =>
                          handleSendReview(
                            e,
                            order.items.map((i) => i.productName).join(', ')
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
                            onClick={() => setReviewOrderId(null)}
                            className="text-xs text-stone-500"
                          >
                            Tutup
                          </button>
                        </div>

                        {reviewSuccess ? (
                          <div className="p-3 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold text-center">
                            Terima kasih! Ulasan Anda telah terkirim dan masuk moderasi Admin.
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
                              className="w-full py-2 rounded-xl bg-[#5C3A21] text-white font-bold text-xs hover:bg-[#462B18]"
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
                          setReviewName(order.customerName);
                        }}
                        className="text-xs font-bold text-[#5C3A21] hover:underline flex items-center gap-1"
                      >
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>Pesanan selesai! Klik untuk beri ulasan &amp; rating</span>
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
