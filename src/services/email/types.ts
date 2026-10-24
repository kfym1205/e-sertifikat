/**
 * Definisi Tipe Data Arsitektur Pengiriman Email e-Sertifikat BNN
 * Menggunakan integrasi resmi Gmail API (OAuth 2.0)
 */

export type DeliveryStrategy = 'gmail_only';

export type DeliveryStatus =
  | 'pending'
  | 'processing'
  | 'delivered'
  | 'temp_failed'
  | 'perm_failed'
  | 'fallen_back_gmail' // legacy log compatibility
  | 'awaiting_confirmation'
  | 'action_required'
  | 'failed';

export type EmailProviderType = 'gmail_api' | 'simulation';

export interface EmailPayload {
  to: string;
  recipientName: string;
  subject: string;
  activityName: string;
  registrationNumber: string;
  issueDate: string;
  verificationUrl: string;
  customBody?: string;
  pdfBase64?: string; // Base64 PDF attachment
  pdfFilename?: string;
  issuanceId?: string;
  idempotencyKey?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId: string;
  providerType: EmailProviderType;
  status: DeliveryStatus;
  deliveryStrategy?: DeliveryStrategy;
  usedSender?: string;
  attemptCount?: number;
  fallbackReason?: string;
  error?: string;
  note?: string;
  diagnosticCode?: string;
  sentAt: string;
  isAmbiguous?: boolean;
}

export interface ConnectionTestResult {
  success: boolean;
  providerType: EmailProviderType;
  message: string;
  error?: string;
  latencyMs?: number;
  details?: {
    connectedEmail?: string;
    scopes?: string[];
    rejectionReason?: string;
  };
}

export interface SenderIdentityConfig {
  gmail: {
    senderName: string;
    senderAddress: string;
  };
}

export interface EmailProviderRuntimeStatus {
  deliveryStrategy: DeliveryStrategy;
  activeProvider: EmailProviderType;
  isConfigured: boolean;
  gmailSender: {
    senderName: string;
    senderAddress: string;
  };
  gmail: {
    connected: boolean;
    email: string;
    hasToken: boolean;
    scopeVerified: boolean;
    isTestSendPassed: boolean;
    connectedAt?: string;
    lastTestedAt?: string;
    lastError?: string;
  };
  lastGmailTest?: {
    testedAt: string;
    success: boolean;
    message: string;
  };
}
