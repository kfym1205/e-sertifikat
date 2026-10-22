import {
  Activity,
  AuditLog,
  CertificateIssuance,
  CertificateTemplate,
  ClassificationCode,
  EmailDeliveryLog,
  LayoutElement
} from '../types';
import {
  createEmeraldVintageTemplate,
  createModernNavyTemplate,
  createRoyalGoldTemplate
} from '../utils/certificateAssets';

export const INITIAL_TEMPLATES: CertificateTemplate[] = [
  {
    id: 'tmpl_royal_gold_landscape',
    name: 'Royal Gold Klasik (Landscape)',
    orientation: 'landscape',
    bgImageUrl: createRoyalGoldTemplate('landscape'),
    widthMm: 297,
    heightMm: 210,
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-01T08:00:00.000Z',
    version: 1,
    isDefault: true,
  },
  {
    id: 'tmpl_modern_navy_landscape',
    name: 'Modern Corporate Navy (Landscape)',
    orientation: 'landscape',
    bgImageUrl: createModernNavyTemplate('landscape'),
    widthMm: 297,
    heightMm: 210,
    createdAt: '2026-10-02T09:00:00.000Z',
    updatedAt: '2026-10-02T09:00:00.000Z',
    version: 1,
  },
  {
    id: 'tmpl_emerald_vintage_landscape',
    name: 'Emerald Hijau Zamrud (Landscape)',
    orientation: 'landscape',
    bgImageUrl: createEmeraldVintageTemplate('landscape'),
    widthMm: 297,
    heightMm: 210,
    createdAt: '2026-10-03T10:00:00.000Z',
    updatedAt: '2026-10-03T10:00:00.000Z',
    version: 1,
  },
  {
    id: 'tmpl_royal_gold_portrait',
    name: 'Royal Gold Formal (Portrait)',
    orientation: 'portrait',
    bgImageUrl: createRoyalGoldTemplate('portrait'),
    widthMm: 210,
    heightMm: 297,
    createdAt: '2026-10-04T11:00:00.000Z',
    updatedAt: '2026-10-04T11:00:00.000Z',
    version: 1,
  }
];

export const DEFAULT_LANDSCAPE_LAYOUT: LayoutElement[] = [
  {
    id: 'reg_number',
    label: 'Nomor Registrasi',
    enabled: true,
    xMm: 148.5, // Titik tengah A4 Landscape (297 / 2)
    yMm: 62,
    fontSizePt: 11,
    fontFamily: 'Inter',
    color: '#475569',
    textAlign: 'center',
    fontWeight: '600',
    sampleValue: 'ST/01/RLN/KA/X/2026/BNNK'
  },
  {
    id: 'participant_name',
    label: 'Nama Peserta',
    enabled: true,
    xMm: 148.5,
    yMm: 104,
    fontSizePt: 26,
    fontFamily: 'Playfair Display',
    color: '#0f172a',
    textAlign: 'center',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    maxWidthMm: 240,
    sampleValue: 'MUHAMMAD RIZKY PRATAMA, S.T.'
  },
  {
    id: 'extra_text',
    label: 'Teks Keterangan / Peran',
    enabled: true,
    xMm: 148.5,
    yMm: 122,
    fontSizePt: 12,
    fontFamily: 'Plus Jakarta Sans',
    color: '#334155',
    textAlign: 'center',
    fontWeight: 'normal',
    maxWidthMm: 230,
    sampleValue: 'Atas partisipasi aktif dan kontribusi luar biasa sebagai Peserta dalam rangkaian kegiatan'
  },
  {
    id: 'cert_date',
    label: 'Tanggal Sertifikat',
    enabled: true,
    xMm: 148.5,
    yMm: 144,
    fontSizePt: 12,
    fontFamily: 'Plus Jakarta Sans',
    color: '#1e293b',
    textAlign: 'center',
    fontWeight: '600',
    sampleValue: 'Gorontalo, 21 Oktober 2026'
  },
  {
    id: 'qr_code',
    label: 'QR Code Verifikasi',
    enabled: true,
    xMm: 252,
    yMm: 156,
    fontSizePt: 18,
    fontFamily: 'Inter',
    color: '#0f172a',
    textAlign: 'center',
    fontWeight: 'normal'
  }
];

