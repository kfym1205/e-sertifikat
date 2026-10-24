import type { Request, Response } from 'express';

/**
 * Dedicated Vercel Serverless Function: Email Config Status
 * Provides runtime Gmail API configuration status to frontend
 */
export default async function handler(req: Request, res: Response) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const authHeader = (Array.isArray(req.headers.authorization)
    ? req.headers.authorization[0]
    : req.headers.authorization) || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  return res.status(200).json({
    deliveryStrategy: 'gmail_only',
    activeProvider: 'gmail_api',
    isConfigured: Boolean(token),
    gmailSender: {
      senderName: process.env.GMAIL_SENDER_NAME || 'e-Sertifikat BNN Kabupaten Gorontalo',
      senderAddress: process.env.GMAIL_SENDER_EMAIL || '',
    },
    gmail: {
      connected: Boolean(token),
      email: process.env.GMAIL_SENDER_EMAIL || '',
      hasToken: Boolean(token),
      scopeVerified: Boolean(token),
      isTestSendPassed: false,
    },
  });
}
