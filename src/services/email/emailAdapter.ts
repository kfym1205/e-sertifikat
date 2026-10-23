import {
  ConnectionTestResult,
  DeliveryStatus,
  DeliveryStrategy,
  EmailPayload,
  EmailProviderRuntimeStatus,
  EmailProviderType,
  SendEmailResult,
} from './types';
import {
  safeApiFetch,
  getGmailSessionFromClient,
  saveGmailSessionToClient,
} from '../../utils/apiClient';

/**
 * Utilitas format teks email dengan penggantian variabel/token
 */
export function renderEmailTemplate(template: string, data: {
  participantName: string;
  activityName: string;
  registrationNumber: string;
  issueDate: string;
  verificationUrl: string;
}): string {
  return template
    .replace(/\[Nama Peserta\]/g, data.participantName)
    .replace(/\[Nama Kegiatan\]/g, data.activityName)
    .replace(/\[Nomor Registrasi\]/g, data.registrationNumber)
    .replace(/\[Tanggal Sertifikat\]/g, data.issueDate)
    .replace(/\[Tautan Verifikasi\]/g, data.verificationUrl);
}

export const formatEmailBody = renderEmailTemplate;

/**
 * Adapter Pengiriman Email Terpisah (Pluggable Email Service)
 * Mengirim permintaan ke backend serverless/express endpoint dengan penanganan respons aman (bebas SyntaxError JSON)
 */
class EmailServiceAdapter {
  private apiBase = '/api/email';

  /**
   * Mengambil status konfigurasi provider saat ini dari server backend
   */
  async getStatus(): Promise<EmailProviderRuntimeStatus> {
    const localGmailSession = getGmailSessionFromClient();

    try {
      const res = await safeApiFetch<EmailProviderRuntimeStatus>(`${this.apiBase}/config-status`);
      if (res.ok && res.data) {
        const serverData = res.data;
        // Merge client session if serverless container was cold-started without memory cache
        if (localGmailSession && !serverData.gmail?.connected) {
          serverData.gmail = {
            connected: true,
            email: localGmailSession.email,
            hasToken: true,
            scopeVerified: localGmailSession.scopeVerified,
            isTestSendPassed: localGmailSession.isTestSendPassed,
            connectedAt: localGmailSession.connectedAt,
            lastTestedAt: localGmailSession.lastTestedAt,
          };
          serverData.gmailSender = {
            senderName: localGmailSession.displayName || 'e-Sertifikat BNN Kabupaten Gorontalo',
            senderAddress: localGmailSession.email,
          };
        }
        return serverData;
      }
    } catch (err) {
      console.warn('Gagal mengambil status email dari server, menggunakan status lokal fallback:', err);
    }

    // Default fallback status if serverless endpoint is starting up
    return {
      deliveryStrategy: 'bnn_primary_gmail_fallback',
      activeProvider: 'bnn_smtp',
      isConfigured: Boolean(localGmailSession),
      bnnSender: {
        senderName: 'BNN Kabupaten Gorontalo',
        senderAddress: 'bnn_kabgor@bnn.go.id',
      },
      gmailSender: {
        senderName: localGmailSession?.displayName || 'e-Sertifikat BNN Kabupaten Gorontalo',
        senderAddress: localGmailSession?.email || 'sertifikat.bnnkgorontalo@gmail.com',
      },
      bnnSmtp: {
        host: 'mail.bnn.go.id',
        port: 465,
        secure: true,
        user: 'bnn_kabgor@bnn.go.id',
        hasPassword: false,
        fromAddress: 'BNN Kabupaten Gorontalo <bnn_kabgor@bnn.go.id>',
      },
      bnnRelay: {
        endpointUrl: '',
        hasApiKey: false,
        fromAddress: 'BNN Kabupaten Gorontalo <bnn_kabgor@bnn.go.id>',
      },
      gmail: {
        connected: Boolean(localGmailSession),
        email: localGmailSession?.email || '',
        hasToken: Boolean(localGmailSession?.accessToken),
        scopeVerified: Boolean(localGmailSession?.scopeVerified),
        isTestSendPassed: Boolean(localGmailSession?.isTestSendPassed),
        connectedAt: localGmailSession?.connectedAt,
        lastTestedAt: localGmailSession?.lastTestedAt,
      },
      resend: {
        hasApiKey: false,
        fromAddress: 'sertifikat@bnn.go.id',
      },
    };
  }

