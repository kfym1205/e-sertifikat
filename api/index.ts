import type { Request, Response } from 'express';
import app from '../src/serverApp';

export const maxDuration = 30;

export default async function handler(req: Request, res: Response) {
  try {
    return app(req, res);
  } catch (err: any) {
    console.error('[VERCEL_SERVERLESS_CRASH]', err?.message || String(err));
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'Terjadi kegagalan runtime pada serverless function Vercel.',
        message: err?.message || 'Serverless invocation error',
      });
    }
  }
}
