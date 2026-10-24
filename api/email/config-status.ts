import type { Request, Response } from 'express';

/**
 * Dedicated Vercel Serverless Function: Email Config Status
 * Provides runtime email configuration status to frontend
 */
export default async function handler(req: Request, res: Response) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const deliveryStrategy = process.env.BNN_DELIVERY_STRATEGY || 'bnn_primary_gmail_fallback';
  const providerType = process.env.BNN_EMAIL_PROVIDER || 'bnn_smtp';
  const bnnMethod = process.env.BNN_EMAIL_METHOD || 'bnn_smtp';

  const smtpUser = process.env.BNN_SMTP_USER || 'bnn_kabgor@bnn.go.id';
  const smtpPass = process.env.BNN_SMTP_PASS || '';
  const smtpHost = process.env.BNN_SMTP_HOST || 'mail.bnn.go.id';
  const smtpPort = parseInt(process.env.BNN_SMTP_PORT || '465', 10);
  const smtpSecure = process.env.BNN_SMTP_SECURE === 'true' || smtpPort === 465;

  const relayEndpoint = process.env.BNN_RELAY_ENDPOINT || '';
  const relayKey = process.env.BNN_RELAY_KEY || '';

  const resendKey = process.env.RESEND_API_KEY || '';

  const isConfigured = Boolean(
    (smtpHost && smtpUser && smtpPass) ||
    relayEndpoint ||
    providerType === 'simulation'
  );

  return res.status(200).json({
    deliveryStrategy,
    activeProvider: providerType,
    bnnMethod,
    isConfigured,
    bnnSender: {
      senderName: process.env.BNN_SENDER_NAME || 'BNN Kabupaten Gorontalo',
      senderAddress: process.env.BNN_SENDER_EMAIL || smtpUser,
    },
    gmailSender: {
      senderName: process.env.GMAIL_SENDER_NAME || 'e-Sertifikat BNN Kabupaten Gorontalo',
      senderAddress: process.env.GMAIL_SENDER_EMAIL || 'sertifikat.bnnkgorontalo@gmail.com',
    },
    bnnSmtp: {
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      user: smtpUser,
      hasPassword: Boolean(smtpPass),
      fromAddress: process.env.BNN_EMAIL_FROM || `BNN Kabupaten Gorontalo <${smtpUser}>`,
    },
    bnnRelay: {
      endpointUrl: relayEndpoint,
      hasApiKey: Boolean(relayKey),
      fromAddress: process.env.BNN_EMAIL_FROM || `BNN Kabupaten Gorontalo <${smtpUser}>`,
    },
    gmail: {
      connected: false,
      email: '',
      hasToken: false,
      scopeVerified: false,
      isTestSendPassed: false,
    },
    resend: {
      hasApiKey: Boolean(resendKey),
      fromAddress: process.env.EMAIL_FROM || 'sertifikat@bnn.go.id',
    },
  });
}
