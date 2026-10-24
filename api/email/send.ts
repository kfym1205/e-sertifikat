import type { Request, Response } from 'express';

function safeLog(stage: string, data?: Record<string, any>) {
  const sanitized: Record<string, any> = {};
  if (data) {
    for (const [key, value] of Object.entries(data)) {
      if (/token|secret|password|key|auth|cookie|credential/i.test(key)) {
        sanitized[key] = value ? `[REDACTED_${String(value).length}_CHARS]` : '[NONE]';
      } else {
        sanitized[key] = value;
      }
    }
  }
  console.log(`[BNN-GMAIL-SEND] [${new Date().toISOString()}] [${stage}]`, JSON.stringify(sanitized));
}

function buildRawMimeMessage(params: {
  from: string;
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  pdfBase64?: string;
  pdfFilename?: string;
}): string {
  const boundary = `===bnn_cert_part_${Date.now().toString(36)}===`;
  const subjectEncoded = `=?UTF-8?B?${Buffer.from(params.subject, 'utf-8').toString('base64')}?=`;

  const lines: string[] = [
    `From: ${params.from}`,
    `To: ${params.to}`,
    `Subject: ${subjectEncoded}`,
    `MIME-Version: 1.0`,
  ];

  if (params.pdfBase64) {
    lines.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
    lines.push('');
    lines.push(`--${boundary}`);
    lines.push(`Content-Type: text/html; charset="UTF-8"`);
    lines.push(`Content-Transfer-Encoding: base64`);
    lines.push('');
    lines.push(Buffer.from(params.htmlBody, 'utf-8').toString('base64'));
    lines.push('');
    lines.push(`--${boundary}`);

    const filename = params.pdfFilename || 'Sertifikat_Elektronik_BNN.pdf';
    lines.push(`Content-Type: application/pdf; name="${filename}"`);
    lines.push(`Content-Disposition: attachment; filename="${filename}"`);
    lines.push(`Content-Transfer-Encoding: base64`);
    lines.push('');

    const cleanPdf = params.pdfBase64.replace(/^data:application\/pdf;base64,/, '').replace(/\s/g, '');
    lines.push(cleanPdf);
    lines.push('');
    lines.push(`--${boundary}--`);
  } else {
    lines.push(`Content-Type: text/html; charset="UTF-8"`);
    lines.push(`Content-Transfer-Encoding: base64`);
    lines.push('');
    lines.push(Buffer.from(params.htmlBody, 'utf-8').toString('base64'));
  }

  const rawMime = lines.join('\r\n');
  return Buffer.from(rawMime, 'utf-8').toString('base64url');
}

/**
 * Dedicated Vercel Serverless Function: Send Certificate via Gmail API
 * Exclusively uses Gmail API with OAuth access token.
 */
