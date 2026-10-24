import type { Request, Response } from 'express';

// Sanitized diagnostic logger (never logs secrets or raw tokens)
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
  console.log(`[BNN-GMAIL-CONNECT] [${new Date().toISOString()}] [${stage}]`, JSON.stringify(sanitized));
}

/**
 * Dedicated Vercel Serverless Function: Connect Gmail Account
 * Handles Google OAuth 2.0 token validation, scope verification, and returns verified Gmail identity.
 */
export default async function handler(req: Request, res: Response) {
  // CORS Headers for Vercel production and custom domain
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
    const body = (req.body && typeof req.body === 'object') ? req.body : {};
    const clientToken = (
      body.accessToken ||
      (typeof req.headers.authorization === 'string' ? req.headers.authorization.replace(/^Bearer\s+/i, '') : '') ||
      ''
    ).trim();
    const clientEmail = (body.email || '').trim();
    const clientDisplayName = (body.displayName || '').trim();

    safeLog('REQUEST_RECEIVED', {
      hasToken: Boolean(clientToken),
      tokenLength: clientToken.length,
      clientEmail,
      clientDisplayName,
      origin: req.headers.origin,
    });

    if (!clientToken) {
      safeLog('REJECTED_MISSING_TOKEN');
      return res.status(400).json({
        success: false,
        error: 'OAuth Access Token Google tidak ditemukan pada permintaan. Pastikan proses login Google berhasil.',
        code: 'MISSING_ACCESS_TOKEN',
      });
    }

    // Verify token using official Google OAuth2 TokenInfo API
    // TokenInfo accepts any valid Google OAuth access token without requiring gmail.readonly
    safeLog('VALIDATING_WITH_GOOGLE');
    const tokenRes = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${encodeURIComponent(clientToken)}`);

    if (!tokenRes.ok) {
      const errData = await tokenRes.json().catch(() => ({}));
      const errorDesc = errData.error_description || errData.error || 'Token Google tidak valid';
      safeLog('GOOGLE_REJECTED_TOKEN', { status: tokenRes.status, errorDesc });

      return res.status(401).json({
        success: false,
        error: `Otorisasi Google tidak valid (${errorDesc}). Silakan klik "Hubungkan Akun Gmail" kembali.`,
        code: 'INVALID_GOOGLE_TOKEN',
      });
    }

    const tokenData = await tokenRes.json();
    safeLog('GOOGLE_ACCEPTED_TOKEN', {
      verifiedEmail: tokenData.email,
      expiresIn: tokenData.expires_in,
      scope: tokenData.scope,
    });

    // Check scope: must include gmail.send or mail.google.com
    const scopeStr = tokenData.scope || '';
    const hasSendScope = scopeStr.includes('gmail.send') || scopeStr.includes('mail.google.com');

    if (!hasSendScope) {
      safeLog('REJECTED_MISSING_SCOPE', { scopes: scopeStr });
      return res.status(403).json({
        success: false,
        error: 'Izin pengiriman Gmail (scope https://www.googleapis.com/auth/gmail.send) tidak diberikan. Silakan hubungkan ulang akun dan beri tanda centang pada izin pengiriman email.',
        code: 'MISSING_GMAIL_SEND_SCOPE',
      });
    }

    // Check token expiration
    const expiresIn = parseInt(tokenData.expires_in || '0', 10);
    if (expiresIn <= 0) {
      safeLog('REJECTED_EXPIRED_TOKEN');
      return res.status(401).json({
        success: false,
        error: 'Token akses Google telah kedaluwarsa. Silakan lakukan otorisasi ulang.',
        code: 'TOKEN_EXPIRED',
      });
    }

    const verifiedEmail = tokenData.email || clientEmail || 'sertifikat.bnnkgorontalo@gmail.com';
    const effectiveDisplayName = clientDisplayName || 'e-Sertifikat BNN Kabupaten Gorontalo';

    safeLog('SUCCESS', { verifiedEmail, effectiveDisplayName });

    return res.status(200).json({
      success: true,
      message: `Akun Gmail "${verifiedEmail}" berhasil dihubungkan ke e-Sertifikat BNN!`,
      email: verifiedEmail,
      displayName: effectiveDisplayName,
      scopeVerified: true,
      connectedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    safeLog('INTERNAL_ERROR', { message: err?.message || String(err) });
    return res.status(500).json({
      success: false,
      error: `Kendala internal saat memverifikasi akun Google: ${err?.message || 'Gagal menghubungi server Google'}`,
      code: 'INTERNAL_ERROR',
    });
  }
}
