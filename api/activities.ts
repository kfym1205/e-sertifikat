import type { Request, Response } from 'express';
import { CentralDatabase } from '../src/server/database';

export default async function handler(req: Request, res: Response) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const data = await CentralDatabase.getAllData();
      return res.status(200).json(data.activities);
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

      if (!body.id || !body.name) {
        return res.status(400).json({ success: false, error: 'ID dan nama kegiatan wajib diisi.' });
      }

      const saved = await CentralDatabase.saveActivity(body);
      return res.status(200).json({
        success: true,
        message: 'Konfigurasi kegiatan dan tata letak sertifikat berhasil disimpan di database terpusat.',
        activity: saved,
      });
    }

    if (req.method === 'DELETE') {
      const id = req.query.id as string;
      if (!id) {
        return res.status(400).json({ success: false, error: 'ID kegiatan wajib disertakan.' });
      }
      await CentralDatabase.deleteActivity(id);
      return res.status(200).json({ success: true, message: 'Kegiatan berhasil dihapus.' });
    }

    return res.status(405).json({ success: false, error: `Method ${req.method} Not Allowed` });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: `Kendala server saat memproses kegiatan: ${err?.message || 'Server error'}`,
    });
  }
}
