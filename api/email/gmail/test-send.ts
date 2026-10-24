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
  console.log(`[BNN-GMAIL-TEST-SEND] [${new Date().toISOString()}] [${stage}]`, JSON.stringify(sanitized));
}

function buildRawMimeMessage(params: {
  from: string;
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
}): string {
  const boundary = `===bnn_test_part_${Date.now().toString(36)}===`;
  const subjectEncoded = `=?UTF-8?B?${Buffer.from(params.subject, 'utf-8').toString('base64')}?=`;

  const lines: string[] = [
    `From: ${params.from}`,
    `To: ${params.to}`,
    `Subject: ${subjectEncoded}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset="UTF-8"`,
    `Content-Transfer-Encoding: base64`,
    '',
    Buffer.from(params.htmlBody, 'utf-8').toString('base64'),
  ];

  const rawMime = lines.join('\r\n');
  return Buffer.from(rawMime, 'utf-8').toString('base64url');
}

/**
 * Dedicated Vercel Serverless Function: Test Send Gmail
 * Dispatches test email via Gmail REST API to verify deliverability
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

  const startTime = Date.now();

  try {
    const body = (req.body && typeof req.body === 'object') ? req.body : {};
    const clientToken = (
      body.accessToken ||
      (typeof req.headers.authorization === 'string' ? req.headers.authorization.replace(/^Bearer\s+/i, '') : '') ||
      ''
    ).trim();

    const targetEmail = (body.to || body.gmailEmail || '').trim();
    const senderEmail = (body.gmailEmail || 'sertifikat.bnnkgorontalo@gmail.com').trim();
    const senderDisplayName = (body.senderName || 'e-Sertifikat BNN Kabupaten Gorontalo').trim();

    safeLog('REQUEST_RECEIVED', {
      hasToken: Boolean(clientToken),
      targetEmail,
      senderEmail,
      senderDisplayName,
    });

    if (!clientToken) {
      safeLog('REJECTED_MISSING_TOKEN');
      return res.status(400).json({
        success: false,
        providerType: 'gmail_api',
        message: 'Akun Gmail belum dihubungkan atau token akses tidak disertakan. Klik "Hubungkan Gmail" terlebih dahulu.',
        code: 'MISSING_TOKEN',
      });
    }

    if (!targetEmail) {
      return res.status(400).json({
        success: false,
        providerType: 'gmail_api',
        message: 'Alamat email tujuan uji coba tidak boleh kosong.',
      });
    }

    const senderHeader = `"${senderDisplayName}" <${senderEmail}>`;
    const testHtml = `
      <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f8fafc; color: #1e293b;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">
          <div style="background: #003566; padding: 20px; text-align: center; border-bottom: 3px solid #1677C8;">
            <h2 style="color: #ffffff; margin: 0; font-size: 18px;">BADAN NARKOTIKA NASIONAL</h2>
            <p style="color: #93c5fd; margin: 4px 0 0 0; font-size: 12px; font-weight: bold;">UJI PENGIRIMAN GMAIL ALTERNATIF</p>
          </div>
          <div style="padding: 24px;">
            <p>Yth. Administrator e-Sertifikat BNN,</p>
            <p>Pesan ini adalah <strong>Uji Coba Pengiriman Otomatis</strong> melalui <strong>Gmail API (OAuth 2.0)</strong>.</p>
            <div style="background: #eaf4fc; border-left: 4px solid #1677C8; padding: 12px; margin: 16px 0; border-radius: 4px;">
              <div><strong>Akun Gmail Pengirim:</strong> ${senderEmail}</div>
              <div><strong>Nama Pengirim:</strong> ${senderDisplayName}</div>
              <div><strong>Penerima:</strong> ${targetEmail}</div>
              <div><strong>Waktu Pengujian:</strong> ${new Date().toLocaleString('id-ID')} WITA</div>
              <div><strong>Status Otorisasi:</strong> Scope gmail.send Terverifikasi</div>
            </div>
            <p style="font-size: 12px; color: #64748b;">Dengan diterimanya email ini, metode Gmail Alternatif telah <strong>Lulus Uji Coba</strong> dan siap digunakan sebagai jalur pengiriman atau saluran fallback.</p>
          </div>
        </div>
      </div>
    `;

    const rawMessage = buildRawMimeMessage({
      from: senderHeader,
      to: targetEmail,
      subject: '[UJI COBA] Jalur Pengiriman Gmail Alternatif - e-Sertifikat BNN',
      htmlBody: testHtml,
    });

    safeLog('DISPATCHING_GMAIL_API');
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${clientToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: rawMessage }),
    });

    const data = await response.json().catch(() => ({}));
    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      const errMsg = data.error?.message || `Gmail API HTTP ${response.status}`;
      safeLog('GMAIL_API_FAILED', { status: response.status, errMsg });

      return res.status(200).json({
        success: false,
        providerType: 'gmail_api',
        message: `Uji pengiriman Gmail GAGAL: ${errMsg}`,
        latencyMs,
        details: { rejectionReason: errMsg },
      });
    }

    safeLog('GMAIL_API_SUCCESS', { messageId: data.id, latencyMs });

    return res.status(200).json({
      success: true,
      providerType: 'gmail_api',
      message: `Uji pengiriman Gmail BERHASIL! Dokumen uji coba diterima oleh ${targetEmail}. Jalur Gmail alternatif kini AKTIF dan siap digunakan.`,
      messageId: data.id || `gmail_msg_${Date.now()}`,
      latencyMs,
      details: {
        connectedEmail: senderEmail,
        scopes: ['https://www.googleapis.com/auth/gmail.send'],
      },
    });
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    safeLog('EXCEPTION', { error: err?.message || String(err) });

    return res.status(200).json({
      success: false,
      providerType: 'gmail_api',
      message: `Uji pengiriman Gmail GAGAL: ${err?.message || 'Gagal menghubungi server Gmail API'}`,
      latencyMs,
    });
  }
}