  /**
   * Menguji koneksi handshake (socket/TLS/auth) tanpa mengirim email
   */
  async testConnection(customConfig?: {
    providerType: EmailProviderType;
    host?: string;
    port?: number;
    secure?: boolean;
    user?: string;
    pass?: string;
    endpointUrl?: string;
    apiKey?: string;
    fromAddress?: string;
  }): Promise<ConnectionTestResult> {
    const startTime = Date.now();
    try {
      const res = await safeApiFetch<ConnectionTestResult>(`${this.apiBase}/test-connection`, {
        method: 'POST',
        body: JSON.stringify(customConfig || {}),
      });

      if (res.ok && res.data) {
        res.data.latencyMs = Date.now() - startTime;
        return res.data;
      }

      return {
        success: false,
        providerType: customConfig?.providerType || 'bnn_smtp',
        message: res.data?.message || res.data?.error || `Koneksi gagal (${res.status}).`,
        latencyMs: Date.now() - startTime,
        details: {
          rejectionReason: res.data?.error || 'Server tidak merespons pengujian koneksi.',
        },
      };
    } catch (err: any) {
      return {
        success: false,
        providerType: customConfig?.providerType || 'bnn_smtp',
        message: `Koneksi gagal: ${err.message || 'Tidak dapat menghubungi server API backend.'}`,
        latencyMs: Date.now() - startTime,
        details: {
          rejectionReason: 'Jaringan atau endpoint /api/email/test-connection tidak merespons.',
        },
      };
    }
  }

