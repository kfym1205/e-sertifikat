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

      const saved = await CentralDatabase.saveAppearance(body);
      return res.status(200).json({
        success: true,
        message: 'Identitas visual, logo, dan footer e-Sertifikat BNN berhasil disimpan secara persisten di database terpusat.',
        appearance: saved,
      });
    }

    const appearance = await CentralDatabase.getAppearance();
    return res.status(200).json(appearance);
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: `Gagal memproses konfigurasi identitas visual: ${err?.message || 'Server error'}`,
    });
  }
}
