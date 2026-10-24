import type { Request, Response } from 'express';

export default function handler(req: Request, res: Response) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  return res.status(200).json({
    status: 'ok',
    service: 'e-Sertifikat BNN Vercel Serverless Function Engine',
    timestamp: new Date().toISOString(),
    timezone: 'Asia/Makassar (WITA)',
  });
}
