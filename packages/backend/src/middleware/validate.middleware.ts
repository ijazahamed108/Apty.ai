import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { AppError } from '../lib/errors.js';

type Source = 'body' | 'query' | 'params';

export function validate(schema: ZodSchema, source: Source = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      next(
        new AppError(400, 'VALIDATION_ERROR', 'Request validation failed', result.error.flatten())
      );
      return;
    }

    req[source] = result.data;
    next();
  };
}
