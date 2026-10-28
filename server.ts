import app from './src/serverApp';
import path from 'path';
import { fileURLToPath } from 'url';
import express, { type Request, type Response } from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

async function startLocalServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server Sertifikat Otomatis running on http://localhost:${PORT}`);
  });
}

startLocalServer().catch((err) => {
  console.error('Failed to start local dev server:', err);
});

export default app;
