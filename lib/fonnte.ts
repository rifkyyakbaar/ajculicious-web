const DEFAULT_FONNTE_TOKEN = 'eDfV7dy29E34PE1Lh5Z7';

function getFonnteToken(): string {
  return (process.env.FONNTE_API_TOKEN || DEFAULT_FONNTE_TOKEN).trim();
}

export interface FonnteValidationResult {
  checkedWithGateway: boolean;
  isRegistered: boolean;
  reason?: string;
}

/**
 * Mengecek ke server WhatsApp melalui Fonnte API (`https://api.fonnte.com/validate`)
 * apakah nomor HP benar-benar terdaftar sebagai akun WhatsApp aktif.
 * Jika perangkat Fonnte sedang disconnect / offline, otomatis fallback dengan aman.
 */
export async function verifyWhatsAppNumberViaFonnte(
  phone: string
): Promise<FonnteValidationResult> {
  const token = getFonnteToken();
  if (!token) {
    return { checkedWithGateway: false, isRegistered: true };
  }

  try {
    const formData = new URLSearchParams();
    formData.append('target', phone);
    formData.append('countryCode', '62');

    const response = await fetch('https://api.fonnte.com/validate', {
      method: 'POST',
      headers: {
        Authorization: token,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
      signal: AbortSignal.timeout(6000),
    });

    if (!response.ok) {
      return { checkedWithGateway: false, isRegistered: true };
    }

    const data = (await response.json()) as {
      status?: boolean;
      registered?: string[];
      not_registered?: string[];
      reason?: string;
    };

    if (data.status === true) {
      const notReg = Array.isArray(data.not_registered)
        ? data.not_registered
        : [];
      const reg = Array.isArray(data.registered) ? data.registered : [];

      if (notReg.length > 0 && reg.length === 0) {
        return {
          checkedWithGateway: true,
          isRegistered: false,
          reason:
            'Nomor yang Anda masukkan tidak terdaftar di WhatsApp! Pastikan tidak ada salah ketik angka.',
        };
      }

      return {
        checkedWithGateway: true,
        isRegistered: true,
      };
    }

    // Jika status: false (misal device belum scan QR / disconnect), fallback ke validasi operator
    return {
      checkedWithGateway: false,
      isRegistered: true,
      reason: data.reason,
    };
  } catch {
    return {
      checkedWithGateway: false,
      isRegistered: true,
    };
  }
}

/**
 * Mengirim pesan WhatsApp otomatis di belakang layar melalui Fonnte API (`https://api.fonnte.com/send`)
 */
export async function sendFonnteWhatsAppMessage(
  targetPhone: string,
  message: string
): Promise<{ sent: boolean; detail?: string }> {
  const token = getFonnteToken();
  if (!token || !targetPhone || targetPhone === '-') {
    return { sent: false, detail: 'Token atau nomor tujuan kosong' };
  }

  try {
    const formData = new URLSearchParams();
    formData.append('target', targetPhone);
    formData.append('message', message);
    formData.append('countryCode', '62');

    const response = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        Authorization: token,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
      signal: AbortSignal.timeout(7000),
    });

    const data = (await response.json()) as {
      status?: boolean;
      detail?: string;
      reason?: string;
    };

    return {
      sent: Boolean(data.status),
      detail: data.detail || data.reason,
    };
  } catch {
    return { sent: false, detail: 'Gagal menghubungi server Fonnte' };
  }
}
