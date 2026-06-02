import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import type { Db } from 'mongodb';
import { authRouter } from './routes/auth.routes.js';
import { walkthroughRouter } from './routes/walkthrough.routes.js';
import { AppError } from './lib/errors.js';

export type AppDeps = {
  db: Db;
  jwtSecret: string;
};

function buildCorsOrigin(): boolean | string | string[] | undefined {
  const fromEnv = process.env.CORS_ORIGIN;
  if (fromEnv) {
    const origins = fromEnv.split(',').map((value) => value.trim());
    return origins.length === 1 ? origins[0] : origins;
  }

  if (process.env.NODE_ENV === 'production') {
    return true;
  }

  return true;
}

export function buildApp(deps: AppDeps): Express {
  const app = express();

  app.use(
    cors({
      origin: buildCorsOrigin(),
      credentials: true,
    })
  );
  app.use(express.json({ limit: '1mb' }));

  app.locals.db = deps.db;
  app.locals.jwtSecret = deps.jwtSecret;

  app.get('/', (_req: Request, res: Response) => {
    res.type('html').send(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Mini Apty API</title>
    <style>
      body { font-family: system-ui, sans-serif; max-width: 720px; margin: 48px auto; padding: 0 20px; color: #111827; }
      code { background: #e5e7eb; padding: 2px 6px; border-radius: 4px; }
      a { color: #2563eb; }
      .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0; }
    </style>
  </head>
  <body>
    <h1>Mini Apty</h1>
    <p>API is running. Use the Chrome extension for author and preview flows.</p>
    <div class="card">
      <h2>Health check</h2>
      <p><a href="/health">GET /health</a></p>
    </div>
    <div class="card">
      <h2>Extension</h2>
      <p>Build with <code>VITE_API_BASE_URL</code> pointing to this deployment, then load <code>packages/extension/dist</code> in Chrome.</p>
    </div>
  </body>
</html>`);
  });

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'mini-apty-api' });
  });

  app.use('/auth', authRouter);
  app.use('/walkthroughs', walkthroughRouter);

  app.use((_req: Request, _res: Response, next: NextFunction) => {
    next(new AppError(404, 'NOT_FOUND', 'Route not found'));
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({
        error: {
          code: err.code,
          message: err.message,
          details: err.details,
        },
      });
      return;
    }

    if (err instanceof Error && err.name === 'ZodError') {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: err,
        },
      });
      return;
    }

    console.error(err);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  });

  return app;
}

declare global {
  namespace Express {
    interface Locals {
      db: Db;
      jwtSecret: string;
    }
  }
}
