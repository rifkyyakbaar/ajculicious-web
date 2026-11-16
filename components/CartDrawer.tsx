'use client';

import React, { useState } from 'react';
import {
  X,
  Trash2,
  Plus,
  Minus,
  MessageCircle,
  QrCode,
  Wallet,
  Building2,
  Copy,
  Check,
  MapPin,
  Truck,
  AlertCircle,
  ExternalLink,
  Store,
} from 'lucide-react';
import {
  CartItem,
  PaymentMethod,
  PickupOption,
  OrderRecord,
  BatchPOConfig,
} from '../types/ajculicious';
import { OFFICIAL_INFO } from '../data/initial_data';
import { formatRupiah, buildWhatsAppOrderMessage } from '../utils/formatters';

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
}

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
}: CartDrawerProps) {
  // Form State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [pickupOption, setPickupOption] = useState<PickupOption>('kampus');
  const [pickupLocation, setPickupLocation] = useState(
    batchConfig.pickupLocations[0] || 'Gazebo Fakultas Teknik'
  );
  const [customAddress, setCustomAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('COD');
  const [bankChosen, setBankChosen] = useState<'Mandiri' | 'BluBCA'>('Mandiri');
  const [notes, setNotes] = useState('');

  // UI state
  const [formError, setFormError] = useState('');
  const [createdOrder, setCreatedOrder] = useState<OrderRecord | null>(null);
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);
  const [copiedWaText, setCopiedWaText] = useState(false);

  if (!isOpen) return null;

  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotalPrice = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  const deliveryFee = pickupOption === 'kurir' ? 5000 : 0;
  const grandTotalPrice = subtotalPrice + deliveryFee;

  const handleCopyText = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    if (type === 'wa') {
      setCopiedWaText(true);
      setTimeout(() => setCopiedWaText(false), 2000);
    } else {
      setCopiedAccount(type);
      setTimeout(() => setCopiedAccount(null), 2000);
    }
  };

  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      setFormError('Keranjang belanja Anda masih kosong.');
      return;
    }
    if (!customerName.trim()) {
      setFormError('Mohon masukkan Nama Lengkap Anda.');
      return;
    }
    if (!customerPhone.trim()) {
      setFormError('Mohon masukkan Nomor WhatsApp aktif untuk konfirmasi.');
      return;
    }
    if (pickupOption === 'kurir' && !customAddress.trim()) {
      setFormError('Mohon tuliskan alamat lengkap / nama kost pengiriman.');
      return;
    }

    setFormError('');

    // Generate unique transaction invoice code
    const now = new Date();
    const dateCode = `${String(now.getFullYear()).slice(-2)}${String(
      now.getMonth() + 1
    ).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const randomSeq = Math.floor(100 + Math.random() * 900);
    const invoiceCode = `AJC-${dateCode}-${randomSeq}`;

    const newOrder: OrderRecord = {
      id: `ord-${Date.now()}`,
      invoiceCode,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      pickupOption,
      pickupLocation:
        pickupOption === 'kampus' ? pickupLocation : customAddress.trim(),
      paymentMethod,
      bankChosen: paymentMethod === 'TRANSFER' ? bankChosen : undefined,
      totalPrice: grandTotalPrice,
      status: paymentMethod === 'COD' ? 'LUNAS_PRODUKSI' : 'MENUNGGU_PEMBAYARAN',
      createdAt: `${now.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })}, ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WITA`,
      notes: notes.trim() || undefined,
      items: cart.map((c) => ({
        productId: c.product.id,
        productName: c.product.name,
        quantity: c.quantity,
        price: c.product.price,
        subtotal: c.product.price * c.quantity,
      })),
      customerSegment: 'Mahasiswa',
      isRepeatCustomer: false,
      batchName: `Batch ${batchConfig.batchNumber} - ${batchConfig.batchName}`,
    };

    // Callback to parent: reduces stock quota & stores in order tracker
    onOrderCreated(newOrder);
    setCreatedOrder(newOrder);

    // Automatically trigger WhatsApp redirect
    const waMessage = buildWhatsAppOrderMessage(newOrder);
    const waUrl = `https://wa.me/${OFFICIAL_INFO.whatsappNumber}?text=${encodeURIComponent(
      waMessage
    )}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-end">
      <div className="bg-[#FFFDF9] w-full max-w-xl h-full flex flex-col shadow-2xl border-l border-[#E6D8C7] overflow-hidden animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="px-5 py-4 bg-[#FAF6F0] border-b border-[#E6D8C7] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#5C3A21] text-white flex items-center justify-center font-bold text-sm">
              AJC
            </div>
            <div>
              <h3 className="font-extrabold text-base text-[#3B2618]">
                {createdOrder ? 'Pesanan Berhasil Dicatat!' : 'Keranjang Belanja PO'}
              </h3>
              <p className="text-xs text-[#7D5E46]">
                {createdOrder
                  ? `Invoice #${createdOrder.invoiceCode}`
                  : `Batch PO Aktif &bull; ${totalItemsCount} item di keranjang`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-white hover:bg-[#F2E8DC] text-[#3B2618] border border-[#E6D8C7] transition"
            aria-label="Tutup keranjang"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {createdOrder ? (
            /* ================= VIEW: ORDER CREATED SUCCESS SCREEN ================= */
            <div className="space-y-4">
              <div className="p-4 rounded-3xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6 stroke-[3]" />
                </div>
                <h4 className="font-black text-lg text-emerald-900">
                  Pesanan Berhasil Disimpan!
                </h4>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  Kode Transaksi:{' '}
                  <span className="font-mono font-bold bg-white px-2 py-0.5 rounded-md border border-emerald-300">
                    #{createdOrder.invoiceCode}
                  </span>
                  <br />
                  Pesanan atas nama <strong>{createdOrder.customerName}</strong> telah masuk ke sistem kami dan kuota stok otomatis terpotong.
                </p>
              </div>

              {/* Action Buttons: WhatsApp & Copy */}
              <div className="space-y-2">
                <a
                  href={`https://wa.me/${OFFICIAL_INFO.whatsappNumber}?text=${encodeURIComponent(
                    buildWhatsAppOrderMessage(createdOrder)
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 text-white font-extrabold text-sm hover:bg-emerald-700 transition flex items-center justify-center gap-2 shadow-sm"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span>Buka Chat WhatsApp Resmi (+62 889-8729-0300)</span>
                </a>

                <button
                  type="button"
                  onClick={() =>
                    handleCopyText(buildWhatsAppOrderMessage(createdOrder), 'wa')
                  }
                  className="w-full py-2.5 px-4 rounded-2xl border border-[#E6D8C7] bg-[#FFFDF9] text-[#5C3A21] font-bold text-xs hover:bg-[#F2E8DC] transition flex items-center justify-center gap-2"
                >
                  {copiedWaText ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>Format Chat WhatsApp Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Salin Teks Format WhatsApp</span>
                    </>
                  )}
                </button>
              </div>

              {/* Rincian Rekening jika Transfer */}
              {createdOrder.paymentMethod === 'TRANSFER' && (
                <div className="p-4 rounded-2xl bg-[#F2E8DC] border border-[#E6D8C7] space-y-2.5">
                  <p className="text-xs font-bold text-[#5C3A21]">
                    Silakan Transfer ke Rekening Resmi AJCUlicious:
                  </p>
                  {OFFICIAL_INFO.bankAccounts.map((bank) => (
                    <div
                      key={bank.bankName}
                      className="p-3 bg-white rounded-xl border border-[#E6D8C7] flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-[#3B2618]">{bank.bankName}</span>
                        <p className="font-mono font-black text-sm text-[#5C3A21]">
                          {bank.accountNumber}
                        </p>
                        <p className="text-[11px] text-[#7D5E46]">a.n. {bank.accountHolder}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopyText(bank.accountNumberRaw, bank.bankName)
                        }
                        className="px-3 py-1.5 rounded-lg bg-[#FAF6F0] hover:bg-[#F2E8DC] text-[#5C3A21] font-bold text-[11px] border border-[#E6D8C7] flex items-center gap-1"
                      >
                        {copiedAccount === bank.bankName ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Disalin</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Salin</span>
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                  <p className="text-[11px] text-[#7D5E46] italic">
                    *Unggah foto bukti transfer di menu <strong>&ldquo;Cek Pesanan&rdquo;</strong> atau kirim via chat WhatsApp.
                  </p>
                </div>
              )}

              {/* Pratinjau Teks Pesan WA */}
              <div className="space-y-1">
                <span className="text-xs font-bold text-[#3B2618]">
                  Pratinjau Pesan yang Dikirim:
                </span>
                <pre className="whitespace-pre-wrap font-mono text-[11px] bg-[#FAF6F0] border border-[#E6D8C7] rounded-2xl p-3 text-[#3B2618] max-h-48 overflow-y-auto">
                  {buildWhatsAppOrderMessage(createdOrder)}
                </pre>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCreatedOrder(null);
                    onClearCart();
                    onClose();
                  }}
                  className="w-full py-2.5 rounded-2xl bg-[#5C3A21] text-white font-bold text-xs hover:bg-[#462B18]"
                >
                  Selesai &amp; Kembali ke Halaman Utama
                </button>
              </div>
            </div>
          ) : (
            /* ================= VIEW: NORMAL CART & CHECKOUT FORM ================= */
            <>
              {/* Bagian 1: Daftar Produk di Keranjang */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-[#7D5E46]">
                    Item Menu ({totalItemsCount})
                  </span>
                  {cart.length > 0 && (
                    <button
                      type="button"
                      onClick={onClearCart}
                      className="text-xs text-rose-600 hover:text-rose-800 font-semibold"
                    >
                      Kosongkan Keranjang
                    </button>
                  )}
                </div>

                {cart.length === 0 ? (
                  <div className="text-center py-8 bg-[#FAF6F0] rounded-3xl border border-[#E6D8C7] p-5 space-y-2">
                    <p className="text-sm font-bold text-[#5C3A21]">
                      Keranjang belanja Anda masih kosong
                    </p>
                    <p className="text-xs text-[#7D5E46]">
                      Yuk pilih cookies lumer, brownies legit, atau dimsum hangat di konter!
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onBrowseMenu();
                      }}
                      className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#5C3A21] text-white text-xs font-bold hover:bg-[#462B18]"
                    >
                      <Store className="w-3.5 h-3.5" />
                      <span>Lihat Katalog Menu</span>
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-[#E6D8C7]/60 border border-[#E6D8C7] rounded-3xl bg-white px-4">
                    {cart.map((item) => (
                      <div
                        key={item.product.id}
                        className="py-3 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{item.product.emoji}</span>
                          <div>
                            <p className="font-extrabold text-[#3B2618]">
                              {item.product.name}
                            </p>
                            <p className="text-[#8C6D53]">
                              {formatRupiah(item.product.price)} &times; {item.quantity}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {/* Stepper */}
                          <div className="inline-flex items-center gap-1.5 bg-[#F2E8DC] rounded-xl px-2 py-1">
                            <button
                              type="button"
                              onClick={() => onUpdateQuantity(item.product.id, -1)}
                              className="w-5 h-5 rounded-md bg-white text-[#5C3A21] flex items-center justify-center font-bold"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="font-black min-w-[16px] text-center">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => onUpdateQuantity(item.product.id, 1)}
                              disabled={item.quantity >= item.product.stockQuota}
                              className="w-5 h-5 rounded-md bg-[#5C3A21] text-white flex items-center justify-center font-bold disabled:opacity-40"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          <span className="font-black text-sm text-[#3B2618] min-w-[70px] text-right">
                            {formatRupiah(item.product.price * item.quantity)}
                          </span>

                          <button
                            type="button"
                            onClick={() => onRemoveItem(item.product.id)}
                            className="text-stone-400 hover:text-rose-600 transition p-1"
                            title="Hapus menu"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {cart.length > 0 && (
                /* Bagian 2: Form Checkout WhatsApp */
                <form onSubmit={handleSubmitOrder} className="space-y-4 pt-2">
                  <div className="border-t border-[#E6D8C7] pt-4">
                    <h4 className="font-extrabold text-sm text-[#3B2618] mb-3">
                      Data Pemesan &amp; Pengambilan Kampus
                    </h4>

                    {/* Input Nama & WhatsApp */}
                    <div className="space-y-3">
                      <div>
                        <label
                          htmlFor="buyer-name"
                          className="block text-xs font-bold text-[#3B2618] mb-1"
                        >
                          Nama Pemesan <span className="text-rose-600">*</span>
                        </label>
                        <input
                          id="buyer-name"
                          type="text"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="Contoh: Rina Amanda (Fakultas Teknik)"
                          className="w-full px-3.5 py-2.5 rounded-2xl border border-[#E6D8C7] bg-white text-xs text-[#3B2618] focus:outline-none focus:ring-2 focus:ring-[#5C3A21]"
                          required
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="buyer-phone"
                          className="block text-xs font-bold text-[#3B2618] mb-1"
                        >
                          Nomor WhatsApp Aktif <span className="text-rose-600">*</span>
                        </label>
                        <input
                          id="buyer-phone"
                          type="tel"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          placeholder="Contoh: 081234567890"
                          className="w-full px-3.5 py-2.5 rounded-2xl border border-[#E6D8C7] bg-white text-xs text-[#3B2618] focus:outline-none focus:ring-2 focus:ring-[#5C3A21]"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Pilihan Metode Pengambilan */}
                  <div>
                    <label className="block text-xs font-bold text-[#3B2618] mb-1.5">
                      Pilihan Pengambilan
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPickupOption('kampus')}
                        className={`p-3 rounded-2xl border text-left transition flex items-start gap-2.5 ${
                          pickupOption === 'kampus'
                            ? 'border-[#5C3A21] bg-[#F2E8DC] ring-2 ring-[#5C3A21]/20'
                            : 'border-[#E6D8C7] bg-white hover:bg-[#FAF6F0]'
                        }`}
                      >
                        <MapPin className="w-4 h-4 text-[#5C3A21] shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-xs text-[#3B2618]">
                            Ambil di Kampus
                          </p>
                          <p className="text-[11px] text-[#7D5E46]">Gratis / Free Ongkir</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPickupOption('kurir')}
                        className={`p-3 rounded-2xl border text-left transition flex items-start gap-2.5 ${
                          pickupOption === 'kurir'
                            ? 'border-[#5C3A21] bg-[#F2E8DC] ring-2 ring-[#5C3A21]/20'
                            : 'border-[#E6D8C7] bg-white hover:bg-[#FAF6F0]'
                        }`}
                      >
                        <Truck className="w-4 h-4 text-[#5C3A21] shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-xs text-[#3B2618]">
                            Antar Kurir
                          </p>
                          <p className="text-[11px] text-[#7D5E46]">+Rp5.000 (Area Kampus)</p>
                        </div>
                      </button>
                    </div>

                    {/* Sub-form Pengambilan */}
                    {pickupOption === 'kampus' ? (
                      <div className="mt-2.5">
                        <label
                          htmlFor="pickup-spot"
                          className="block text-[11px] font-semibold text-[#7D5E46] mb-1"
                        >
                          Pilih Titik Kumpul Ambil di Kampus:
                        </label>
                        <select
                          id="pickup-spot"
                          value={pickupLocation}
                          onChange={(e) => setPickupLocation(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-[#E6D8C7] bg-white text-xs text-[#3B2618] focus:outline-none focus:ring-2 focus:ring-[#5C3A21]"
                        >
                          {batchConfig.pickupLocations.map((loc) => (
                            <option key={loc} value={loc}>
                              {loc}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="mt-2.5">
                        <label
                          htmlFor="courier-address"
                          className="block text-[11px] font-semibold text-[#7D5E46] mb-1"
                        >
                          Alamat Pengantaran / Nama Kost:
                        </label>
                        <textarea
                          id="courier-address"
                          rows={2}
                          value={customAddress}
                          onChange={(e) => setCustomAddress(e.target.value)}
                          placeholder="Tuliskan nama kost, kamar, atau nama gedung fakultas..."
                          className="w-full px-3 py-2 rounded-xl border border-[#E6D8C7] bg-white text-xs text-[#3B2618] focus:outline-none focus:ring-2 focus:ring-[#5C3A21]"
                        />
                      </div>
                    )}
                  </div>

                  {/* Pilihan Metode Pembayaran (COD / QRIS / Transfer) */}
                  <div>
                    <label className="block text-xs font-bold text-[#3B2618] mb-1.5">
                      Metode Pembayaran
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('COD')}
                        className={`p-2.5 rounded-2xl border text-center transition flex flex-col items-center gap-1 ${
                          paymentMethod === 'COD'
                            ? 'border-[#5C3A21] bg-[#F2E8DC] ring-2 ring-[#5C3A21]/20 font-bold'
                            : 'border-[#E6D8C7] bg-white hover:bg-[#FAF6F0]'
                        }`}
                      >
                        <Wallet className="w-4 h-4 text-[#5C3A21]" />
                        <span className="text-[11px] text-[#3B2618]">COD Kampus</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                          Bayar di Titik
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('QRIS')}
                        className={`p-2.5 rounded-2xl border text-center transition flex flex-col items-center gap-1 ${
                          paymentMethod === 'QRIS'
                            ? 'border-[#5C3A21] bg-[#F2E8DC] ring-2 ring-[#5C3A21]/20 font-bold'
                            : 'border-[#E6D8C7] bg-white hover:bg-[#FAF6F0]'
                        }`}
                      >
                        <QrCode className="w-4 h-4 text-[#5C3A21]" />
                        <span className="text-[11px] text-[#3B2618]">QRIS Statis</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 font-bold">
                          All E-Wallet
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('TRANSFER')}
                        className={`p-2.5 rounded-2xl border text-center transition flex flex-col items-center gap-1 ${
                          paymentMethod === 'TRANSFER'
                            ? 'border-[#5C3A21] bg-[#F2E8DC] ring-2 ring-[#5C3A21]/20 font-bold'
                            : 'border-[#E6D8C7] bg-white hover:bg-[#FAF6F0]'
                        }`}
                      >
                        <Building2 className="w-4 h-4 text-[#5C3A21]" />
                        <span className="text-[11px] text-[#3B2618]">Transfer Bank</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-sky-100 text-sky-800 font-bold">
                          Mandiri / Blu
                        </span>
                      </button>
                    </div>

                    {/* Sub-view QRIS Statis */}
                    {paymentMethod === 'QRIS' && (
                      <div className="mt-3 p-3.5 rounded-2xl bg-white border border-[#E6D8C7] text-center space-y-2">
                        <p className="text-xs font-bold text-[#3B2618]">
                          Scan QRIS Statis AJCUlicious
                        </p>
                        <div className="w-32 h-32 mx-auto rounded-2xl border-2 border-dashed border-[#5C3A21] bg-[#FAF6F0] flex flex-col items-center justify-center p-2">
                          <QrCode className="w-14 h-14 text-[#5C3A21]" />
                          <span className="text-[10px] font-bold text-[#5C3A21] mt-1">
                            AJCUlicious Merchant
                          </span>
                        </div>
                        <p className="text-[11px] text-[#7D5E46]">
                          Scan sebesar <strong>{formatRupiah(grandTotalPrice)}</strong> lalu lampirkan screenshot bukti transfer di chat WhatsApp.
                        </p>
                      </div>
                    )}

                    {/* Sub-view Transfer Bank Mandiri & BluBCA */}
                    {paymentMethod === 'TRANSFER' && (
                      <div className="mt-3 p-3.5 rounded-2xl bg-[#FAF6F0] border border-[#E6D8C7] space-y-2.5">
                        <p className="text-xs font-bold text-[#3B2618]">
                          Pilih Rekening Tujuan Transfer:
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setBankChosen('Mandiri')}
                            className={`p-2 rounded-xl border text-xs text-left ${
                              bankChosen === 'Mandiri'
                                ? 'bg-white border-[#5C3A21] ring-1 ring-[#5C3A21] font-bold'
                                : 'bg-white/60 border-stone-200 text-[#7D5E46]'
                            }`}
                          >
                            Bank Mandiri
                          </button>
                          <button
                            type="button"
                            onClick={() => setBankChosen('BluBCA')}
                            className={`p-2 rounded-xl border text-xs text-left ${
                              bankChosen === 'BluBCA'
                                ? 'bg-white border-[#5C3A21] ring-1 ring-[#5C3A21] font-bold'
                                : 'bg-white/60 border-stone-200 text-[#7D5E46]'
                            }`}
                          >
                            BluBCA
                          </button>
                        </div>

                        {OFFICIAL_INFO.bankAccounts
                          .filter((b) =>
                            bankChosen === 'Mandiri'
                              ? b.bankName.includes('Mandiri')
                              : b.bankName.includes('BluBCA')
                          )
                          .map((bank) => (
                            <div
                              key={bank.bankName}
                              className="p-3 bg-white rounded-xl border border-[#E6D8C7] flex items-center justify-between text-xs"
                            >
                              <div>
                                <p className="font-bold text-[#3B2618]">{bank.bankName}</p>
                                <p className="font-mono font-black text-sm text-[#5C3A21]">
                                  {bank.accountNumber}
                                </p>
                                <p className="text-[11px] text-[#7D5E46]">
                                  a.n. {bank.accountHolder}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  handleCopyText(bank.accountNumberRaw, bank.bankName)
                                }
                                className="px-3 py-1.5 rounded-lg bg-[#FAF6F0] text-[#5C3A21] font-bold text-xs border border-[#E6D8C7] flex items-center gap-1"
                              >
                                {copiedAccount === bank.bankName ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Tersalin</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>Salin</span>
                                  </>
                                )}
                              </button>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* Catatan Tambahan (Opsional) */}
                  <div>
                    <label
                      htmlFor="order-notes"
                      className="block text-xs font-semibold text-[#7D5E46] mb-1"
                    >
                      Catatan Tambahan (Opsional):
                    </label>
                    <input
                      id="order-notes"
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Contoh: Minta chili oil dipisah, atau titip di meja resepsionis"
                      className="w-full px-3 py-2 rounded-xl border border-[#E6D8C7] bg-white text-xs text-[#3B2618] focus:outline-none focus:ring-2 focus:ring-[#5C3A21]"
                    />
                  </div>

                  {/* Error Notification */}
                  {formError && (
                    <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  {/* Ringkasan Biaya */}
                  <div className="p-3.5 rounded-2xl bg-[#F2E8DC] border border-[#E6D8C7] space-y-1.5 text-xs">
                    <div className="flex justify-between text-[#7D5E46]">
                      <span>Subtotal Menu</span>
                      <span className="font-bold text-[#3B2618]">
                        {formatRupiah(subtotalPrice)}
                      </span>
                    </div>
                    <div className="flex justify-between text-[#7D5E46]">
                      <span>Biaya Pengantaran / Pickup</span>
                      <span className="font-bold text-[#3B2618]">
                        {deliveryFee === 0 ? 'Gratis' : formatRupiah(deliveryFee)}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-[#E6D8C7] flex justify-between font-black text-sm text-[#3B2618]">
                      <span>Total Pembayaran</span>
                      <span className="text-[#5C3A21] font-black text-base">
                        {formatRupiah(grandTotalPrice)}
                      </span>
                    </div>
                  </div>

                  {/* Tombol Eksekusi: Pesan & Redirect ke WhatsApp */}
                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-2xl bg-[#5C3A21] text-white font-extrabold text-sm hover:bg-[#462B18] active:scale-95 transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-5 h-5 text-emerald-300" />
                    <span>Pesan &amp; Redirect ke WhatsApp</span>
                  </button>
                  <p className="text-[11px] text-center text-[#7D5E46]">
                    Format invoice dan rincian pesanan akan otomatis terisi di chat WhatsApp Admin (+62 889-8729-0300).
                  </p>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
