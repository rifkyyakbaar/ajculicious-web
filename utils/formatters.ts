import { OrderRecord } from '../types/ajculicious';
import { OFFICIAL_INFO } from '../data/initial_data';

export function formatRupiah(amount: number): string {
  return 'Rp' + amount.toLocaleString('id-ID');
}

const INDONESIAN_OPERATOR_PREFIXES: Record<string, string> = {
  '0811': 'Telkomsel',
  '0812': 'Telkomsel',
  '0813': 'Telkomsel',
  '0821': 'Telkomsel',
  '0822': 'Telkomsel',
  '0823': 'Telkomsel',
  '0851': 'Telkomsel / by.U',
  '0852': 'Telkomsel',
  '0853': 'Telkomsel',
  '0814': 'Indosat',
  '0815': 'Indosat',
  '0816': 'Indosat',
  '0855': 'Indosat',
  '0856': 'Indosat',
  '0857': 'Indosat',
  '0858': 'Indosat',
  '0817': 'XL',
  '0818': 'XL',
  '0819': 'XL',
  '0859': 'XL',
  '0877': 'XL',
  '0878': 'XL',
  '0879': 'XL',
  '0831': 'Axis',
  '0832': 'Axis',
  '0833': 'Axis',
  '0838': 'Axis',
  '0895': 'Tri (3)',
  '0896': 'Tri (3)',
  '0897': 'Tri (3)',
  '0898': 'Tri (3)',
  '0899': 'Tri (3)',
  '0881': 'Smartfren',
  '0882': 'Smartfren',
  '0883': 'Smartfren',
  '0884': 'Smartfren',
  '0885': 'Smartfren',
  '0886': 'Smartfren',
  '0887': 'Smartfren',
  '0888': 'Smartfren',
  '0889': 'Smartfren',
};

export interface PhoneInspectionResult {
  valid: boolean;
  normalized: string; // 08xxxxxxxxxx
  international: string; // 628xxxxxxxxxx
  operator: string | null;
  error?: string;
}

export function inspectIndonesianPhoneNumber(
  rawPhone: string
): PhoneInspectionResult {
  const digitsOnly = (rawPhone ?? '').replace(/[^\d+]/g, '');
  let cleaned = digitsOnly;
  if (cleaned.startsWith('+62')) {
    cleaned = '0' + cleaned.slice(3);
  } else if (cleaned.startsWith('62')) {
    cleaned = '0' + cleaned.slice(2);
  } else if (cleaned.startsWith('8')) {
    cleaned = '0' + cleaned;
  }

  const prefix4 = cleaned.slice(0, 4);
  const operator = INDONESIAN_OPERATOR_PREFIXES[prefix4] || null;
  const international = cleaned.startsWith('0')
    ? '62' + cleaned.slice(1)
    : cleaned;

  if (cleaned.length < 4) {
    return {
      valid: false,
      normalized: cleaned,
      international,
      operator: null,
      error: 'Masukkan nomor WhatsApp aktif Anda (contoh: 081234567890).',
    };
  }

  if (!operator) {
    return {
      valid: false,
      normalized: cleaned,
      international,
      operator: null,
      error: `Kode awalan "${prefix4}" bukan nomor operator seluler resmi Indonesia (Telkomsel/Indosat/XL/Axis/Tri/Smartfren).`,
    };
  }

  if (!/^08[1-9][0-9]{7,11}$/.test(cleaned)) {
    return {
      valid: false,
      normalized: cleaned,
      international,
      operator,
      error: `Panjang nomor ${operator} harus 10–13 digit angka (saat ini ${cleaned.length} digit).`,
    };
  }

  if (/(\d)\1{5,}/.test(cleaned)) {
    return {
      valid: false,
      normalized: cleaned,
      international,
      operator,
      error:
        'Nomor WhatsApp terdeteksi tidak wajar (angka kembar berulang). Masukkan nomor asli Anda.',
    };
  }

  return {
    valid: true,
    normalized: cleaned,
    international,
    operator,
  };
}

const MY_INVOICES_STORAGE_KEY = 'ajc_my_invoices';

export function saveInvoiceToBrowserHistory(invoiceCode: string): void {
  if (typeof window === 'undefined' || !invoiceCode) return;
  try {
    const clean = invoiceCode.trim().toUpperCase();
    const raw = localStorage.getItem(MY_INVOICES_STORAGE_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    const updated = [clean, ...list.filter((c) => c !== clean)].slice(0, 15);
    localStorage.setItem(MY_INVOICES_STORAGE_KEY, JSON.stringify(updated));
  } catch {}
}

export function getSavedInvoicesFromBrowserHistory(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(MY_INVOICES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
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