export const INITIAL_CLASSIFICATIONS: ClassificationCode[] = [
  { id: 'cls_rln', code: 'RLN', name: 'Relawan', description: 'Penggiat dan relawan masyarakat', isActive: true },
  { id: 'cls_plt', code: 'PLT', name: 'Pelatihan', description: 'Peserta bimbingan teknis atau pelatihan', isActive: true },
  { id: 'cls_sem', code: 'SEM', name: 'Seminar', description: 'Peserta seminar nasional / webinar', isActive: true },
  { id: 'cls_wks', code: 'WKS', name: 'Workshop', description: 'Peserta lokakarya intensif', isActive: true },
  { id: 'cls_tot', code: 'TOT', name: 'Training of Trainer', description: 'Instruktur dan pelatih tersertifikasi', isActive: true },
  { id: 'cls_apn', code: 'APN', name: 'Apresiasi & Juara', description: 'Penghargaan dedikasi atau pemenang lomba', isActive: true }
];

export const INITIAL_ACTIVITIES: Activity[] = [
  {
    id: 'act_bnnk_relawan_2026',
    slug: 'pelatihan-relawan-anti-narkoba-2026',
    name: 'Pelatihan Relawan Penggiat P4GN 2026',
    description: 'Peningkatan kapasitas dan peran serta relawan anti narkoba dalam mewujudkan lingkungan masyarakat yang bersih dari penyalahgunaan narkotika.',
    certificateType: 'Sertifikat Kelulusan & Pengukuhan',
    templateId: 'tmpl_royal_gold_landscape',
    layoutElements: [...DEFAULT_LANDSCAPE_LAYOUT],
    registrationNumberConfig: {
      id: 'num_cfg_bnnk',
      name: 'Format Standar Instansi BNNK',
      pattern: '{JENIS}/{NOMOR_URUT}/{KLASIFIKASI}/{UNIT}/{BULAN_ROMAWI}/{TAHUN}/{INSTANSI}',
      separator: '/',
      digitCount: 2,
      startNumber: 1,
      scope: 'per_activity',
      resetPolicy: 'yearly',
      docTypeCode: 'ST',
      classificationCode: 'RLN',
      unitCode: 'KA',
      institutionCode: 'BNNK',
      monthFormat: 'roman'
    },
    startDate: '2026-10-01',
    endDate: '2026-11-30',
    isActive: true,
    isArchived: false,
    duplicatePolicy: 'disallow',
    dateMode: 'server_today',
    timezone: 'Asia/Makassar',
    formSettings: {
      requirePhone: true,
      requireInstitution: true,
      requireCustomField: true,
      customFieldLabel: 'Pekerjaan / Jabatan Saat Ini'
    },
    emailSettings: {
      subject: 'Sertifikat Resmi Kegiatan: Pelatihan Relawan Penggiat P4GN 2026',
      senderName: 'Panitia Sertifikasi BNNK',
      attachPdf: true,
      bodyTemplate: `Yth. [Nama Peserta],

Terima kasih atas partisipasi aktif dan dedikasi Anda dalam kegiatan [Nama Kegiatan].

Sertifikat penghargaan Anda telah resmi diterbitkan oleh sistem dengan rincian berikut:
• Nama Lengkap: [Nama Peserta]
• Nomor Registrasi: [Nomor Registrasi]
• Tanggal Penerbitan: [Tanggal Sertifikat]
• Tautan Verifikasi: [Tautan Verifikasi]

Sertifikat dokumen PDF berukuran A4 terlampir di dalam email ini. Anda dapat mengunduh dan menyimpannya sebagai berkas sah.

Salam hormat,
Panitia [Nama Kegiatan]`
    },
    createdAt: '2026-10-10T02:00:00.000Z',
    updatedAt: '2026-10-10T02:00:00.000Z'
  },
  {
    id: 'act_kominfo_digital_2026',
    slug: 'workshop-digitalisasi-layanan-publik',
    name: 'Workshop Transformasi Digital Layanan Publik',
    description: 'Akselerasi adopsi teknologi informasi dan otomatisasi proses administrasi terpadu bagi aparatur pemerintah daerah.',
    certificateType: 'Sertifikat Kompetensi Teknis',
    templateId: 'tmpl_modern_navy_landscape',
    layoutElements: [...DEFAULT_LANDSCAPE_LAYOUT],
    registrationNumberConfig: {
      id: 'num_cfg_kominfo',
      name: 'Format Standar Kominfo',
      pattern: '{JENIS}/{NOMOR_URUT}/{KLASIFIKASI}/{UNIT}/{BULAN_ROMAWI}/{TAHUN}/{INSTANSI}',
      separator: '/',
      digitCount: 3,
      startNumber: 1,
      scope: 'per_activity',
      resetPolicy: 'yearly',
      docTypeCode: 'PG',
      classificationCode: 'PLT',
      unitCode: 'GO',
      institutionCode: 'DISKOMINFO',
      monthFormat: 'roman'
    },
    startDate: '2026-10-05',
    endDate: '2026-12-15',
    isActive: true,
    isArchived: false,
    duplicatePolicy: 'reissue',
    dateMode: 'server_today',
    timezone: 'Asia/Makassar',
    formSettings: {
      requirePhone: true,
      requireInstitution: true,
      requireCustomField: false
    },
    emailSettings: {
      subject: 'Sertifikat Partisipasi: Workshop Transformasi Digital Layanan Publik',
      senderName: 'Diskominfo Pelatihan Digital',
      attachPdf: true,
      bodyTemplate: `Halo [Nama Peserta],

Selamat! Sertifikat kegiatan [Nama Kegiatan] telah siap.

Nomor Registrasi Anda: [Nomor Registrasi]
Tanggal Penerbitan: [Tanggal Sertifikat]

Dokumen resmi terlampir pada email ini. Keaslian dokumen dapat dicek langsung melalui QR Code atau tautan verifikasi resmi.

Salam hangat,
Tim Pelaksana Diskominfo`
    },
    createdAt: '2026-10-12T04:00:00.000Z',
    updatedAt: '2026-10-12T04:00:00.000Z'
  }
];