export default async function handler(req: Request, res: Response) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: `Method ${req.method} Not Allowed` });
  }

  try {
    let body: any = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    } else if (!body || typeof body !== 'object') {
      body = {};
    }

    const authHeader = (Array.isArray(req.headers.authorization)
      ? req.headers.authorization[0]
      : req.headers.authorization) || '';

    const clientToken = (
      body.accessToken ||
      body.gmailAccessToken ||
      authHeader.replace(/^Bearer\s+/i, '') ||
      ''
    ).trim();

    const {
      to,
      recipientName,
      subject,
      textBody,
      activityName,
      registrationNumber,
      issueDate,
      verificationUrl,
      pdfBase64,
      pdfFilename,
      gmailEmail,
      senderName,
    } = body;

    safeLog('SEND_REQUEST_RECEIVED', {
      to,
      recipientName,
      hasToken: Boolean(clientToken),
      tokenLength: clientToken.length,
      hasPdf: Boolean(pdfBase64),
    });

    if (!to || !subject) {
      return res.status(400).json({
        success: false,
        error: 'Parameter "to" dan "subject" wajib diisi.',
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to.trim())) {
      return res.status(400).json({
        success: false,
        status: 'perm_failed',
        error: 'Format alamat email penerima tidak valid. Pengiriman dibatalkan secara permanen.',
        code: 'INVALID_RECIPIENT_EMAIL',
      });
    }

    if (!clientToken) {
      safeLog('REJECTED_NOT_CONNECTED');
      return res.status(400).json({
        success: false,
        status: 'action_required',
        code: 'GMAIL_NOT_CONNECTED',
        error: 'Akun Gmail belum dihubungkan oleh Administrator. Buka menu Pengaturan Email dan klik "Hubungkan Akun Gmail" sebelum dapat mengirim e-Sertifikat.',
      });
    }

    const senderEmail = (gmailEmail || '').trim() || 'sertifikat.bnnkgorontalo@gmail.com';
    const senderDisplayName = (senderName || 'e-Sertifikat BNN Kabupaten Gorontalo').trim();
    const senderHeader = `"${senderDisplayName}" <${senderEmail}>`;

    const formattedHtml = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 20px; color: #1e293b;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">
          <div style="background: #003566; padding: 24px; text-align: center; border-bottom: 3px solid #1677C8;">
            <h2 style="color: #ffffff; margin: 0; font-size: 20px;">BADAN NARKOTIKA NASIONAL</h2>
            <p style="color: #93c5fd; margin: 4px 0 0; font-size: 12px; font-weight: bold; text-transform: uppercase;">e-Sertifikat Elektronik Terverifikasi</p>
          </div>
          <div style="padding: 24px; font-size: 14px; line-height: 1.6;">
            <p>Yth. <strong>${recipientName || 'Peserta'}</strong>,</p>
            <p style="white-space: pre-line;">${textBody || 'Berikut dilampirkan e-Sertifikat resmi dari Badan Narkotika Nasional.'}</p>
            <div style="background: #f1f5f9; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1677C8;">
              <div style="margin-bottom: 6px;"><strong>Nama Kegiatan:</strong> ${activityName || '-'}</div>
              <div style="margin-bottom: 6px;"><strong>Nomor Registrasi:</strong> <span style="font-family: monospace; font-weight: bold; color: #003566;">${registrationNumber || '-'}</span></div>
              <div><strong>Tanggal Penerbitan:</strong> ${issueDate || '-'}</div>
            </div>
            ${
              verificationUrl
                ? `<p style="text-align: center; margin: 24px 0;">
                    <a href="${verificationUrl}" target="_blank" style="background: #00529B; color: #ffffff !important; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 13px; display: inline-block;">
                      Verifikasi Keaslian Dokumen &rarr;
                    </a>
                  </p>`
                : ''
            }
            <p style="font-size: 12px; color: #64748b; margin-top: 24px;">
              Dokumen resmi sertifikat dalam format PDF A4 terlampir pada email ini. Simpan dokumen tersebut dengan baik sebagai berkas bukti partisipasi resmi.
            </p>
          </div>
          <div style="padding: 16px 24px; background: #f8fafc; font-size: 11px; color: #64748b; text-align: center; border-top: 1px solid #e2e8f0;">
            Email resmi ini dikirim melalui integrasi Google Gmail API akun terotorisasi: <strong>${senderEmail}</strong>
          </div>
        </div>
      </body>
      </html>
    `;

    const rawMessage = buildRawMimeMessage({
      from: senderHeader,
      to: to.trim(),
      subject,
      htmlBody: formattedHtml,
      textBody,
      pdfBase64,
      pdfFilename:
        pdfFilename ||
        `Sertifikat_${(registrationNumber || 'BNN').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
    });

    safeLog('DISPATCHING_TO_GMAIL_API', { to: to.trim(), senderEmail });

    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${clientToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: rawMessage }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errMsg = data.error?.message || `Gmail API HTTP ${response.status}`;
      safeLog('GMAIL_API_ERROR', { status: response.status, errMsg });

      if (response.status === 401) {
        return res.status(200).json({
          success: false,
          status: 'action_required',
          code: 'TOKEN_EXPIRED',
          error: 'Token akses Google kedaluwarsa. Silakan lakukan "Hubungkan Ulang" pada menu Pengaturan Email.',
        });
      }

      if (response.status === 403) {
        return res.status(200).json({
          success: false,
          status: 'perm_failed',
          code: 'GMAIL_PERMISSION_DENIED',
          error: `Izin pengiriman Gmail ditolak: ${errMsg}. Pastikan izin pengiriman email (gmail.send) telah disetujui saat menghubungkan akun.`,
        });
      }

      if (response.status === 429) {
        return res.status(200).json({
          success: false,
          status: 'temp_failed',
          code: 'QUOTA_EXCEEDED',
          error: 'Batas kuota harian pengiriman email Google telah tercapai. Coba lagi dalam 24 jam atau gunakan akun Google Workspace.',
        });
      }

      return res.status(200).json({
        success: false,
        status: 'temp_failed',
        code: data.error?.status || 'GMAIL_API_ERROR',
        error: `Gmail API gagal mengirimkan email: ${errMsg}`,
      });
    }

    safeLog('GMAIL_API_SUCCESS', { messageId: data.id });

    return res.status(200).json({
      success: true,
      status: 'delivered',
      messageId: data.id || `gmail_msg_${Date.now()}`,
      usedMethod: 'gmail_api',
      deliveryStrategy: 'gmail_only',
      senderAddress: senderEmail,
      message: `e-Sertifikat berhasil dikirimkan ke ${to} melalui Gmail API.`,
    });
  } catch (err: any) {
    safeLog('UNCAUGHT_SEND_EXCEPTION', { error: err?.message || String(err) });
    return res.status(500).json({
      success: false,
      status: 'temp_failed',
      code: 'INTERNAL_SERVER_ERROR',
      error: `Kendala internal saat mengirimkan email: ${err?.message || 'Gagal menghubungi server Gmail API'}`,
    });
  }
}
