/**
 * Definisi Tipe Data Utama Aplikasi Sertifikat Otomatis
 */

export type DocumentType = 'ST' | 'PG' | 'SK' | 'SM' | 'PK' | string;

export type NumberScope = 'per_activity' | 'per_classification' | 'global';
export type ResetPolicy = 'never' | 'yearly' | 'monthly';
export type DuplicatePolicy = 'disallow' | 'allow' | 'reissue';
export type PageOrientation = 'landscape' | 'portrait';

export interface LayoutElement {
  id: 'reg_number' | 'participant_name' | 'cert_date' | 'qr_code' | 'extra_text';
  label: string;
  enabled: boolean;
  xMm: number; // Posisi horizontal dalam milimeter (0 - 297 untuk landscape A4)
  yMm: number; // Posisi vertikal dalam milimeter (0 - 210 untuk landscape A4)
  fontSizePt: number; // Ukuran font dalam pt
  fontFamily: string; // Misal 'Playfair Display', 'Cinzel', 'Inter', 'Great Vibes'
  color: string; // Hex color code misal '#1e293b'
  textAlign: 'left' | 'center' | 'right';
  fontWeight: 'normal' | '500' | '600' | '700' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textTransform?: 'none' | 'uppercase' | 'capitalize' | 'lowercase';
  maxWidthMm?: number; // Batas lebar area teks
  sampleValue?: string; // Nilai contoh untuk preview
}

export interface CertificateTemplate {
  id: string;
  name: string;
  orientation: PageOrientation;
  bgImageUrl: string; // URL atau base64 gambar template latar belakang
  widthMm: number; // 297 untuk landscape, 210 untuk portrait
  heightMm: number; // 210 untuk landscape, 297 untuk portrait
  createdAt: string;
  updatedAt: string;
  version: number;
  isDefault?: boolean;
}

export interface RegistrationNumberConfig {
  id: string;
  name: string;
  pattern: string; // e.g. "{JENIS}/{NOMOR_URUT}/{KLASIFIKASI}/{UNIT}/{BULAN_ROMAWI}/{TAHUN}/{INSTANSI}"
  separator: string; // e.g. "/"
  digitCount: number; // e.g. 2 -> "01", 3 -> "001"
  startNumber: number; // e.g. 1
  scope: NumberScope;
  resetPolicy: ResetPolicy;
  docTypeCode: string; // e.g. "ST"
  classificationCode: string; // e.g. "RLN"
  unitCode: string; // e.g. "KA"
  institutionCode: string; // e.g. "BNNK"
  monthFormat: 'roman' | 'arabic';
}

export interface ClassificationCode {
  id: string;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
}

