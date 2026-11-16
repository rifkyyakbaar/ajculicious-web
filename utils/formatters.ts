import { OrderRecord } from '../types/ajculicious';
import { OFFICIAL_INFO } from '../data/initial_data';

export function formatRupiah(amount: number): string {
  return 'Rp' + amount.toLocaleString('id-ID');
}

export function buildWhatsAppOrderMessage(order: OrderRecord): string {
  const itemLines = order.items
    .map(
      (it, idx) =>
        `${idx + 1}. *${it.productName}* (${it.quantity}x) = ${formatRupiah(it.subtotal)}`
    )
    .join('\n');

  const pickupText =
    order.pickupOption === 'kampus'
      ? `Ambil di Kampus (${order.pickupLocation})`
      : `Antar Kurir Kampus / Kost (${order.pickupLocation}) [Ongkir Rp5.000]`;

  let paymentText = '';
  if (order.paymentMethod === 'COD') {
    paymentText = 'COD (Bayar Tunai saat Terima di Kampus)';
  } else if (order.paymentMethod === 'QRIS') {
    paymentText = 'QRIS Statis AJCUlicious (Bukti Bayar Terlampir)';
  } else {
    paymentText = `Transfer ${order.bankChosen || 'Bank Mandiri/BluBCA'} a.n. Syazwani`;
  }

  return [
    `Halo Admin *${OFFICIAL_INFO.brandName}*!`,
    `Saya mau konfirmasi pesanan Pre-Order (PO) dari website:`,
    ``,
    `*KODE INVOICE:* #${order.invoiceCode}`,
    `*Nama Pembeli:* ${order.customerName}`,
    `*No. WhatsApp:* ${order.customerPhone}`,
    `*Metode Pengambilan:* ${pickupText}`,
    `*Metode Pembayaran:* ${paymentText}`,
    order.notes ? `*Catatan:* ${order.notes}` : null,
    ``,
    `*RINCIAN PESANAN:*`,
    itemLines,
    ``,
    `*TOTAL PEMBAYARAN:* *${formatRupiah(order.totalPrice)}*`,
    ``,
    order.paymentMethod === 'COD'
      ? `Saya akan siapkan uang pas saat serah terima di kampus ya kak. Terima kasih!`
      : `Berikut saya lampirkan screenshot bukti transfer/pembayaran via WA ini. Mohon diproses dan diverifikasi ya kak!`,
  ]
    .filter(Boolean)
    .join('\n');
}

export function buildWhatsAppReadyPickupMessage(order: OrderRecord): string {
  return [
    `Halo Kak *${order.customerName}*!`,
    `Kabar gembira dari *${OFFICIAL_INFO.brandName}*!`,
    ``,
    `Pesanan Kakak dengan *Invoice #${order.invoiceCode}* saat ini sudah *READY TO PICK UP* (Siap Diambil)!`,
    ``,
    `*Titik Temu:* ${order.pickupLocation}`,
    `*Total Tagihan:* ${formatRupiah(order.totalPrice)} (${order.paymentMethod})`,
    ``,
    `Silakan temui staf kami di konter / lokasi tersebut dengan menunjukkan invoice ini. Selamat menikmati dessert homemade kami!`,
  ].join('\n');
}
