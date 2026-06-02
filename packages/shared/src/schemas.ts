import { z } from 'zod';

export const AdvanceTriggerSchema = z.enum(['next-button', 'click-target', 'input-change']);
export type AdvanceTrigger = z.infer<typeof AdvanceTriggerSchema>;

export const ElementFingerprintSchema = z.object({
  tagName: z.string(),
  role: z.string().optional(),
  ariaLabel: z.string().optional(),
  textSnippet: z.string().optional(),
  placeholder: z.string().optional(),
  name: z.string().optional(),
  type: z.string().optional(),
  href: z.string().optional(),
  attributes: z.record(z.string()).optional(),
});

export type ElementFingerprint = z.infer<typeof ElementFingerprintSchema>;

export const ElementTargetSchema = z.object({
  /** Primary CSS selector — may include :has(), [aria-label], etc. */
  selector: z.string(),
  /** XPath fallback for re-resolution */
  xpath: z.string().optional(),
  /** Stable anchor selector (parent/landmark) used when primary fails */
  anchorSelector: z.string().optional(),
  /** Relative path from anchor, e.g. "button:nth-of-type(2)" */
  relativePath: z.string().optional(),
  fingerprint: ElementFingerprintSchema,
});

export type ElementTarget = z.infer<typeof ElementTargetSchema>;

export const WalkthroughStepSchema = z.object({
  id: z.string().uuid(),
  order: z.number().int().min(0),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).default(''),
  target: ElementTargetSchema,
  advanceTrigger: AdvanceTriggerSchema.default('next-button'),
});

export type WalkthroughStep = z.infer<typeof WalkthroughStepSchema>;

export const WalkthroughSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string().min(1).max(200),
  origin: z.string().url().or(z.string().regex(/^https?:\/\/.+/)),
  pathPattern: z.string().min(1),
  steps: z.array(WalkthroughStepSchema).min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Walkthrough = z.infer<typeof WalkthroughSchema>;

export const UserRoleSchema = z.enum(['author', 'admin']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const CreateWalkthroughSchema = z.object({
  name: z.string().min(1).max(200),
  origin: z.string().min(1),
  pathPattern: z.string().min(1),
  steps: z.array(
    WalkthroughStepSchema.omit({ id: true }).extend({
      id: z.string().uuid().optional(),
    })
  ).min(1),
});

export type CreateWalkthroughInput = z.infer<typeof CreateWalkthroughSchema>;

export const UpdateWalkthroughSchema = CreateWalkthroughSchema.partial().extend({
  steps: z.array(WalkthroughStepSchema).min(1).optional(),
});

export type UpdateWalkthroughInput = z.infer<typeof UpdateWalkthroughSchema>;

export const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export const LoginSchema = SignupSchema;

export const AuthResponseSchema = z.object({
  token: z.string(),
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    role: UserRoleSchema,
  }),
});

export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;
