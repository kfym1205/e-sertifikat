/**
 * Utilitas Tanggal & Waktu (Zona Waktu Asia/Makassar & Bahasa Indonesia)
 */

const BULAN_INDONESIA = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const HARI_INDONESIA = [
  'Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'
];

const ROMAN_MONTHS: Record<number, string> = {
  1: 'I',
  2: 'II',
  3: 'III',
  4: 'IV',
  5: 'V',
  6: 'VI',
  7: 'VII',
  8: 'VIII',
  9: 'IX',
  10: 'X',
  11: 'XI',
  12: 'XII',
};

/**
 * Mendapatkan tanggal saat ini di zona waktu Asia/Makassar (WITA, UTC+8)
 */
export function getNowInTimezone(timezone: string = 'Asia/Makassar'): Date {
  const now = new Date();
  const invdate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  return invdate;
}

/**
 * Format tanggal dalam Bahasa Indonesia, misal: "21 Oktober 2026"
 */
export function formatIndonesianDate(dateInput: string | Date | undefined, timezone: string = 'Asia/Makassar'): string {
  if (!dateInput) return '';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return String(dateInput);

  // Ambil tanggal sesuai timezone
  const formatter = new Intl.DateTimeFormat('id-ID', {
    timeZone: timezone,
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return formatter.format(d);
}

/**
 * Format tanggal lengkap dengan hari, misal: "Rabu, 21 Oktober 2026"
 */
export function formatFullIndonesianDate(dateInput: string | Date | undefined, timezone: string = 'Asia/Makassar'): string {
  if (!dateInput) return '';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '';

  const formatter = new Intl.DateTimeFormat('id-ID', {
    timeZone: timezone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return formatter.format(d);
}

/**
 * Format tanggal dan jam lengkap, misal: "21 Okt 2026 14:30 WITA"
 */
export function formatDateTimeIndonesian(dateInput: string | Date | undefined, timezone: string = 'Asia/Makassar'): string {
  if (!dateInput) return '-';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '-';

  const datePart = new Intl.DateTimeFormat('id-ID', {
    timeZone: timezone,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(d);

  const tzLabel = timezone === 'Asia/Makassar' ? 'WITA' : timezone === 'Asia/Jakarta' ? 'WIB' : 'WIT';
  return `${datePart} ${tzLabel}`;
}

/**
 * Mengubah angka bulan (1-12) ke angka Romawi (I-XII)
 */
export function getRomanMonth(monthNumber: number): string {
  return ROMAN_MONTHS[monthNumber] || String(monthNumber);
}

/**
 * Mengambil komponen tanggal untuk nomor registrasi (Tahun, Bulan Romawi, Bulan Angka)
 */
export function getDateComponentsForNumber(date: Date = getNowInTimezone()) {
  const month = date.getMonth() + 1; // 1-12
  const year = date.getFullYear();
  return {
    year: String(year),
    monthRoman: getRomanMonth(month),
    monthArabic: String(month).padStart(2, '0'),
  };
}
