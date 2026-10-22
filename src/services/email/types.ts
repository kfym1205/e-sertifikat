/**
 * Definisi Tipe Data Arsitektur Adapter Email Terpisah
 * Mendukung: BNN Official SMTP, BNN Approved HTTP Relay, Google Workspace, Resend, dan Diagnostic Fallback.
 */

export type DeliveryStrategy = 'bnn_primary_gmail_fallback' | 'bnn_only' | 'gmail_only';

export type DeliveryStatus =
  | 'pending'
  | 'processing'
  | 'delivered'
  | 'temp_failed'
  | 'perm_failed'
  | 'fallen_back_gmail'
  | 'awaiting_confirmation'
  | 'action_required'
  | 'failed';

export type EmailProviderType =
  | 'bnn_smtp'
  | 'bnn_relay_api'
  | 'gmail_api'
  | 'resend'
  | 'simulation';

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
  fallbackReason?: string;
  attemptCount?: number;
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
  latencyMs?: number;
  details?: {
    host?: string;
    port?: number;
    secure?: boolean;
    authVerified?: boolean;
    tlsVerified?: boolean;
    endpointUrl?: string;
    socketResponse?: string;
    rejectionReason?: string;
    connectedEmail?: string;
    scopes?: string[];
  };
}

export interface BnnSmtpConfig {
  host: string;
  port: number;
  secure: boolean; // true for 465, false for 587
  user: string;
  pass?: string;
  fromAddress: string;
  rejectUnauthorizedTls?: boolean;
}

export interface BnnRelayConfig {
  endpointUrl: string;
  apiKey?: string;
  fromAddress: string;
}

export interface SenderIdentityConfig {
  bnn: {
    senderName: string;
    senderAddress: string;
  };
  gmail: {
    senderName: string;
    senderAddress: string;
  };
}

export interface EmailProviderRuntimeStatus {
  deliveryStrategy: DeliveryStrategy;
  activeProvider: EmailProviderType;
  bnnMethod?: 'bnn_smtp' | 'bnn_relay_api';
  isConfigured: boolean;
  bnnSender: {
    senderName: string;
    senderAddress: string;
  };
  gmailSender: {
    senderName: string;
    senderAddress: string;
  };
  bnnSmtp: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    hasPassword: boolean;
    fromAddress: string;
  };
  bnnRelay: {
    endpointUrl: string;
    hasApiKey: boolean;
    fromAddress: string;
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
  resend: {
    hasApiKey: boolean;
    fromAddress: string;
  };
  lastConnectionTest?: {
    testedAt: string;
    success: boolean;
    message: string;
  };
  lastGmailTest?: {
    testedAt: string;
    success: boolean;
    message: string;
  };
}
