import type { Request, Response } from 'express';
import { CentralDatabase } from '../src/server/database';

export default async function handler(req: Request, res: Response) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const diagnostic = await CentralDatabase.checkStatus();
    return res.status(200).json({
      status: 'ok',
      service: 'e-Sertifikat BNN Storage Diagnostics (Vercel Serverless)',
      timestamp: new Date().toISOString(),
      ...diagnostic,
    });
  } catch (err: any) {
    return res.status(500).json({
      status: 'error',
      service: 'e-Sertifikat BNN Storage Diagnostics (Vercel Serverless)',
      timestamp: new Date().toISOString(),
      error: 'Gagal menjalankan diagnostik penyimpanan',
      message: err?.message || 'Unknown internal diagnostic error',
    });
  }
}
