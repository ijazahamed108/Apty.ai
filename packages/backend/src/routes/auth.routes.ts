import { Router, type IRouter, Request, Response, NextFunction } from 'express';
import { ForgotPasswordSchema, LoginSchema, SignupSchema } from '@mini-apty/shared';
import { AuthService } from '../services/auth.service.js';
import { validate } from '../middleware/validate.middleware.js';

export const authRouter: IRouter = Router();

authRouter.post(
  '/signup',
  validate(SignupSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body as { email: string; password: string };
      const service = new AuthService(req.app.locals.db, req.app.locals.jwtSecret);
      const result = await service.signup(email, password);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
);

authRouter.post(
  '/login',
  validate(LoginSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body as { email: string; password: string };
      const service = new AuthService(req.app.locals.db, req.app.locals.jwtSecret);
      const result = await service.login(email, password);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

authRouter.post(
  '/forgot-password',
  validate(ForgotPasswordSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body as { email: string; password: string };
      const service = new AuthService(req.app.locals.db, req.app.locals.jwtSecret);
      const result = await service.resetPassword(email, password);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);