export interface Activity {
  id: string;
  slug: string;
  name: string;
  description: string;
  certificateType: string;
  templateId: string;
  layoutElements: LayoutElement[];
  registrationNumberConfig: RegistrationNumberConfig;
  startDate: string;
  endDate: string;
  isActive: boolean;
  isArchived: boolean;
  duplicatePolicy: DuplicatePolicy;
  dateMode: 'server_today' | 'manual';
  manualDate?: string;
  timezone: string; // Default: 'Asia/Makassar'
  formSettings: {
    requirePhone: boolean;
    requireInstitution: boolean;
    requireCustomField: boolean;
    customFieldLabel?: string;
  };
  emailSettings: {
    subject: string;
    bodyTemplate: string;
    senderName: string;
    replyTo?: string;
    attachPdf: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Participant {
  id: string;
  activityId: string;
  fullName: string;
  email: string;
  phone?: string;
  institution?: string;
  customFieldValue?: string;
  registeredAt: string; // ISO UTC
  registeredAtLocal: string; // Format lokal Asia/Makassar
  ipAddress?: string;
}

export interface CertificateIssuance {
  id: string;
  verificationId: string; // Unique unguessable string e.g. "cert_bnnk_7x9q2m"
  activityId: string;
  activityName: string;
  participantId: string;
  participantName: string;
  participantEmail: string;
  participantInstitution?: string;
  registrationNumber: string;
  sequenceNumber: number;
  issueDate: string; // Tampilan tanggal sertifikat e.g. "21 Oktober 2026"
  issueDateIso: string;
  status: 'valid' | 'revoked' | 'reissued';
  pdfUrl?: string; // Data URL atau storage URL
  templateSnapshotId: string;
  layoutSnapshot: LayoutElement[];
  emailStatus: DeliveryStatus;
  emailDeliveryId?: string;
  emailError?: string;
  emailProvider?: string;
  createdAt: string;
  updatedAt: string;
  reissueReason?: string;
}

export type DeliveryStrategy = 'gmail_only';

export type DeliveryStatus =
  | 'pending'
  | 'processing'
  | 'delivered'
  | 'temp_failed'
  | 'perm_failed'
  | 'fallen_back_gmail' // backward compatibility for legacy logs
  | 'awaiting_confirmation'
  | 'action_required'
  | 'failed'; // backward compatibility

export interface EmailDeliveryLog {
  id: string;
  issuanceId: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  status: DeliveryStatus;
  deliveryStrategy?: DeliveryStrategy;
  usedMethod?: 'gmail_api' | 'simulation';
  senderAddress?: string;
  attemptCount: number;
  lastAttemptAt: string;
  providerMessageId?: string;
  errorMessage?: string;
  fallbackReason?: string;
  idempotencyKey?: string;
  isReconciled?: boolean;
  headers?: Record<string, string>;
  createdAt: string;
}

export type AdminRole = 'superadmin' | 'admin' | 'operator';

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: AdminRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  avatarUrl?: string;
  phone?: string;
  passwordHash?: string;
  salt?: string;
  failedLoginAttempts?: number;
  lockedUntil?: string;
}

export interface AdminSession {
  userId: string;
  username: string;
  email: string;
  fullName: string;
  role: AdminRole;
  loggedInAt: string;
  token?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  targetType: 'activity' | 'template' | 'certificate' | 'email' | 'system' | 'number_config' | 'admin' | 'session';
  targetId: string;
  details: string;
}

export interface CounterRecord {
  id: string;
  scopeKey: string; // e.g. "activity_act_1" or "global"
  lastNumber: number;
  lastYear: number;
  lastMonth: number;
  updatedAt: string;
}

export interface VerificationResult {
  isValid: boolean;
  issuance?: {
    verificationId: string;
    registrationNumber: string;
    participantName: string;
    activityName: string;
    issueDate: string;
    institution: string;
    status: 'valid' | 'revoked' | 'reissued';
  };
  message: string;
}

export interface SendEmailPayload {
  to: string;
  recipientName: string;
  subject: string;
  activityName: string;
  registrationNumber: string;
  issueDate: string;
  verificationUrl: string;
  customBody?: string;
  pdfBase64?: string;
  pdfFilename?: string;
}

export interface AppearanceConfig {
  id: string;
  // Identitas & Header
  appName: string;
  appSubtitle: string;
  logoUrl?: string;
  logoHeightPx: number; // e.g. 40
  logoPosition: 'left' | 'center';
  headerTitle: string;
  headerTitleSize: 'sm' | 'md' | 'lg' | 'xl';
  headerTitleColor: string;
  headerBgColor: string;
  headerStyle: 'navy_gradient' | 'solid_blue' | 'clean_white';
  showOnPublic: boolean;
  showOnAdmin: boolean;

  // Custom Footer
  footer: {
    // A. Identitas Instansi
    institutionName: string;
    unitName: string;
    footerLogoUrl?: string;
    showIdentity: boolean;

    // B. Alamat Kantor
    address?: string;
    village?: string;
    district?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    showAddress: boolean;

    // C. Informasi Kontak
    phone?: string;
    whatsapp?: string;
    email?: string;
    website?: string;
    serviceHours?: string;
    showContact: boolean;

    // D. Informasi Tambahan
    description?: string;
    copyrightText: string;
    autoYear: boolean;
    socialFacebook?: string;
    socialInstagram?: string;
    socialYoutube?: string;
    privacyPolicyUrl?: string;
    termsUrl?: string;
    additionalInfo?: string;
    showSocial: boolean;
    showLegal: boolean;

    // E. Pengaturan Tampilan Footer
    bgColor: string;
    textColor: string;
    linkColor: string;
    textSize: 'sm' | 'base';
    columns: 2 | 3 | 4;
    textAlign: 'left' | 'center';
  };

  // Warna & Tema
  theme: {
    preset: 'bnn_official' | 'bnn_light_sky' | 'bnn_midnight' | 'custom';
    primaryColor: string; // #00529B
    darkColor: string; // #003566
    secondaryColor: string; // #1677C8
    lightColor: string; // #EAF4FC
    bgColor: string; // #F5F8FC
    textColor: string; // #1F2937
    mutedColor: string; // #64748B
    buttonTextColor: string; // #FFFFFF
  };

  updatedAt: string;
  updatedBy: string;
}
