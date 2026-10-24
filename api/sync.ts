import type { Request, Response } from 'express';
import { CentralDatabase } from '../src/server/database';

export default async function handler(req: Request, res: Response) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const data = await CentralDatabase.getAllData();
      const status = CentralDatabase.getStatus();
      return res.status(200).json({
        success: true,
        ...data,
        databaseProvider: status.provider,
        isSupabaseActive: status.isSupabaseActive,
      });
    }

    if (req.method === 'POST') {
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

      const result = await CentralDatabase.syncPush(body);
      return res.status(200).json({
        message: 'Pengaturan dan data berhasil disinkronkan ke database terpusat.',
        ...result,
      });
    }

    return res.status(405).json({ success: false, error: `Method ${req.method} Not Allowed` });
  } catch (err: any) {
    console.error('[API-SYNC-ERROR]', err);
    return res.status(500).json({
      success: false,
      error: `Kendala internal saat sinkronisasi database: ${err?.message || 'Server error'}`,
    });
  }
}