  /**
   * Menguji pengiriman email percobaan khusus akun Gmail alternatif
   */
  async testGmailSend(toRecipient: string): Promise<ConnectionTestResult> {
    const startTime = Date.now();
    const session = getGmailSessionFromClient();

    try {
      const res = await safeApiFetch<ConnectionTestResult>(`${this.apiBase}/gmail/test-send`, {
        method: 'POST',
        headers: session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {},
        body: JSON.stringify({
          to: toRecipient,
          accessToken: session?.accessToken,
          gmailEmail: session?.email,
          senderName: session?.displayName,
        }),
      });

      if (res.ok && res.data) {
        res.data.latencyMs = Date.now() - startTime;

        if (res.data.success && session) {
          session.isTestSendPassed = true;
          session.lastTestedAt = new Date().toISOString();
          saveGmailSessionToClient(session);
        }

        return res.data;
      }

      return {
        success: false,
        providerType: 'gmail_api',
        message: res.data?.message || res.data?.error || `Uji pengiriman Gmail gagal (${res.status}).`,
        latencyMs: Date.now() - startTime,
        details: {
          rejectionReason: res.data?.error || 'Server backend menolak pengiriman uji coba Gmail.',
        },
      };
    } catch (err: any) {
      return {
        success: false,
        providerType: 'gmail_api',
        message: `Uji pengiriman Gmail gagal: ${err.message || 'Tidak dapat terhubung ke server backend.'}`,
        latencyMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Mengirimkan email sertifikat ke peserta melalui adapter provider aktif dengan strategi fallback backend
   */
  async sendEmail(payload: EmailPayload): Promise<SendEmailResult> {
    const renderedBody = payload.customBody
      ? renderEmailTemplate(payload.customBody, {
          participantName: payload.recipientName,
          activityName: payload.activityName,
          registrationNumber: payload.registrationNumber,
          issueDate: payload.issueDate,
          verificationUrl: payload.verificationUrl,
        })
      : `Yth. ${payload.recipientName},\n\nTerima kasih atas partisipasi Anda dalam kegiatan ${payload.activityName}.\n\nSertifikat resmi Anda telah diterbitkan dengan Nomor Registrasi: ${payload.registrationNumber}.\nTanggal Penerbitan: ${payload.issueDate}.\n\nTautan Verifikasi Dokumen:\n${payload.verificationUrl}\n\nSalam hormat,\nPanitia ${payload.activityName}`;

    // Generate unique idempotency key
    const idempotencyKey = payload.idempotencyKey || `idem_${payload.registrationNumber}_${Date.now()}`;
    const session = getGmailSessionFromClient();

    try {
      const res = await safeApiFetch<any>(`${this.apiBase}/send`, {
        method: 'POST',
        headers: session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {},
        body: JSON.stringify({
          to: payload.to,
          recipientName: payload.recipientName,
          subject: payload.subject,
          textBody: renderedBody,
          activityName: payload.activityName,
          registrationNumber: payload.registrationNumber,
          issueDate: payload.issueDate,
          verificationUrl: payload.verificationUrl,
          issuanceId: payload.issuanceId,
          idempotencyKey,
          pdfBase64: payload.pdfBase64,
          pdfFilename:
            payload.pdfFilename ||
            `Sertifikat_${payload.registrationNumber.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
          // Pass Gmail OAuth token for serverless execution
          gmailAccessToken: session?.accessToken,
          gmailEmail: session?.email,
          gmailSenderName: session?.displayName,
        }),
      });

      const result = res.data || {};
      const deliveryStatus: DeliveryStatus = result.status || (result.success ? 'delivered' : 'temp_failed');

      return {
        success: Boolean(result.success),
        messageId: result.messageId || '',
        providerType: result.providerType || 'bnn_smtp',
        status: deliveryStatus,
        deliveryStrategy: result.deliveryStrategy,
        usedSender: result.usedSender,
        fallbackReason: result.fallbackReason,
        attemptCount: result.attemptCount || 1,
        note: result.note,
        error: result.error,
        diagnosticCode: result.code,
        sentAt: new Date().toISOString(),
        isAmbiguous: Boolean(result.isAmbiguous),
      };
    } catch (err: any) {
      return {
        success: false,
        messageId: '',
        providerType: 'bnn_smtp',
        status: 'temp_failed',
        error: err.message || 'Koneksi ke gateway pengiriman email terputus.',
        sentAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Menyimpan konfigurasi provider email pada server
   */
  async saveConfig(configData: any): Promise<{ success: boolean; message: string }> {
    try {
      const res = await safeApiFetch<{ success: boolean; message: string }>(`${this.apiBase}/save-config`, {
        method: 'POST',
        body: JSON.stringify(configData),
      });
      return res.data || { success: false, message: 'Gagal memproses konfigurasi.' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Gagal menyimpan konfigurasi.' };
    }
  }

  /**
   * Menyimpan strategi pengiriman multi-metode & identitas pengirim
   */
  async saveStrategy(strategyData: {
    deliveryStrategy: DeliveryStrategy;
    bnnSender?: { senderName: string; senderAddress: string };
    gmailSender?: { senderName: string; senderAddress: string };
    bnnMethod?: 'bnn_smtp' | 'bnn_relay_api';
  }): Promise<{ success: boolean; message: string }> {
    try {
      const res = await safeApiFetch<{ success: boolean; message: string }>(`${this.apiBase}/save-strategy`, {
        method: 'POST',
        body: JSON.stringify(strategyData),
      });
      return res.data || { success: false, message: 'Gagal memproses strategi pengiriman.' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Gagal menyimpan strategi pengiriman.' };
    }
  }

  /**
   * Rekonsiliasi status email yang belum pasti
   */
  async reconcileLog(logId: string): Promise<{ success: boolean; message: string; log?: any }> {
    try {
      const res = await safeApiFetch<{ success: boolean; message: string; log?: any }>(`${this.apiBase}/reconcile/${logId}`, {
        method: 'POST',
      });
      return res.data || { success: false, message: 'Gagal merekonsiliasi status log.' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Gagal merekonsiliasi status log.' };
    }
  }

  /**
   * Mengambil log pengiriman terpusat dari server
   */
  async getDeliveryLogs(): Promise<any[]> {
    try {
      const res = await safeApiFetch<any[]>(`${this.apiBase}/logs`);
      if (res.ok && Array.isArray(res.data)) {
        return res.data;
      }
      return [];
    } catch {
      return [];
    }
  }
}

export const emailAdapter = new EmailServiceAdapter();
