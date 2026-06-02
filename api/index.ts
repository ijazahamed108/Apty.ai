import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createApp } from '../packages/backend/dist/create-app.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
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
