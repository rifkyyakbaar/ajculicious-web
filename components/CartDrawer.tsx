'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Trash2,
  Plus,
  Minus,
  QrCode,
  Wallet,
  Building2,
  Copy,
  Check,
  AlertCircle,
  Store,
  Loader2,
  Upload,
  Calendar,
  Clock,
  MapPin,
  ShieldCheck,
  ShoppingBag,
  Phone,
  User,
  Image as ImageIcon,
  CheckCircle2,
  Edit3,
} from 'lucide-react';
import {
  CartItem,
  OrderRecord,
  BatchPOConfig,
} from '../types/ajculicious';
import { DbPaymentMethod, CreateOrderSuccessData } from '../types/database';
import {
  createOrder,
  updateOrderCustomerPhone,
} from '../actions/order-actions';
import { OFFICIAL_INFO } from '../data/initial_data';
import {
  formatRupiah,
  inspectIndonesianPhoneNumber,
  saveInvoiceToBrowserHistory,
} from '../utils/formatters';
import { useBodyScrollLock } from '../utils/useBodyScrollLock';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQuantity: (productId: string, delta: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  batchConfig: BatchPOConfig;
  onOrderCreated: (newOrder: OrderRecord) => void;
  onBrowseMenu: () => void;
  onOpenOrderTrackerWithCode?: (invoiceCode: string) => void;
  onBlockedByClosedPO?: () => void;
}

const MAX_COD_TOTAL_PRICE = 100000;
const MAX_COD_TOTAL_ITEMS = 6;

