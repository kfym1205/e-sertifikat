import type { Request, Response } from 'express';

let appearanceState: any = null;

export default function handler(req: Request, res: Response) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    appearanceState = req.body;
    return res.status(200).json({ success: true, message: 'Identitas visual tersimpan.' });
  }

  return res.status(200).json(appearanceState || { status: 'default' });
}
