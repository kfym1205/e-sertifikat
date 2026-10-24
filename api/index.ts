import type { Request, Response } from 'express';
import app from '../src/serverApp';

/**
 * Vercel Serverless Function entrypoint
 * Hands incoming requests directly to the pure Express application (without listening port or Vite dev server)
 */
export default function handler(req: Request, res: Response) {
  // Pre-flag _body if already parsed by @vercel/node runtime to prevent stream read errors
  if (req.body !== undefined && typeof req.body === 'object' && req.body !== null) {
    (req as any)._body = true;
  }
  return app(req, res);
}
