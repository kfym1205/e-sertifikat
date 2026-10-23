import type { Request, Response } from 'express';
import app from '../server';

/**
 * Vercel Serverless Function Catch-All entrypoint
 * Captures all sub-routes under /api/* (e.g. /api/email/gmail/connect, /api/email/send)
 */
export default function handler(req: Request, res: Response) {
  // Pre-flag _body if already parsed by @vercel/node runtime to prevent stream read errors
  if (req.body !== undefined && typeof req.body === 'object' && req.body !== null) {
    (req as any)._body = true;
  }
  return app(req, res);
}
