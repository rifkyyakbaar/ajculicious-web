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
  Copy,
  Check,
  AlertCircle,
  Store,
  Loader2,
} from 'lucide-react';
import {
  CartItem,
  OrderRecord,
  BatchPOConfig,
} from '../types/ajculicious';
import { DbPaymentMethod, CreateOrderSuccessData } from '../types/database';
import { createOrder } from '../actions/order-actions';
import { OFFICIAL_INFO } from '../data/initial_data';
import { formatRupiah } from '../utils/formatters';

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
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<DbPaymentMethod>('COD');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [createdOrderData, setCreatedOrderData] =
    useState<CreateOrderSuccessData | null>(null);
  const [copiedWaText, setCopiedWaText] = useState(false);

  if (!isOpen) return null;

  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotalPrice = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  const handleCopyWaText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedWaText(true);
    setTimeout(() => setCopiedWaText(false), 2000);
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      setFormError('Keranjang belanja masih kosong.');
      return;
    }
    if (!customerName.trim() || customerName.trim().length < 2) {
      setFormError('Masukkan nama pemesan (minimal 2 karakter).');
      return;
    }

    setFormError('');
    setIsSubmitting(true);

    try {
      const response = await createOrder({
        customer_name: customerName.trim(),
        payment_method: paymentMethod,
        items: cart.map((c) => ({
          product_id: c.product.id,
          quantity: c.quantity,
        })),
      });

      if (!response.success || !response.data) {
        setFormError(
          response.error || 'Gagal memproses pesanan. Silakan coba lagi.'
        );
        setIsSubmitting(false);
        return;
      }

      const serverOrder = response.data;
      setCreatedOrderData(serverOrder);

      const uiOrderRecord: OrderRecord = {
        id: serverOrder.order_id,
        invoiceCode: serverOrder.invoice_code,
        customerName: serverOrder.customer_name,
        customerPhone: '-',
        pickupOption: 'kampus',
        pickupLocation: batchConfig.pickupLocations[0] || '-',
        paymentMethod: serverOrder.payment_method,
        totalPrice: serverOrder.total_price,
        status:
          serverOrder.payment_method === 'COD'
            ? 'LUNAS_PRODUKSI'
            : 'MENUNGGU_PEMBAYARAN',
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

      if (serverOrder.payment_method === 'COD') {
        window.open(serverOrder.whatsapp_url, '_blank');
      }
    } catch {
      setFormError('Terjadi gangguan koneksi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-end">
      <div className="bg-white w-full max-w-md h-full flex flex-col shadow-2xl border-l border-[#EADFD3] overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#EADFD3] flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-base text-[#3B2618]">
              {createdOrderData ? 'Pesanan Tercatat' : 'Keranjang Belanja'}
            </h3>
            <p className="text-xs text-[#8C6D53]">
              {createdOrderData
                ? `Invoice #${createdOrderData.invoice_code}`
                : `${totalItemsCount} item dipilih`}
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
          {createdOrderData ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-1.5">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                  <Check className="w-5 h-5 stroke-[2.5]" />
                </div>
                <h4 className="font-bold text-base text-emerald-950">
                  Invoice #{createdOrderData.invoice_code}
                </h4>
                <p className="text-xs text-emerald-800">
                  Atas nama <strong>{createdOrderData.customer_name}</strong> &bull;{' '}
                  <strong>{formatRupiah(createdOrderData.total_price)}</strong>
                </p>
              </div>

              {createdOrderData.payment_method === 'QRIS' && (
                <div className="p-4 rounded-2xl bg-[#FAF6F0] border border-[#EADFD3] text-center space-y-2">
                  <p className="text-xs font-bold text-[#3B2618]">
                    Scan QRIS Sebesar {formatRupiah(createdOrderData.total_price)}
                  </p>
                  <div className="w-36 h-36 mx-auto rounded-2xl border border-[#D8C2A8] bg-white flex flex-col items-center justify-center p-3">
                    <QrCode className="w-16 h-16 text-[#5C3A21]" />
                    <span className="text-[10px] font-bold text-[#3B2618] mt-1">
                      {OFFICIAL_INFO.qris.merchantName}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#7D5E46]">
                    Screenshot bukti bayar lalu lampirkan di chat WhatsApp Admin.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <a
                  href={createdOrderData.whatsapp_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Konfirmasi ke WhatsApp</span>
                </a>

                <button
                  type="button"
                  onClick={() =>
                    handleCopyWaText(createdOrderData.whatsapp_message)
                  }
                  className="w-full py-2.5 px-4 rounded-xl border border-[#EADFD3] bg-white text-[#5C3A21] font-semibold text-xs hover:bg-[#FAF6F0] transition flex items-center justify-center gap-1.5"
                >
                  {copiedWaText ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Tersalin</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin Pesan</span>
                    </>
                  )}
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setCreatedOrderData(null);
                  setCustomerName('');
                  onClearCart();
                  onClose();
                }}
                className="w-full py-2.5 rounded-xl bg-[#5C3A21] text-white font-semibold text-xs hover:bg-[#462B18]"
              >
                Selesai
              </button>
            </div>
          ) : (
            <>
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
                            <span className="text-xl shrink-0">
                              {item.product.emoji}
                            </span>
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
                                disabled={
                                  item.quantity >= item.product.stockQuota
                                }
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

              {cart.length > 0 && (
                <form onSubmit={handleSubmitOrder} className="space-y-4 pt-2">
                  {/* Input 1: Nama */}
                  <div>
                    <label
                      htmlFor="buyer-name"
                      className="block text-xs font-bold text-[#3B2618] mb-1.5"
                    >
                      Nama Pemesan
                    </label>
                    <input
                      id="buyer-name"
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Masukkan nama Anda"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#EADFD3] bg-[#FAF6F0]/50 text-xs text-[#3B2618] focus:outline-none focus:ring-2 focus:ring-[#5C3A21] focus:bg-white"
                      required
                    />
                  </div>

                  {/* Input 2: Metode Pembayaran */}
                  <div>
                    <label className="block text-xs font-bold text-[#3B2618] mb-1.5">
                      Metode Pembayaran
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('COD')}
                        className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 ${
                          paymentMethod === 'COD'
                            ? 'border-[#5C3A21] bg-[#FAF6F0] font-bold'
                            : 'border-[#EADFD3] bg-white hover:bg-[#FAF6F0]/50'
                        }`}
                      >
                        <Wallet className="w-4 h-4 text-[#5C3A21] shrink-0" />
                        <div>
                          <p className="text-xs text-[#3B2618]">COD</p>
                          <p className="text-[10px] text-[#8C6D53] font-normal">
                            Bayar saat ambil
                          </p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('QRIS')}
                        className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 ${
                          paymentMethod === 'QRIS'
                            ? 'border-[#5C3A21] bg-[#FAF6F0] font-bold'
                            : 'border-[#EADFD3] bg-white hover:bg-[#FAF6F0]/50'
                        }`}
                      >
                        <QrCode className="w-4 h-4 text-[#5C3A21] shrink-0" />
                        <div>
                          <p className="text-xs text-[#3B2618]">QRIS</p>
                          <p className="text-[10px] text-[#8C6D53] font-normal">
                            E-Wallet / Bank
                          </p>
                        </div>
                      </button>
                    </div>
                  </div>

                  {formError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  {/* Total */}
                  <div className="p-3.5 rounded-xl bg-[#FAF6F0] border border-[#EADFD3] flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#7D5E46]">
                      Total Pembayaran
                    </span>
                    <span className="text-base font-extrabold text-[#3B2618]">
                      {formatRupiah(subtotalPrice)}
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 rounded-xl bg-[#5C3A21] text-white font-bold text-xs hover:bg-[#462B18] active:scale-95 disabled:opacity-60 transition-all flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Memproses...</span>
                      </>
                    ) : (
                      <>
                        <MessageCircle className="w-4 h-4" />
                        <span>Pesan Sekarang</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
