import { Router, type IRouter, Request, Response, NextFunction } from 'express';
import { CreateWalkthroughSchema, UpdateWalkthroughSchema } from '@mini-apty/shared';
import { WalkthroughService } from '../services/walkthrough.service.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { AppError } from '../lib/errors.js';
import { z } from 'zod';

export const walkthroughRouter: IRouter = Router();

walkthroughRouter.use(authenticate, requireRole('author', 'admin'));

const listQuerySchema = z.object({
  origin: z.string().min(1),
  path: z.string().min(1),
});

walkthroughRouter.post(
  '/',
  validate(CreateWalkthroughSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const service = new WalkthroughService(req.app.locals.db);
      const walkthrough = await service.create(req.user!.sub, req.body);
      res.status(201).json(walkthrough);
    } catch (err) {
      next(err);
    }
  }
);

walkthroughRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'origin and path query params are required');
    }

    const { origin, path } = parsed.data;
    const service = new WalkthroughService(req.app.locals.db);
    const walkthroughs = await service.listByOriginAndPath(
      req.user!.sub,
      origin,
      path,
      req.user!.role
    );
    res.json(walkthroughs);
  } catch (err) {
    next(err);
  }
});

walkthroughRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const service = new WalkthroughService(req.app.locals.db);
    const walkthrough = await service.getById(req.user!.sub, req.params.id, req.user!.role);
    res.json(walkthrough);
  } catch (err) {
    next(err);
  }
});

walkthroughRouter.put(
  '/:id',
  validate(UpdateWalkthroughSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const service = new WalkthroughService(req.app.locals.db);
      const walkthrough = await service.update(
        req.user!.sub,
        req.params.id,
        req.body,
        req.user!.role
      );
      res.json(walkthrough);
    } catch (err) {
      next(err);
    }
  }
);

walkthroughRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const service = new WalkthroughService(req.app.locals.db);
    await service.delete(req.user!.sub, req.params.id, req.user!.role);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
