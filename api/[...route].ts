import type { Request, Response } from 'express';
import app from '../server';

/**
 * Vercel Serverless Function Catch-All entrypoint
 * Captures all sub-routes under /api/* (e.g. /api/email/gmail/connect, /api/email/send)
 */
export default function handler(req: Request, res: Response) {
  return app(req, res);
}
