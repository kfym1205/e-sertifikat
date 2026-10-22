/**
 * Layanan Pengiriman Email (Decoupled Adapter Bridge)
 * Menghubungkan proses penerbitan sertifikat ke Adapter Email Terpisah (BNN SMTP, Relay API, Resend, atau Simulasi)
 */

import { emailAdapter } from '../services/email/emailAdapter';
import { DeliveryStatus, DeliveryStrategy } from '../types';

export { formatEmailBody } from '../services/email/emailAdapter';

export interface EmailSendResult {
  success: boolean;
  messageId: string;
  provider: string;
  status: DeliveryStatus;
  deliveryStrategy?: DeliveryStrategy;
  usedSender?: string;
  fallbackReason?: string;
  attemptCount?: number;
  error?: string;
  note?: string;
}

/**
 * Dispatcher email utama yang memanggil emailAdapter
 */
export async function sendCertificateEmail(payload: {
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
  issuanceId?: string;
}): Promise<EmailSendResult> {
  const result = await emailAdapter.sendEmail({
    to: payload.to,
    recipientName: payload.recipientName,
    subject: payload.subject,
    activityName: payload.activityName,
    registrationNumber: payload.registrationNumber,
    issueDate: payload.issueDate,
    verificationUrl: payload.verificationUrl,
    customBody: payload.customBody,
    pdfBase64: payload.pdfBase64,
    pdfFilename: payload.pdfFilename,
    issuanceId: payload.issuanceId,
  });

  return {
    success: result.success,
    messageId: result.messageId,
    provider: result.providerType,
    status: result.status,
    deliveryStrategy: result.deliveryStrategy,
    usedSender: result.usedSender,
    fallbackReason: result.fallbackReason,
    attemptCount: result.attemptCount,
    error: result.error,
    note: result.note,
  };
}
