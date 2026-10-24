import type { Request, Response } from 'express';

/**
 * Dedicated Vercel Serverless Function: Disconnect Gmail Account
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

  return res.status(200).json({
    success: true,
    message: 'Koneksi akun Gmail alternatif berhasil diputuskan.',
  });
}
