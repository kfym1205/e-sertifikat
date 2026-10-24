import type { Request, Response } from 'express';
import nodemailer from 'nodemailer';

export default async function handler(req: Request, res: Response) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const startTime = Date.now();
  const body = (req.body && typeof req.body === 'object') ? req.body : {};
  const provider = body.providerType || 'bnn_smtp';

  const host = body.host || process.env.BNN_SMTP_HOST || 'mail.bnn.go.id';
  const port = parseInt(body.port || process.env.BNN_SMTP_PORT || '465', 10);
  const secure = body.secure !== undefined ? Boolean(body.secure) : (port === 465 || process.env.BNN_SMTP_SECURE === 'true');
  const user = body.user || process.env.BNN_SMTP_USER || 'bnn_kabgor@bnn.go.id';
  const pass = body.pass || process.env.BNN_SMTP_PASS || '';

  if (provider === 'bnn_smtp') {
    if (!host || !user) {
      return res.status(200).json({
        success: false,
        providerType: 'bnn_smtp',
        message: 'Host SMTP dan akun email satker wajib diisi.',
      });
    }

    if (!pass) {
      return res.status(200).json({
        success: false,
        providerType: 'bnn_smtp',
        message: 'Kata sandi akun email satker belum dikonfigurasi.',
      });
    }

    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 5000,
        tls: { rejectUnauthorized: false },
      });

      await transporter.verify();
      const latencyMs = Date.now() - startTime;

      return res.status(200).json({
        success: true,
        providerType: 'bnn_smtp',
        message: `Koneksi SMTP ke ${host}:${port} BERHASIL (Handshake TLS Valid, Latensi: ${latencyMs}ms).`,
        latencyMs,
      });
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      let humanMsg = `Koneksi SMTP ke ${host}:${port} gagal: ${err.message}`;
      if (err.code === 'ECONNREFUSED') {
        humanMsg = `Koneksi ditolak (ECONNREFUSED) pada ${host}:${port}. Port SMTP mungkin ditutup.`;
      } else if (err.code === 'ETIMEDOUT') {
        humanMsg = `Waktu koneksi habis (ETIMEDOUT) ke ${host}:${port}. Jaringan memblokir port SMTP. Disarankan menggunakan Fallback Gmail.`;
      }

      return res.status(200).json({
        success: false,
        providerType: 'bnn_smtp',
        message: humanMsg,
        latencyMs,
      });
    }
  }

  return res.status(200).json({
    success: true,
    providerType: provider,
    message: 'Pengujian koneksi siap digunakan.',
  });
}