export default function CartDrawer({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  batchConfig,
  onOrderCreated,
  onBrowseMenu,
  onOpenOrderTrackerWithCode,
  onBlockedByClosedPO,
}: CartDrawerProps) {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<DbPaymentMethod>('COD');
  const [selectedBankIndex, setSelectedBankIndex] = useState<number>(0);

  // Upload Bukti TF / QRIS State
  const [paymentProofDataUrl, setPaymentProofDataUrl] = useState<string | null>(
    null
  );
  const [paymentProofFileName, setPaymentProofFileName] = useState<string>('');
  const [isCompressingImage, setIsCompressingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Anti-Spam & Anti-Pengguna Iseng States
  const [codCommitmentChecked, setCodCommitmentChecked] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [copiedAccountIdx, setCopiedAccountIdx] = useState<number | null>(null);
  const [copiedInvoice, setCopiedInvoice] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [createdOrderData, setCreatedOrderData] =
    useState<CreateOrderSuccessData | null>(null);

  // State Edit Nomor WA jika pembeli salah ketik di Pop-Up Berhasil Pesan
  const [isEditingPhoneInPopup, setIsEditingPhoneInPopup] = useState(false);
  const [editedPhoneValue, setEditedPhoneValue] = useState('');
  const [isSavingPhoneEdit, setIsSavingPhoneEdit] = useState(false);
  const [phoneEditMessage, setPhoneEditMessage] = useState<string | null>(null);

  const phoneLiveCheck = inspectIndonesianPhoneNumber(customerPhone);

  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotalPrice = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  const isCodLimitExceeded =
    subtotalPrice > MAX_COD_TOTAL_PRICE ||
    totalItemsCount > MAX_COD_TOTAL_ITEMS;

  // Jika total melebihi batas COD, otomatis pindahkan ke QRIS
  useEffect(() => {
    if (isCodLimitExceeded && paymentMethod === 'COD') {
      setPaymentMethod('QRIS');
    }
  }, [isCodLimitExceeded, paymentMethod]);

  useBodyScrollLock(isOpen || Boolean(createdOrderData));

  if (!isOpen) return null;

  const handleCopyBankNumber = (rawNumber: string, idx: number) => {
    navigator.clipboard.writeText(rawNumber);
    setCopiedAccountIdx(idx);
    setTimeout(() => setCopiedAccountIdx(null), 2000);
  };

  const handleCopyInvoice = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedInvoice(true);
    setTimeout(() => setCopiedInvoice(false), 2000);
  };

  // Kompresi gambar bukti TF/QRIS menggunakan Canvas agar cepat disimpan ke Database
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFormError('File bukti pembayaran harus berupa gambar (JPG/PNG/WEBP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setFormError('Ukuran gambar maksimal 10 MB.');
      return;
    }

    setFormError('');
    setIsCompressingImage(true);
    setPaymentProofFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 800;
        let width = img.width;
        let height = img.height;

        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.78);
          setPaymentProofDataUrl(compressedDataUrl);
        } else {
          setPaymentProofDataUrl(event.target?.result as string);
        }
        setIsCompressingImage(false);
      };
      img.onerror = () => {
        setPaymentProofDataUrl(event.target?.result as string);
        setIsCompressingImage(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (honeypot) return; // Bot trap

    if (!batchConfig.isOpen) {
      setFormError(
        'Pre-Order sedang ditutup saat ini. Pesanan baru belum dapat dikirim.'
      );
      onClose();
      onBlockedByClosedPO?.();
      return;
    }

    if (cart.length === 0) {
      setFormError('Keranjang belanja masih kosong.');
      return;
    }

    const cleanName = customerName.trim();
    if (!cleanName || cleanName.length < 2) {
      setFormError('Masukkan nama pemesan (minimal 2 karakter).');
      return;
    }

    const cleanPhone = customerPhone.trim();
    if (!cleanPhone) {
      setFormError('Nomor WhatsApp wajib diisi untuk informasi pengambilan pesanan.');
      return;
    }

    if (paymentMethod === 'COD') {
      if (isCodLimitExceeded) {
        setFormError(
          `Pesanan di atas ${formatRupiah(
            MAX_COD_TOTAL_PRICE
          )} atau lebih dari ${MAX_COD_TOTAL_ITEMS} item wajib menggunakan QRIS atau Transfer Bank.`
        );
        return;
      }
      if (!codCommitmentChecked) {
        setFormError(
          'Harap centang komitmen pengambilan pesanan COD terlebih dahulu.'
        );
        return;
      }
    }

    if (
      (paymentMethod === 'QRIS' || paymentMethod === 'TRANSFER') &&
      !paymentProofDataUrl
    ) {
      setFormError(
        `Silakan upload foto/screenshot bukti pembayaran ${
          paymentMethod === 'TRANSFER' ? 'Transfer Bank' : 'QRIS'
        } terlebih dahulu.`
      );
      return;
    }

    // Cek Cooldown Anti-Spam di browser (mencegah klik spam beruntun dalam 10 detik)
    try {
      const lastOrderTs = Number(
        localStorage.getItem('ajc_last_order_ts') || '0'
      );
      if (Date.now() - lastOrderTs < 10000) {
        setFormError(
          'Mohon tunggu beberapa detik sebelum mengirim pesanan berikutnya (Proteksi Anti-Spam).'
        );
        return;
      }
    } catch {}

    setFormError('');
    setIsSubmitting(true);

    try {
      const selectedBank =
        paymentMethod === 'TRANSFER'
          ? OFFICIAL_INFO.bankAccounts[selectedBankIndex]?.bankName ||
            'Bank Mandiri'
          : null;

      const response = await createOrder({
        customer_name: cleanName,
        customer_phone: cleanPhone,
        payment_method: paymentMethod,
        payment_proof_url:
          paymentMethod === 'QRIS' || paymentMethod === 'TRANSFER'
            ? paymentProofDataUrl
            : null,
        bank_info: selectedBank,
        customer_notes: customerNotes.trim() || null,
        items: cart.map((c) => ({
          product_id: c.product.id,
          quantity: c.quantity,
          custom_name: c.product.name,
        })),
      });

      if (!response.success || !response.data) {
        setFormError(
          response.error || 'Gagal memproses pesanan. Silakan coba lagi.'
        );
        setIsSubmitting(false);
        return;
      }

      try {
        localStorage.setItem('ajc_last_order_ts', String(Date.now()));
      } catch {}

      const serverOrder = response.data;
      saveInvoiceToBrowserHistory(serverOrder.invoice_code);
      setCreatedOrderData(serverOrder);
      setEditedPhoneValue(serverOrder.customer_phone || cleanPhone);

      const uiOrderRecord: OrderRecord = {
        id: serverOrder.order_id,
        invoiceCode: serverOrder.invoice_code,
        customerName: serverOrder.customer_name,
        customerPhone: serverOrder.customer_phone || cleanPhone,
        pickupOption: 'kampus',
        pickupLocation: batchConfig.pickupLocations[0] || 'Konter AJCUlicious',
        paymentMethod: serverOrder.payment_method,
        transferProofUrl: serverOrder.payment_proof_url || undefined,
        totalPrice: serverOrder.total_price,
        status:
          serverOrder.payment_method === 'COD'
            ? 'LUNAS_PRODUKSI'
            : 'MENUNGGU_VERIFIKASI',
        createdAt: new Date().toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        items: serverOrder.items.map((it) => ({
          productId: it.product_id,
          productName: it.product_name,
          quantity: it.quantity,
          price: it.price_at_purchase,
          subtotal: it.subtotal,
        })),
        batchName: batchConfig.batchName,
      };

      onOrderCreated(uiOrderRecord);
      onClearCart();
    } catch {
      setFormError('Terjadi gangguan koneksi saat menyimpan pesanan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinishOrderPopup = () => {
    setCreatedOrderData(null);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerNotes('');
    setPaymentProofDataUrl(null);
    setPaymentProofFileName('');
    setCodCommitmentChecked(false);
    setIsEditingPhoneInPopup(false);
    setPhoneEditMessage(null);
    onClose();
  };

  const handleSaveEditedPhone = async () => {
    if (!createdOrderData) return;
    setIsSavingPhoneEdit(true);
    setPhoneEditMessage(null);

    const res = await updateOrderCustomerPhone(
      createdOrderData.order_id,
      editedPhoneValue
    );
    setIsSavingPhoneEdit(false);

    if (!res.success || !res.data) {
      setPhoneEditMessage(res.error || 'Gagal memperbarui nomor WA.');
      return;
    }

    setCreatedOrderData({
      ...createdOrderData,
      customer_phone: res.data.normalizedPhone,
      wa_notification_sent:
        res.data.waSent || createdOrderData.wa_notification_sent,
    });
    setIsEditingPhoneInPopup(false);
    setPhoneEditMessage(
      res.data.waSent
        ? 'Nomor WA berhasil diperbarui & struk telah dikirim ke WA baru.'
        : 'Nomor WA berhasil diperbarui di sistem.'
    );
  };

  // ================= POP-UP (MODAL) BERHASIL PESAN (ISI: TGL PENGAMBILAN & JAM) =================
  if (createdOrderData) {
    return (
      <div className="fixed inset-0 !m-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white border border-[#EADFD3] rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
          {/* Header Sukses */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8 stroke-[2.2]" />
            </div>
            <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
              Pesanan Berhasil Masuk Sistem Web
            </span>
            <h3 className="font-extrabold text-lg text-[#3B2618]">
              Terima Kasih, {createdOrderData.customer_name}!
            </h3>
            <p className="text-xs text-[#8C6D53]">
              Pesanan Anda telah tercatat otomatis tanpa perlu konfirmasi manual ke WhatsApp.
            </p>
          </div>

          {/* Box Kode Invoice */}
          <div className="p-3.5 rounded-2xl bg-[#FAF6F0] border border-[#EADFD3] flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-[#8C6D53]">
                Kode Invoice Pesanan
              </p>
              <p className="font-mono font-extrabold text-base text-[#3B2618]">
                #{createdOrderData.invoice_code}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleCopyInvoice(createdOrderData.invoice_code)}
              className="px-3 py-1.5 rounded-xl bg-white border border-[#EADFD3] text-xs font-bold text-[#5C3A21] hover:bg-[#F2E8DC] transition flex items-center gap-1.5"
            >
              {copiedInvoice ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Tersalin</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin Kode</span>
                </>
              )}
            </button>
          </div>

          {/* HIGHLIGHT UTAMA: TANGGAL PENGAMBILAN & JAM PENGAMBILAN */}
          <div className="p-4 rounded-2xl bg-amber-50/90 border-2 border-amber-300 space-y-2.5">
            <div className="flex items-center gap-2 text-amber-950 font-extrabold text-xs uppercase tracking-wide">
              <Calendar className="w-4 h-4 text-[#5C3A21]" />
              <span>Informasi Jadwal Pengambilan Pesanan</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <div className="p-3 rounded-xl bg-white border border-amber-200">
                <div className="flex items-center gap-1.5 text-[11px] text-[#8C6D53] font-semibold">
                  <Calendar className="w-3.5 h-3.5 text-[#5C3A21]" />
                  <span>Tanggal Pengambilan</span>
                </div>
                <p className="font-extrabold text-xs sm:text-sm text-[#3B2618] mt-1">
                  {batchConfig.readyPickupDate}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white border border-amber-200">
                <div className="flex items-center gap-1.5 text-[11px] text-[#8C6D53] font-semibold">
                  <Clock className="w-3.5 h-3.5 text-[#5C3A21]" />
                  <span>Jam Pengambilan</span>
                </div>
                <p className="font-extrabold text-xs sm:text-sm text-[#3B2618] mt-1">
                  {batchConfig.readyPickupTime}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 text-xs text-amber-950 bg-white/80 px-3 py-2 rounded-xl border border-amber-200/80">
              <MapPin className="w-4 h-4 text-[#5C3A21] shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Lokasi Ambil: </span>
                <span>
                  {batchConfig.pickupLocations[0] ||
                    'Konter Kampus AJCUlicious'}
                </span>
              </div>
            </div>
          </div>

          {/* Ringkasan Detail Pesanan & Pelanggan + Fitur Edit Nomor WA */}
          <div className="p-4 rounded-2xl border border-[#EADFD3] bg-white space-y-2.5 text-xs">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[#7D5E46]">
                <span>Nomor WhatsApp:</span>
                {!isEditingPhoneInPopup ? (
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[#3B2618]">
                      {createdOrderData.customer_phone}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditedPhoneValue(createdOrderData.customer_phone);
                        setIsEditingPhoneInPopup(true);
                        setPhoneEditMessage(null);
                      }}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#FAF6F0] hover:bg-[#F2E8DC] text-[#5C3A21] border border-[#EADFD3] text-[10px] font-bold transition"
                    >
                      <Edit3 className="w-2.5 h-2.5" />
                      <span>Ubah Nomor</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditingPhoneInPopup(false)}
                    className="text-[10px] text-[#8C6D53] hover:underline"
                  >
                    Batal
                  </button>
                )}
              </div>

              {isEditingPhoneInPopup && (
                <div className="flex items-center gap-1.5 pt-1">
                  <input
                    type="tel"
                    value={editedPhoneValue}
                    onChange={(e) => setEditedPhoneValue(e.target.value)}
                    placeholder="Masukkan nomor WA yang benar"
                    className="flex-1 px-3 py-1.5 rounded-xl border border-[#EADFD3] bg-[#FAF6F0] text-xs font-mono text-[#3B2618]"
                  />
                  <button
                    type="button"
                    disabled={isSavingPhoneEdit}
                    onClick={handleSaveEditedPhone}
                    className="px-3 py-1.5 rounded-xl bg-[#5C3A21] text-white font-bold text-xs hover:bg-[#462B18] disabled:opacity-60"
                  >
                    {isSavingPhoneEdit ? 'Cek WA...' : 'Simpan'}
                  </button>
                </div>
              )}

              {phoneEditMessage && (
                <p
                  className={`text-[11px] font-semibold ${
                    phoneEditMessage.startsWith('Nomor WA berhasil')
                      ? 'text-emerald-700'
                      : 'text-rose-600'
                  }`}
                >
                  {phoneEditMessage}
                </p>
              )}

              {createdOrderData.wa_notification_sent && (
                <p className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1 font-medium">
                  Struk &amp; jadwal pengambilan telah dikirim otomatis ke WhatsApp Anda.
                </p>
              )}
            </div>
            <div className="flex justify-between text-[#7D5E46]">
              <span>Metode Pembayaran:</span>
              <span className="font-bold text-[#3B2618]">
                {createdOrderData.payment_method === 'TRANSFER'
                  ? `Transfer Bank (${createdOrderData.bank_info || 'Rekening AJC'})`
                  : createdOrderData.payment_method}
              </span>
            </div>
            {(createdOrderData.payment_method === 'QRIS' ||
              createdOrderData.payment_method === 'TRANSFER') && (
              <div className="flex justify-between text-[#7D5E46]">
                <span>Bukti Pembayaran:</span>
                <span className="font-bold text-emerald-700 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  Sudah Diunggah
                </span>
              </div>
            )}

            <div className="border-t border-[#F4ECE1] pt-2 space-y-1">
              {createdOrderData.items.map((item) => (
                <div
                  key={item.product_id}
                  className="flex justify-between text-[#3B2618]"
                >
                  <span>
                    {item.quantity}x {item.product_name}
                  </span>
                  <span className="font-semibold">
                    {formatRupiah(item.subtotal)}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-[#EADFD3] pt-2 flex justify-between items-center text-sm font-extrabold text-[#3B2618]">
              <span>Total Pembayaran</span>
              <span className="text-[#5C3A21]">
                {formatRupiah(createdOrderData.total_price)}
              </span>
            </div>
          </div>

          {/* Tombol Aksi Pop-up */}
          <div className="space-y-2 pt-1">
            {onOpenOrderTrackerWithCode && (
              <button
                type="button"
                onClick={() => {
                  const code = createdOrderData.invoice_code;
                  handleFinishOrderPopup();
                  onOpenOrderTrackerWithCode(code);
                }}
                className="w-full py-2.5 px-4 rounded-xl border border-[#EADFD3] bg-[#FAF6F0] text-[#5C3A21] font-bold text-xs hover:bg-[#F2E8DC] transition"
              >
                Cek Status Pesanan Saya
              </button>
            )}

            <button
              type="button"
              onClick={handleFinishOrderPopup}
              className="w-full py-3 rounded-xl bg-[#5C3A21] text-white font-bold text-xs hover:bg-[#462B18] transition"
            >
              Selesai &amp; Kembali ke Beranda
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ================= DRAWER KERANJANG & FORM PEMESANAN WEB =================
  return (
    <div className="fixed inset-0 !m-0 z-[60] bg-black/55 backdrop-blur-sm flex items-center justify-end">
      <div className="bg-white w-full max-w-md h-full flex flex-col shadow-2xl border-l border-[#EADFD3] overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#EADFD3] flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-base text-[#3B2618]">
              Keranjang Belanja
            </h3>
            <p className="text-xs text-[#8C6D53]">
              {totalItemsCount} item dipilih &bull; Pengambilan:{' '}
              <strong className="text-[#5C3A21]">
                {batchConfig.readyPickupDate}
              </strong>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[#FAF6F0] text-[#3B2618] transition"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Daftar Item */}
          <div className="space-y-2.5">
            {cart.length === 0 ? (
              <div className="text-center py-10 bg-[#FAF6F0] rounded-2xl border border-[#EADFD3] p-5 space-y-2">
                <p className="text-sm font-bold text-[#3B2618]">
                  Keranjang masih kosong
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onBrowseMenu();
                  }}
                  className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#5C3A21] text-white text-xs font-semibold hover:bg-[#462B18]"
                >
                  <Store className="w-3.5 h-3.5" />
                  <span>Pilih Menu</span>
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#7D5E46]">
                    Daftar Pesanan
                  </span>
                  <button
                    type="button"
                    onClick={onClearCart}
                    className="text-rose-600 hover:underline font-medium"
                  >
                    Kosongkan
                  </button>
                </div>

                <div className="divide-y divide-[#F4ECE1] border border-[#EADFD3] rounded-2xl bg-white px-3.5">
                  {cart.map((item) => (
                    <div
                      key={item.product.id}
                      className="py-3 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {item.product.imageUrl &&
                        item.product.imageUrl !==
                          '/images/storefront-counter.jpg' ? (
                          <img
                            src={item.product.imageUrl}
                            alt={item.product.name}
                            className="w-10 h-12 rounded-lg object-cover border border-[#EADFD3] shrink-0"
                          />
                        ) : (
                          <span className="text-xl shrink-0">
                            {item.product.emoji}
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="font-bold text-[#3B2618] truncate">
                            {item.product.name}
                          </p>
                          <p className="text-[#8C6D53]">
                            {formatRupiah(item.product.price)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <div className="inline-flex items-center gap-1.5 bg-[#FAF6F0] border border-[#EADFD3] rounded-lg px-1.5 py-0.5">
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateQuantity(item.product.id, -1)
                            }
                            className="w-5 h-5 rounded bg-white text-[#5C3A21] flex items-center justify-center"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="font-bold min-w-[16px] text-center">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateQuantity(item.product.id, 1)
                            }
                            disabled={item.quantity >= item.product.stockQuota}
                            className="w-5 h-5 rounded bg-[#5C3A21] text-white flex items-center justify-center disabled:opacity-40"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => onRemoveItem(item.product.id)}
                          className="text-stone-400 hover:text-rose-600 p-1"
                          title="Hapus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {cart.length > 0 && !batchConfig.isOpen && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-1">
              <p className="font-bold">Pre-Order Sedang Ditutup</p>
              <p className="text-[11px]">
                Pemesanan baru sementara tidak dapat diproses sampai Batch PO berikutnya dibuka oleh admin.
              </p>
            </div>
          )}

          {cart.length > 0 && (
            <form onSubmit={handleSubmitOrder} className="space-y-4 pt-1">
              {/* Honeypot anti-bot */}
              <input
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                className="hidden"
                aria-hidden="true"
              />

              {/* Input 1: Nama Pemesan */}
              <div>
                <label
                  htmlFor="buyer-name"
                  className="block text-xs font-bold text-[#3B2618] mb-1.5"
                >
                  Nama Pemesan <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-[#8C6D53] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="buyer-name"
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Masukkan nama lengkap Anda"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#EADFD3] bg-[#FAF6F0]/50 text-xs text-[#3B2618] focus:outline-none focus:ring-2 focus:ring-[#5C3A21] focus:bg-white"
                    required
                  />
                </div>
              </div>

              {/* Input 2: Nomor WhatsApp Pelanggan */}
              <div>
                <label
                  htmlFor="buyer-phone"
                  className="block text-xs font-bold text-[#3B2618] mb-1.5"
                >
                  Nomor WhatsApp Aktif <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-[#8C6D53] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="buyer-phone"
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Contoh: 081234567890"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#EADFD3] bg-[#FAF6F0]/50 text-xs text-[#3B2618] focus:outline-none focus:ring-2 focus:ring-[#5C3A21] focus:bg-white"
                    required
                  />
                </div>
                {customerPhone.trim().length >= 4 ? (
                  phoneLiveCheck.valid ? (
                    <p className="text-[10px] text-emerald-700 font-semibold mt-1">
                      Kartu {phoneLiveCheck.operator} ({phoneLiveCheck.normalized.length}{' '}
                      digit) &bull; Akan diverifikasi otomatis ke WhatsApp
                    </p>
                  ) : (
                    <p className="text-[10px] text-rose-600 font-semibold mt-1">
                      {phoneLiveCheck.error}
                    </p>
                  )
                ) : (
                  <p className="text-[10px] text-[#8C6D53] mt-1">
                    Sistem mengecek keaktifan nomor WA &amp; mengirim struk otomatis ke WA Anda.
                  </p>
                )}
              </div>

              {/* Input 3: Metode Pembayaran (COD, QRIS, TRANSFER / TF) */}
              <div>
                <label className="block text-xs font-bold text-[#3B2618] mb-1.5">
                  Metode Pembayaran <span className="text-rose-600">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {/* Pilihan 1: COD */}
                  <button
                    type="button"
                    disabled={isCodLimitExceeded}
                    onClick={() => setPaymentMethod('COD')}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between gap-1 ${
                      isCodLimitExceeded
                        ? 'border-stone-200 bg-stone-100 opacity-50 cursor-not-allowed'
                        : paymentMethod === 'COD'
                        ? 'border-[#5C3A21] bg-[#FAF6F0] ring-1 ring-[#5C3A21] font-bold'
                        : 'border-[#EADFD3] bg-white hover:bg-[#FAF6F0]/50'
                    }`}
                  >
                    <Wallet className="w-4 h-4 text-[#5C3A21]" />
                    <div>
                      <p className="text-xs text-[#3B2618] font-bold">COD</p>
                      <p className="text-[10px] text-[#8C6D53] font-normal leading-tight">
                        Bayar saat ambil
                      </p>
                    </div>
                  </button>

                  {/* Pilihan 2: QRIS */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('QRIS')}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between gap-1 ${
                      paymentMethod === 'QRIS'
                        ? 'border-[#5C3A21] bg-[#FAF6F0] ring-1 ring-[#5C3A21] font-bold'
                        : 'border-[#EADFD3] bg-white hover:bg-[#FAF6F0]/50'
                    }`}
                  >
                    <QrCode className="w-4 h-4 text-[#5C3A21]" />
                    <div>
                      <p className="text-xs text-[#3B2618] font-bold">QRIS</p>
                      <p className="text-[10px] text-[#8C6D53] font-normal leading-tight">
                        Scan semua E-Wallet
                      </p>
                    </div>
                  </button>

                  {/* Pilihan 3: TF (Transfer Bank) */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('TRANSFER')}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between gap-1 ${
                      paymentMethod === 'TRANSFER'
                        ? 'border-[#5C3A21] bg-[#FAF6F0] ring-1 ring-[#5C3A21] font-bold'
                        : 'border-[#EADFD3] bg-white hover:bg-[#FAF6F0]/50'
                    }`}
                  >
                    <Building2 className="w-4 h-4 text-[#5C3A21]" />
                    <div>
                      <p className="text-xs text-[#3B2618] font-bold">
                        Transfer (TF)
                      </p>
                      <p className="text-[10px] text-[#8C6D53] font-normal leading-tight">
                        Mandiri / BluBCA
                      </p>
                    </div>
                  </button>
                </div>

                {isCodLimitExceeded && (
                  <p className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 mt-2">
                    <strong>Ketentuan COD:</strong> Pesanan di atas{' '}
                    {formatRupiah(MAX_COD_TOTAL_PRICE)} atau &gt;{MAX_COD_TOTAL_ITEMS}{' '}
                    item wajib menggunakan <strong>QRIS</strong> atau{' '}
                    <strong>Transfer Bank (TF)</strong>.
                  </p>
                )}
              </div>

              {/* TAMPILKAN QRIS JIKA PILIH QRIS */}
              {paymentMethod === 'QRIS' && (
                <div className="p-4 rounded-2xl bg-[#FAF6F0] border border-[#EADFD3] text-center space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#3B2618]">
                      Scan QRIS AJCUlicious
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-white border border-[#EADFD3] text-[10px] font-bold text-[#5C3A21]">
                      NMID: {OFFICIAL_INFO.qris.nmid}
                    </span>
                  </div>

                  {/* Visual QRIS Resmi AJCUlicious */}
                  <div className="max-w-[260px] mx-auto rounded-2xl border-2 border-[#5C3A21] bg-white overflow-hidden shadow-xs">
                    <img
                      src={OFFICIAL_INFO.qris.imageUrl}
                      alt={`QRIS ${OFFICIAL_INFO.qris.merchantName}`}
                      className="w-full h-auto block"
                    />
                    <div className="px-3 py-2 bg-[#FAF6F0] border-t border-[#EADFD3] text-center">
                      <span className="text-[11px] font-bold text-emerald-700">
                        Nominal Bayar: {formatRupiah(subtotalPrice)}
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-[#7D5E46]">
                    Scan kode QRIS di atas sebesar{' '}
                    <strong className="text-[#3B2618]">
                      {formatRupiah(subtotalPrice)}
                    </strong>
                    , lalu unggah screenshot bukti bayar di bawah ini.
                  </p>
                </div>
              )}

              {/* TAMPILKAN REKENING BANK JIKA PILIH TRANSFER (TF) */}
              {paymentMethod === 'TRANSFER' && (
                <div className="p-3.5 rounded-2xl bg-[#FAF6F0] border border-[#EADFD3] space-y-2.5">
                  <p className="text-xs font-bold text-[#3B2618]">
                    Pilih Rekening Tujuan Transfer ({formatRupiah(subtotalPrice)}):
                  </p>
                  <div className="space-y-2">
                    {OFFICIAL_INFO.bankAccounts.map((acc, idx) => (
                      <div
                        key={acc.bankName}
                        onClick={() => setSelectedBankIndex(idx)}
                        className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between gap-2 ${
                          selectedBankIndex === idx
                            ? 'bg-white border-[#5C3A21] ring-1 ring-[#5C3A21]'
                            : 'bg-white/70 border-[#EADFD3]'
                        }`}
                      >
                        <div className="text-xs">
                          <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-[#FAF6F0] text-[#5C3A21] border border-[#EADFD3]">
                            {acc.bankName}
                          </span>
                          <p className="font-mono font-extrabold text-sm text-[#3B2618] mt-1">
                            {acc.accountNumber}
                          </p>
                          <p className="text-[11px] text-[#8C6D53]">
                            a.n. {acc.accountHolder}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            handleCopyBankNumber(acc.accountNumberRaw, idx);
                          }}
                          className="px-2.5 py-1.5 rounded-lg border border-[#EADFD3] bg-[#FAF6F0] hover:bg-[#F2E8DC] text-[11px] font-semibold text-[#5C3A21] flex items-center gap-1 shrink-0"
                        >
                          {copiedAccountIdx === idx ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>Disalin</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Salin</span>
                            </>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* FITUR UPLOAD BUKTI TF / QRIS */}
              {(paymentMethod === 'QRIS' || paymentMethod === 'TRANSFER') && (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-[#3B2618]">
                    Upload Bukti {paymentMethod === 'TRANSFER' ? 'Transfer (TF)' : 'QRIS'}{' '}
                    <span className="text-rose-600">*</span>
                  </label>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {!paymentProofDataUrl ? (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isCompressingImage}
                      className="w-full py-4 px-4 rounded-2xl border-2 border-dashed border-[#D8C2A8] bg-[#FAF6F0]/60 hover:bg-[#FAF6F0] text-[#5C3A21] transition flex flex-col items-center justify-center gap-1.5"
                    >
                      {isCompressingImage ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin text-[#5C3A21]" />
                          <span className="text-xs font-semibold">
                            Memproses gambar...
                          </span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-5 h-5 text-[#5C3A21]" />
                          <span className="text-xs font-bold">
                            Klik untuk Pilih Foto / Screenshot Bukti Bayar
                          </span>
                          <span className="text-[10px] text-[#8C6D53]">
                            Format JPG, PNG, atau WEBP
                          </span>
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="p-3 rounded-2xl border border-emerald-300 bg-emerald-50/50 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-emerald-900 flex items-center gap-1.5 truncate">
                          <ImageIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="truncate">
                            {paymentProofFileName || 'Bukti_Pembayaran.jpg'}
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setPaymentProofDataUrl(null);
                            setPaymentProofFileName('');
                            if (fileInputRef.current) {
                              fileInputRef.current.value = '';
                            }
                          }}
                          className="text-[11px] font-bold text-rose-600 hover:underline shrink-0"
                        >
                          Ganti File
                        </button>
                      </div>
                      <img
                        src={paymentProofDataUrl}
                        alt="Preview Bukti Pembayaran"
                        className="w-full max-h-44 object-contain rounded-xl border border-[#EADFD3] bg-white"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* KOMITMEN ANTI-SPAM KHUSUS COD */}
              {paymentMethod === 'COD' && (
                <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-950">
                    <ShieldCheck className="w-4 h-4 text-[#5C3A21] shrink-0" />
                    <span>Ketentuan COD (Anti-Spam &amp; Order Fiktif)</span>
                  </div>
                  <label className="flex items-start gap-2 cursor-pointer text-[11px] text-[#462B18] leading-relaxed">
                    <input
                      type="checkbox"
                      checked={codCommitmentChecked}
                      onChange={(e) =>
                        setCodCommitmentChecked(e.target.checked)
                      }
                      className="mt-0.5 rounded accent-[#5C3A21]"
                    />
                    <span>
                      Saya menyatakan nomor WA di atas aktif dan berkomitmen
                      mengambil serta membayar pesanan pada{' '}
                      <strong>
                        {batchConfig.readyPickupDate} ({batchConfig.readyPickupTime})
                      </strong>{' '}
                      di{' '}
                      <strong>
                        {batchConfig.pickupLocations?.[0] ||
                          'Konter Kampus AJCUlicious'}
                      </strong>
                      .
                    </span>
                  </label>
                </div>
              )}

              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Total */}
              <div className="p-3.5 rounded-xl bg-[#FAF6F0] border border-[#EADFD3] flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-[#7D5E46] block">
                    Total Pembayaran
                  </span>
                  <span className="text-[10px] text-[#8C6D53]">
                    Pesan langsung melalui web
                  </span>
                </div>
                <span className="text-base font-extrabold text-[#3B2618]">
                  {formatRupiah(subtotalPrice)}
                </span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || isCompressingImage}
                className="w-full py-3 rounded-xl bg-[#5C3A21] text-white font-bold text-xs hover:bg-[#462B18] active:scale-95 disabled:opacity-60 transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memproses Pesanan...</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4" />
                    <span>Pesan Sekarang</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
