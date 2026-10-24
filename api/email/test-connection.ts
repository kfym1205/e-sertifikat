import type { Request, Response } from 'express';

/**
 * Dedicated Vercel Serverless Function: Test Gmail API Connection
 * Validates Google OAuth token without sending email
 */
export default async function handler(req: Request, res: Response) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const startTime = Date.now();
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
    authHeader.replace(/^Bearer\s+/i, '') ||
    ''
  ).trim();

  if (!clientToken) {
    return res.status(200).json({
      success: false,
      providerType: 'gmail_api',
      message: 'Akun Gmail belum dihubungkan. Silakan hubungkan akun Gmail terlebih dahulu.',
      latencyMs: 0,
    });
  }

  try {
    const tokenRes = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${encodeURIComponent(clientToken)}`);
    const latencyMs = Date.now() - startTime;

    if (!tokenRes.ok) {
      const errData = await tokenRes.json().catch(() => ({}));
      return res.status(200).json({
        success: false,
        providerType: 'gmail_api',
        message: `Token Google tidak valid (${errData.error_description || 'Kedaluwarsa'}). Hubungkan ulang akun Gmail.`,
        latencyMs,
      });
    }

    const tokenData = await tokenRes.json();
    const hasSendScope = (tokenData.scope || '').includes('gmail.send');

    return res.status(200).json({
      success: true,
      providerType: 'gmail_api',
      message: `Koneksi Google OAuth 2.0 Valid (${tokenData.email}, Izin Kirim: ${hasSendScope ? 'Aktif' : 'Belum Ada'}, Latensi: ${latencyMs}ms).`,
      latencyMs,
      details: {
        connectedEmail: tokenData.email,
        scopes: (tokenData.scope || '').split(' '),
      },
    });
  } catch (err: any) {
    return res.status(200).json({
      success: false,
      providerType: 'gmail_api',
      message: `Gagal memverifikasi token ke server Google: ${err.message}`,
      latencyMs: Date.now() - startTime,
    });
  }
}
