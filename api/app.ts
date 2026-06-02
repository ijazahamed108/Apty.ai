import type { VercelRequest, VercelResponse } from '@vercel/node';

function normalizeApiUrl(req: VercelRequest): void {
  if (!req.url) return;

  const [pathname, query = ''] = req.url.split('?');
  let path = pathname;

  if (path.startsWith('/api')) {
    path = path.slice('/api'.length) || '/';
  }

  if (!path.startsWith('/')) {
    path = `/${path}`;
  }

  req.url = query ? `${path}?${query}` : path;
}

function missingEnvVars(): string[] {
  const missing: string[] = [];
  if (!process.env.JWT_SECRET) missing.push('JWT_SECRET');
  if (!process.env.MONGODB_URI) missing.push('MONGODB_URI');
  return missing;
}

export async function handleApiRequest(req: VercelRequest, res: VercelResponse) {
  const missing = missingEnvVars();
  if (missing.length > 0) {
    res.status(503).json({
      error: {
        code: 'MISSING_ENV',
        message: `Set these Vercel environment variables: ${missing.join(', ')}`,
      },
    });
    return;
  }

  try {
    normalizeApiUrl(req);
    const { createApp } = await import('../packages/backend/dist/create-app.js');
    const app = await createApp();
    app(req, res);
  } catch (error) {
    console.error('[mini-apty] bootstrap failed', error);
    const message =
      error instanceof Error ? error.message : 'Failed to initialize API';
    res.status(500).json({
      error: {
        code: 'BOOTSTRAP_ERROR',
        message,
      },
    });
  }
}
