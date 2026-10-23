import type { Request, Response } from 'express';
import app from '../server';

/**
 * Vercel Serverless Function entrypoint
 * Hands incoming requests directly to the configured Express application
 */
export default function handler(req: Request, res: Response) {
  return app(req, res);
}