export const INITIAL_ISSUANCES: CertificateIssuance[] = [
  {
    id: 'iss_001',
    verificationId: 'v_bnnk_7a8b9c',
    activityId: 'act_bnnk_relawan_2026',
    activityName: 'Pelatihan Relawan Penggiat P4GN 2026',
    participantId: 'part_001',
    participantName: 'Ahmad Fauzan Syahputra, S.Sos.',
    participantEmail: 'ahmad.fauzan@gmail.com',
    participantInstitution: 'Forum Pemuda Pemerhati Daerah Gorontalo',
    registrationNumber: 'ST/01/RLN/KA/X/2026/BNNK',
    sequenceNumber: 1,
    issueDate: '21 Oktober 2026',
    issueDateIso: '2026-10-21T07:00:00.000Z',
    status: 'valid',
    templateSnapshotId: 'tmpl_royal_gold_landscape',
    layoutSnapshot: [...DEFAULT_LANDSCAPE_LAYOUT],
    emailStatus: 'delivered',
    emailDeliveryId: 'msg_resend_987123',
    createdAt: '2026-10-21T07:15:00.000Z',
    updatedAt: '2026-10-21T07:15:00.000Z'
  },
  {
    id: 'iss_002',
    verificationId: 'v_bnnk_8b9c0d',
    activityId: 'act_bnnk_relawan_2026',
    activityName: 'Pelatihan Relawan Penggiat P4GN 2026',
    participantId: 'part_002',
    participantName: 'Siti Nurhaliza Hasan, S.Pd.',
    participantEmail: 'siti.hasan99@gmail.com',
    participantInstitution: 'Yayasan Bina Generasi Sejahtera',
    registrationNumber: 'ST/02/RLN/KA/X/2026/BNNK',
    sequenceNumber: 2,
    issueDate: '21 Oktober 2026',
    issueDateIso: '2026-10-21T07:20:00.000Z',
    status: 'valid',
    templateSnapshotId: 'tmpl_royal_gold_landscape',
    layoutSnapshot: [...DEFAULT_LANDSCAPE_LAYOUT],
    emailStatus: 'delivered',
    emailDeliveryId: 'msg_resend_987124',
    createdAt: '2026-10-21T07:20:00.000Z',
    updatedAt: '2026-10-21T07:20:00.000Z'
  },
  {
    id: 'iss_003',
    verificationId: 'v_kominfo_1c2d3e',
    activityId: 'act_kominfo_digital_2026',
    activityName: 'Workshop Transformasi Digital Layanan Publik',
    participantId: 'part_003',
    participantName: 'Bambang Triyono, S.Kom.',
    participantEmail: 'bambang.tri@instansi.go.id',
    participantInstitution: 'Dinas Komunikasi & Informatika',
    registrationNumber: 'PG/001/PLT/GO/X/2026/DISKOMINFO',
    sequenceNumber: 1,
    issueDate: '21 Oktober 2026',
    issueDateIso: '2026-10-21T07:25:00.000Z',
    status: 'valid',
    templateSnapshotId: 'tmpl_modern_navy_landscape',
    layoutSnapshot: [...DEFAULT_LANDSCAPE_LAYOUT],
    emailStatus: 'failed',
    emailError: 'Mailbox quota exceeded / Alamat email penerima menolak koneksi SMTP sementara',
    createdAt: '2026-10-21T07:25:00.000Z',
    updatedAt: '2026-10-21T07:25:00.000Z'
  }
];

