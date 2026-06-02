import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../lib/errors.js';

export type AuthPayload = {
  sub: string;
  email: string;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    next(new AppError(401, 'UNAUTHORIZED', 'Authentication required'));
    return;
  }

  const token = header.slice(7);
  const secret = req.app.locals.jwtSecret;

  try {
    const payload = jwt.verify(token, secret) as AuthPayload;
    req.user = payload;
    next();
  } catch {
    next(new AppError(401, 'UNAUTHORIZED', 'Invalid or expired token'));
  }
}
