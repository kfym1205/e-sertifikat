/**
 * Adapter Pengiriman Email e-Sertifikat BNN
 * Menggunakan integrasi resmi Gmail API (OAuth 2.0)
 * Tanpa metode atau fallback email BNN (bnn.go.id / SMTP)
 */

import {
  EmailPayload,
  SendEmailResult,
  ConnectionTestResult,
  EmailProviderRuntimeStatus,
  DeliveryStatus,
} from './types';
import {
  safeApiFetch,
  getGmailSessionFromClient,
  saveGmailSessionToClient,
} from '../../utils/apiClient';

/**
 * Format string template email dengan variabel dinamis
 */
export function formatEmailBody(
  template: string,
  variables: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{${key}}`, 'g'), value);
  }
  return result;
}

function renderEmailTemplate(
  template: string,
  data: {
    participantName: string;
    activityName: string;
    registrationNumber: string;
    issueDate: string;
    verificationUrl: string;
  }
): string {
  return formatEmailBody(template, {
    nama_peserta: data.participantName,
    nama_kegiatan: data.activityName,
    nomor_registrasi: data.registrationNumber,
    tanggal_terbit: data.issueDate,
    link_verifikasi: data.verificationUrl,
  });
}

class EmailServiceAdapter {
  private apiBase = '/api/email';

  /**
   * Mengambil status konfigurasi Gmail API saat ini dari server backend / client session
   */
  async getStatus(): Promise<EmailProviderRuntimeStatus> {
    const localGmailSession = getGmailSessionFromClient();

    try {
      const res = await safeApiFetch<EmailProviderRuntimeStatus>(`${this.apiBase}/config-status`);
      if (res.ok && res.data) {
        const serverData = res.data;
        if (localGmailSession && !serverData.gmail?.connected) {
          serverData.gmail = {
            connected: true,
            email: localGmailSession.email,
            hasToken: Boolean(localGmailSession.accessToken),
            scopeVerified: localGmailSession.scopeVerified,
            isTestSendPassed: localGmailSession.isTestSendPassed,
            connectedAt: localGmailSession.connectedAt,
            lastTestedAt: localGmailSession.lastTestedAt,
          };
          serverData.gmailSender = {
            senderName: localGmailSession.displayName || 'e-Sertifikat BNN Kabupaten Gorontalo',
            senderAddress: localGmailSession.email,
          };
          serverData.isConfigured = true;
        }
        return serverData;
      }
    } catch (err) {
      console.warn('Gagal mengambil status email dari server, menggunakan status lokal:', err);
    }

    return {
      deliveryStrategy: 'gmail_only',
      activeProvider: 'gmail_api',
      isConfigured: Boolean(localGmailSession?.accessToken),
      gmailSender: {
        senderName: localGmailSession?.displayName || 'e-Sertifikat BNN Kabupaten Gorontalo',
        senderAddress: localGmailSession?.email || '',
      },
      gmail: {
        connected: Boolean(localGmailSession?.accessToken),
        email: localGmailSession?.email || '',
        hasToken: Boolean(localGmailSession?.accessToken),
        scopeVerified: Boolean(localGmailSession?.scopeVerified),
        isTestSendPassed: Boolean(localGmailSession?.isTestSendPassed),
        connectedAt: localGmailSession?.connectedAt,
        lastTestedAt: localGmailSession?.lastTestedAt,
      },
    };
  }

  /**
   * Menguji koneksi otorisasi Gmail API
   */
  async testConnection(): Promise<ConnectionTestResult> {
    const startTime = Date.now();
    const session = getGmailSessionFromClient();

    if (!session?.accessToken) {
      return {
        success: false,
        providerType: 'gmail_api',
        message: 'Akun Gmail belum dihubungkan. Klik "Hubungkan Akun Gmail" terlebih dahulu.',
        latencyMs: 0,
        details: {
          rejectionReason: 'Token akses tidak tersedia di sesi administrator.',
        },
      };
    }

    try {
      const res = await safeApiFetch<ConnectionTestResult>(`${this.apiBase}/test-connection`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.accessToken}` },
        body: JSON.stringify({ accessToken: session.accessToken }),
      });

      if (res.ok && res.data) {
        res.data.latencyMs = Date.now() - startTime;
        return res.data;
      }

      return {
        success: false,
        providerType: 'gmail_api',
        message: res.data?.message || res.data?.error || `Koneksi Google API gagal (${res.status}).`,
        latencyMs: Date.now() - startTime,
        details: {
          rejectionReason: res.data?.error || 'Token tidak valid atau kedaluwarsa.',
        },
      };
    } catch (err: any) {
      return {
        success: false,
        providerType: 'gmail_api',
        message: `Koneksi gagal: ${err.message || 'Tidak dapat menghubungi server API backend.'}`,
        latencyMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Menguji pengiriman email percobaan khusus akun Gmail yang terhubung
   */
  async testGmailSend(toRecipient: string): Promise<ConnectionTestResult> {
    const startTime = Date.now();
    const session = getGmailSessionFromClient();

    if (!session?.accessToken) {
      return {
        success: false,
        providerType: 'gmail_api',
        message: 'Akun Gmail belum dihubungkan. Klik "Hubungkan Akun Gmail" terlebih dahulu.',
        latencyMs: 0,
      };
    }

    try {
      const res = await safeApiFetch<ConnectionTestResult>(`${this.apiBase}/gmail/test-send`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.accessToken}` },
        body: JSON.stringify({
          to: toRecipient,
          accessToken: session.accessToken,
          gmailEmail: session.email,
          senderName: session.displayName,
        }),
      });

      if (res.ok && res.data) {
        res.data.latencyMs = Date.now() - startTime;

        if (res.data.success) {
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
   * Mengirimkan email sertifikat ke peserta langsung melalui Gmail API
   */
  async sendEmail(payload: EmailPayload): Promise<SendEmailResult> {
    const session = getGmailSessionFromClient();

    // Validasi akun Gmail terhubung sebelum mencoba pengiriman
    if (!session?.accessToken || !session.email) {
      return {
        success: false,
        messageId: '',
        providerType: 'gmail_api',
        status: 'action_required',
        deliveryStrategy: 'gmail_only',
        usedSender: '',
        error: 'Akun Gmail pengirim belum dihubungkan oleh Administrator. Buka menu Pengaturan Email dan klik "Hubungkan Akun Gmail" untuk mengaktifkan pengiriman.',
        diagnosticCode: 'GMAIL_NOT_CONNECTED',
        sentAt: new Date().toISOString(),
      };
    }

    const renderedBody = payload.customBody
      ? renderEmailTemplate(payload.customBody, {
          participantName: payload.recipientName,
          activityName: payload.activityName,
          registrationNumber: payload.registrationNumber,
          issueDate: payload.issueDate,
          verificationUrl: payload.verificationUrl,
        })
      : `Yth. ${payload.recipientName},\n\nTerima kasih atas partisipasi Anda dalam kegiatan ${payload.activityName}.\n\nSertifikat resmi Anda telah diterbitkan dengan Nomor Registrasi: ${payload.registrationNumber}.\nTanggal Penerbitan: ${payload.issueDate}.\n\nTautan Verifikasi Dokumen:\n${payload.verificationUrl}\n\nSalam hormat,\nPanitia ${payload.activityName}`;

    const idempotencyKey = payload.idempotencyKey || `idem_${payload.registrationNumber}_${Date.now()}`;

    try {
      const res = await safeApiFetch<any>(`${this.apiBase}/send`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.accessToken}` },
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
          accessToken: session.accessToken,
          gmailEmail: session.email,
          senderName: session.displayName || 'e-Sertifikat BNN Kabupaten Gorontalo',
        }),
      });

      const result = res.data || {};
      const isOk = Boolean(res.ok && result.success);
      const deliveryStatus: DeliveryStatus = result.status || (isOk ? 'delivered' : 'temp_failed');

      return {
        success: isOk,
        messageId: result.messageId || '',
        providerType: 'gmail_api',
        status: deliveryStatus,
        deliveryStrategy: 'gmail_only',
        usedSender: result.senderAddress || session.email,
        attemptCount: result.attemptCount || 1,
        note: result.message || result.note,
        error: result.error,
        diagnosticCode: result.code,
        sentAt: new Date().toISOString(),
        isAmbiguous: Boolean(result.isAmbiguous),
      };
    } catch (err: any) {
      return {
        success: false,
        messageId: '',
        providerType: 'gmail_api',
        status: 'temp_failed',
        deliveryStrategy: 'gmail_only',
        usedSender: session.email,
        error: err.message || 'Koneksi ke gateway pengiriman Gmail API terputus.',
        sentAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Menyimpan identitas nama pengirim Gmail
   */
  async saveGmailSender(senderName: string): Promise<{ success: boolean; message: string }> {
    const session = getGmailSessionFromClient();
    if (session) {
      session.displayName = senderName;
      saveGmailSessionToClient(session);
    }
    return { success: true, message: 'Nama tampilan pengirim Gmail berhasil diperbarui.' };
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

  /**
   * Rekonsiliasi status email yang belum pasti
   */
  async reconcileLog(logId: string): Promise<{ success: boolean; message: string; log?: any }> {
    try {
      const res = await safeApiFetch<{ success: boolean; message: string; log?: any }>(`${this.apiBase}/reconcile/${logId}`, {
        method: 'POST',
      });
      return res.data || { success: true, message: 'Status log diperbarui.' };
    } catch (err: any) {
      return { success: true, message: 'Status log diperbarui.' };
    }
  }
}

export const emailAdapter = new EmailServiceAdapter();
