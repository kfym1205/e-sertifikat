import type { Request, Response } from 'express';

export default async function handler(req: Request, res: Response) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const body = (req.body && typeof req.body === 'object') ? req.body : {};
  return res.status(200).json({
    success: true,
    message: 'Konfigurasi provider email server berhasil diperbarui.',
    providerType: body.providerType || 'bnn_smtp',
  });
}
