export type BatchScheduleStatusReason =
  | 'OPEN'
  | 'MANUALLY_CLOSED'
  | 'NOT_YET_OPEN'
  | 'EXPIRED';

export interface BatchOpenEvaluation {
  effectiveIsOpen: boolean;
  reason: BatchScheduleStatusReason;
  statusLabel: string;
}

const WITA_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAYS_ID = [
  'Minggu',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
];
const MONTHS_ID = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];

function pad2(num: number): string {
  return String(num).padStart(2, '0');
}

/**
 * Mengevaluasi apakah PO saat ini otomatis buka/tutup berdasarkan master switch `isOpen`
 * serta rentang waktu `orderOpenAt` .. `orderCloseAt`.
 */
export function evaluateBatchOpenStatus(
  params: {
    isOpen: boolean;
    orderOpenAt?: string | null;
    orderCloseAt?: string | null;
  },
  nowMs?: number
): BatchOpenEvaluation {
  if (!params.isOpen) {
    return {
      effectiveIsOpen: false,
      reason: 'MANUALLY_CLOSED',
      statusLabel: 'Pre-Order Ditutup Manual oleh Admin',
    };
  }

  if (typeof nowMs === 'number') {
    if (params.orderOpenAt) {
      const openMs = Date.parse(params.orderOpenAt);
      if (!Number.isNaN(openMs) && nowMs < openMs) {
        return {
          effectiveIsOpen: false,
          reason: 'NOT_YET_OPEN',
          statusLabel: 'Belum Memasuki Jadwal Buka Pre-Order',
        };
      }
    }

    if (params.orderCloseAt) {
      const closeMs = Date.parse(params.orderCloseAt);
      if (!Number.isNaN(closeMs) && nowMs > closeMs) {
        return {
          effectiveIsOpen: false,
          reason: 'EXPIRED',
          statusLabel: 'Batas Waktu Pre-Order Sudah Berakhir',
        };
      }
    }
  }

  return {
    effectiveIsOpen: true,
    reason: 'OPEN',
    statusLabel: 'Pre-Order Dibuka',
  };
}

/**
 * Mengonversi ISO timestamp menjadi format input `<input type="datetime-local">` dalam zona waktu WITA (+08:00).
 */
export function isoToWitaDateTimeLocal(iso?: string | null): string {
  if (!iso) return '';
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return '';
  const d = new Date(ms + WITA_OFFSET_MS);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(
    d.getUTCDate()
  )}T${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`;
}

/**
 * Mengonversi nilai `<input type="datetime-local">` (WITA) menjadi ISO timestamp berzona `+08:00`.
 */
export function witaDateTimeLocalToIso(localValue?: string | null): string | null {
  const trimmed = (localValue ?? '').trim();
  if (!trimmed) return null;
  const normalized = trimmed.length === 16 ? `${trimmed}:00+08:00` : `${trimmed}+08:00`;
  const ms = Date.parse(normalized);
  if (Number.isNaN(ms)) return null;
  return new Date(ms).toISOString();
}

/**
 * Memformat nilai datetime-local atau ISO menjadi teks WITA Indonesia: "Kamis, 19 Nov 2026, 21:00 WITA".
 */
export function formatWitaDateTimeDisplay(isoOrLocal?: string | null): string {
  const trimmed = (isoOrLocal ?? '').trim();
  if (!trimmed) return '';
  const candidate = trimmed.includes('Z') || trimmed.includes('+')
    ? trimmed
    : trimmed.length === 16
    ? `${trimmed}:00+08:00`
    : `${trimmed}+08:00`;
  const ms = Date.parse(candidate);
  if (Number.isNaN(ms)) return trimmed;
  const d = new Date(ms + WITA_OFFSET_MS);
  const dayName = DAYS_ID[d.getUTCDay()];
  const dayNum = d.getUTCDate();
  const monthName = MONTHS_ID[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  const hh = pad2(d.getUTCHours());
  const mm = pad2(d.getUTCMinutes());
  return `${dayName}, ${dayNum} ${monthName} ${year}, ${hh}:${mm} WITA`;
}

/**
 * Memformat tanggal YYYY-MM-DD menjadi teks Indonesia: "Jumat, 20 Nov 2026".
 */
export function formatWitaDateOnlyDisplay(dateIso?: string | null): string {
  const trimmed = (dateIso ?? '').trim();
  if (!trimmed) return '';
  const ms = Date.parse(`${trimmed}T00:00:00+08:00`);
  if (Number.isNaN(ms)) return trimmed;
  const d = new Date(ms + WITA_OFFSET_MS);
  const dayName = DAYS_ID[d.getUTCDay()];
  const dayNum = d.getUTCDate();
  const monthName = MONTHS_ID[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  return `${dayName}, ${dayNum} ${monthName} ${year}`;
}

/**
 * Memformat rentang jam mulai & selesai menjadi "13:00 - 17:00 WITA".
 */
export function formatPickupTimeRange(
  startTime?: string | null,
  endTime?: string | null
): string {
  const start = (startTime ?? '').trim() || '13:00';
  const end = (endTime ?? '').trim() || '17:00';
  return `${start} - ${end} WITA`;
}
