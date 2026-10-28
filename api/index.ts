import type { Request, Response } from 'express';
import app from '../src/serverApp';

export const maxDuration = 30;

// Vercel Serverless Function entry point
// Returns a Promise that waits until Express actually finishes sending the HTTP response.
// This prevents premature termination by the Vercel runner before async handlers conclude.
export default function handler(req: Request, res: Response): Promise<void> {
  return new Promise<void>((resolve) => {
    let resolved = false;
    const finish = () => {
      if (!resolved) {
        resolved = true;
        resolve();
      }
    };

    res.on('finish', finish);
    res.on('close', finish);

    try {
      app(req, res, (err: any) => {
        if (err && !res.headersSent) {
          res.status(500).json({
            status: 'error',
            error: err?.message || 'Internal server error',
          });
        }
        finish();
      });
    } catch (err: any) {
      console.error('[VERCEL_SERVERLESS_CRASH]', err?.message || String(err));
      if (!res.headersSent) {
        res.status(500).json({
          status: 'error',
          error: 'Terjadi kegagalan runtime pada serverless function Vercel.',
          message: err?.message || 'Serverless invocation error',
        });
      }
      finish();
    }
  });
}