export const INITIAL_EMAIL_LOGS: EmailDeliveryLog[] = [
  {
    id: 'elog_001',
    issuanceId: 'iss_001',
    recipientEmail: 'ahmad.fauzan@gmail.com',
    recipientName: 'Ahmad Fauzan Syahputra, S.Sos.',
    subject: 'Sertifikat Resmi Kegiatan: Pelatihan Relawan Penggiat P4GN 2026',
    status: 'delivered',
    attemptCount: 1,
    lastAttemptAt: '2026-10-21T07:15:30.000Z',
    providerMessageId: 'resend_msg_01_success',
    createdAt: '2026-10-21T07:15:00.000Z'
  },
  {
    id: 'elog_002',
    issuanceId: 'iss_002',
    recipientEmail: 'siti.hasan99@gmail.com',
    recipientName: 'Siti Nurhaliza Hasan, S.Pd.',
    subject: 'Sertifikat Resmi Kegiatan: Pelatihan Relawan Penggiat P4GN 2026',
    status: 'delivered',
    attemptCount: 1,
    lastAttemptAt: '2026-10-21T07:20:25.000Z',
    providerMessageId: 'resend_msg_02_success',
    createdAt: '2026-10-21T07:20:00.000Z'
  },
  {
    id: 'elog_003',
    issuanceId: 'iss_003',
    recipientEmail: 'bambang.tri@instansi.go.id',
    recipientName: 'Bambang Triyono, S.Kom.',
    subject: 'Sertifikat Partisipasi: Workshop Transformasi Digital Layanan Publik',
    status: 'failed',
    attemptCount: 2,
    lastAttemptAt: '2026-10-21T07:26:00.000Z',
    errorMessage: 'Koneksi SMTP gateway menolak pengiriman lampiran (554 Transaction Failed)',
    createdAt: '2026-10-21T07:25:00.000Z'
  }
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'aud_001',
    timestamp: '2026-10-10T02:00:00.000Z',
    user: 'admin@sertifikat.id',
    action: 'CREATE_ACTIVITY',
    targetType: 'activity',
    targetId: 'act_bnnk_relawan_2026',
    details: 'Membuat kegiatan baru "Pelatihan Relawan Penggiat P4GN 2026" dengan format nomor ST/01/RLN/KA/X/2026/BNNK'
  },
  {
    id: 'aud_002',
    timestamp: '2026-10-10T02:15:00.000Z',
    user: 'admin@sertifikat.id',
    action: 'SAVE_LAYOUT',
    targetType: 'template',
    targetId: 'tmpl_royal_gold_landscape',
    details: 'Menyimpan konfigurasi posisi elemen teks sertifikat: Nama (26pt, y=104mm), Nomor (11pt, y=62mm)'
  },
  {
    id: 'aud_003',
    timestamp: '2026-10-21T07:15:00.000Z',
    user: 'SYSTEM_AUTOMATION',
    action: 'ISSUE_CERTIFICATE',
    targetType: 'certificate',
    targetId: 'iss_001',
    details: 'Menerbitkan sertifikat otomatis nomor ST/01/RLN/KA/X/2026/BNNK untuk Ahmad Fauzan Syahputra'
  },
  {
    id: 'aud_004',
    timestamp: '2026-10-21T07:25:00.000Z',
    user: 'SYSTEM_AUTOMATION',
    action: 'EMAIL_FAILED',
    targetType: 'email',
    targetId: 'elog_003',
    details: 'Gagal mengirimkan email ke bambang.tri@instansi.go.id (554 Transaction Failed). Butuh tindakan kirim ulang.'
  }
];
