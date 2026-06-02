import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createApp } from '../packages/backend/dist/create-app.js';

function normalizeApiUrl(req: VercelRequest): void {
  if (!req.url?.startsWith('/api')) {
    return;
  }

  const normalized = req.url.slice('/api'.length) || '/';
  req.url = normalized.startsWith('/') ? normalized : `/${normalized}`;
}

export async function handleApiRequest(req: VercelRequest, res: VercelResponse) {
  try {
    normalizeApiUrl(req);
    const app = await createApp();
    app(req, res);
  } catch (error) {
    console.error('[mini-apty] bootstrap failed', error);
    res.status(500).json({
      error: {
        code: 'BOOTSTRAP_ERROR',
        message: 'Failed to initialize API',
      },
    });
  }
}
