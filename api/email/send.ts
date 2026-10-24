import type { Request, Response } from 'express';
import nodemailer from 'nodemailer';

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

  const body = (req.body && typeof req.body === 'object') ? req.body : {};
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
    accessToken,
    gmailEmail,
    senderName,
  } = body;

  if (!to || !subject) {
    return res.status(400).json({ success: false, error: 'Parameter "to" dan "subject" wajib diisi.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(to.trim())) {
    return res.status(400).json({
      success: false,
      status: 'perm_failed',
      error: 'Format alamat email penerima tidak valid.',
    });
  }

  const clientToken = (
    accessToken ||
    (typeof req.headers.authorization === 'string' ? req.headers.authorization.replace(/^Bearer\s+/i, '') : '') ||
    ''
  ).trim();

  const formattedHtml = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden;">
        <div style="background: #003566; padding: 20px; text-align: center;">
          <h2 style="color: #fff; margin: 0;">BADAN NARKOTIKA NASIONAL</h2>
          <p style="color: #93c5fd; margin: 4px 0 0; font-size: 12px;">e-Sertifikat Elektronik Terverifikasi</p>
        </div>
        <div style="padding: 24px;">
          <p>Yth. <strong>${recipientName || 'Peserta'}</strong>,</p>
          <p style="white-space: pre-line;">${textBody || 'Berikut dilampirkan e-Sertifikat resmi dari Badan Narkotika Nasional.'}</p>
          <div style="background: #f1f5f9; padding: 12px; border-radius: 6px; margin: 16px 0;">
            <div><strong>Kegiatan:</strong> ${activityName || '-'}</div>
            <div><strong>Nomor Registrasi:</strong> ${registrationNumber || '-'}</div>
            <div><strong>Tanggal:</strong> ${issueDate || '-'}</div>
          </div>
          ${verificationUrl ? `<p style="text-align: center;"><a href="${verificationUrl}" style="background: #00529B; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">Verifikasi Keaslian Sertifikat &rarr;</a></p>` : ''}
          <p style="font-size: 12px; color: #64748b; margin-top: 20px;">Dokumen PDF resmi e-Sertifikat terlampir pada email ini.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  // Priority 1: If Gmail OAuth token is present, send via Gmail API
  if (clientToken) {
    try {
      const gEmail = (gmailEmail || 'sertifikat.bnnkgorontalo@gmail.com').trim();
      const gName = (senderName || 'e-Sertifikat BNN Kabupaten Gorontalo').trim();
      const senderHeader = `"${gName}" <${gEmail}>`;

      const raw = buildRawMimeMessage({
        from: senderHeader,
        to: to.trim(),
        subject,
        htmlBody: formattedHtml,
        textBody,
        pdfBase64,
        pdfFilename,
      });

      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${clientToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        return res.status(200).json({
          success: true,
          status: 'delivered',
          messageId: data.id || `gmail_${Date.now()}`,
          usedMethod: 'gmail_api',
          senderAddress: gEmail,
          message: `e-Sertifikat berhasil dikirimkan ke ${to} melalui Gmail API.`,
        });
      }
    } catch (gErr: any) {
      console.warn('Gmail API dispatch attempt failed, evaluating SMTP fallback:', gErr?.message);
    }
  }

  // Priority 2: SMTP server
  const smtpHost = process.env.BNN_SMTP_HOST;
  const smtpUser = process.env.BNN_SMTP_USER;
  const smtpPass = process.env.BNN_SMTP_PASS;

  if (smtpHost && smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(process.env.BNN_SMTP_PORT || '465', 10),
        secure: process.env.BNN_SMTP_SECURE === 'true' || process.env.BNN_SMTP_PORT === '465',
        auth: { user: smtpUser, pass: smtpPass },
        tls: { rejectUnauthorized: false },
      });

      const mailOptions: any = {
        from: process.env.BNN_EMAIL_FROM || `BNN Kabupaten Gorontalo <${smtpUser}>`,
        to: to.trim(),
        subject,
        html: formattedHtml,
        text: textBody,
      };

      if (pdfBase64) {
        mailOptions.attachments = [
          {
            filename: pdfFilename || 'Sertifikat_Elektronik_BNN.pdf',
            content: pdfBase64.replace(/^data:application\/pdf;base64,/, ''),
            encoding: 'base64',
          },
        ];
      }

      const info = await transporter.sendMail(mailOptions);
      return res.status(200).json({
        success: true,
        status: 'delivered',
        messageId: info.messageId || `smtp_${Date.now()}`,
        usedMethod: 'bnn_smtp',
        senderAddress: smtpUser,
        message: `e-Sertifikat berhasil dikirimkan ke ${to} melalui SMTP Resmi BNN.`,
      });
    } catch (smtpErr: any) {
      return res.status(500).json({
        success: false,
        status: 'failed',
        error: `Pengiriman gagal via SMTP: ${smtpErr?.message || 'Koneksi ditolak'}`,
      });
    }
  }

  return res.status(400).json({
    success: false,
    status: 'failed',
    error: 'Tidak ada metode pengiriman email yang aktif. Hubungkan Gmail atau konfigurasikan SMTP BNN.',
  });
}
