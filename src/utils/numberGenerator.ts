import { RegistrationNumberConfig } from '../types';
import { getDateComponentsForNumber, getNowInTimezone } from './dateUtils';

export interface NumberTokenContext {
  sequenceNumber: number;
  docTypeCode?: string;
  classificationCode?: string;
  unitCode?: string;
  institutionCode?: string;
  date?: Date;
}

/**
 * Format sequence number with configurable zero-padding
 * Contoh: sequence 1 dengan digitCount 2 -> "01", digitCount 3 -> "001"
 */
export function formatSequenceNumber(num: number, digitCount: number = 2): string {
  return String(num).padStart(digitCount, '0');
}

/**
 * Menghasilkan Nomor Registrasi berdasarkan konfigurasi dan token
 * Contoh keluaran: ST/01/RLN/KA/X/2026/BNNK
 */
export function generateRegistrationNumber(
  config: RegistrationNumberConfig,
  context: NumberTokenContext
): string {
  const date = context.date || getNowInTimezone();
  const dateParts = getDateComponentsForNumber(date);

  const formattedSeq = formatSequenceNumber(context.sequenceNumber, config.digitCount);
  const docType = context.docTypeCode || config.docTypeCode || 'ST';
  const classification = context.classificationCode || config.classificationCode || 'RLN';
  const unit = context.unitCode || config.unitCode || 'KA';
  const instansi = context.institutionCode || config.institutionCode || 'BNNK';
  const month = config.monthFormat === 'arabic' ? dateParts.monthArabic : dateParts.monthRoman;

  let result = config.pattern || '{JENIS}/{NOMOR_URUT}/{KLASIFIKASI}/{UNIT}/{BULAN_ROMAWI}/{TAHUN}/{INSTANSI}';

  // Gantikan setiap token
  result = result
    .replace(/{JENIS}/g, docType)
    .replace(/{NOMOR_URUT}/g, formattedSeq)
    .replace(/{KLASIFIKASI}/g, classification)
    .replace(/{UNIT}/g, unit)
    .replace(/{BULAN_ROMAWI}/g, dateParts.monthRoman)
    .replace(/{BULAN_ANGKA}/g, dateParts.monthArabic)
    .replace(/{BULAN}/g, month)
    .replace(/{TAHUN}/g, dateParts.year)
    .replace(/{INSTANSI}/g, instansi);

  return result;
}

/**
 * Validasi apakah nomor registrasi sudah sesuai format
 */
export function validateRegistrationNumber(numberStr: string): boolean {
  if (!numberStr || typeof numberStr !== 'string') return false;
  return numberStr.trim().length >= 5;
}

/**
 * Menghitung kunci scope counter untuk penyimpanan sekuens
 */
export function getCounterScopeKey(
  config: RegistrationNumberConfig,
  activityId: string,
  classificationCode: string
): string {
  if (config.scope === 'per_activity') {
    return `activity_${activityId}`;
  }
  if (config.scope === 'per_classification') {
    return `class_${classificationCode.trim().toUpperCase()}`;
  }
  return 'global_counter';
}

/**
 * Daftar token yang didukung untuk pembangun format nomor registrasi di UI
 */
export const AVAILABLE_NUMBER_TOKENS = [
  { token: '{JENIS}', label: 'Kode Jenis Dokumen', example: 'ST / PG / SK' },
  { token: '{NOMOR_URUT}', label: 'Nomor Urut Pendaftar', example: '01 / 001' },
  { token: '{KLASIFIKASI}', label: 'Kode Klasifikasi', example: 'RLN / PLT / SEM' },
  { token: '{UNIT}', label: 'Kode Unit / Wilayah', example: 'KA / GO / JKT' },
  { token: '{BULAN_ROMAWI}', label: 'Bulan Angka Romawi', example: 'X / XI / XII' },
  { token: '{BULAN_ANGKA}', label: 'Bulan Angka Biasa', example: '01 s/d 12' },
  { token: '{TAHUN}', label: 'Tahun Penerbitan', example: '2026' },
  { token: '{INSTANSI}', label: 'Kode Instansi / Penyelenggara', example: 'BNNK / BNNP' },
];
