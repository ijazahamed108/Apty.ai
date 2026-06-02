import type { UserRole, WalkthroughStep } from '@mini-apty/shared';

export const COLLECTIONS = {
  users: 'users',
  walkthroughs: 'walkthroughs',
} as const;

export type UserDocument = {
  _id: string;
  email: string;
  role: UserRole;
  passwordHash: string;
  createdAt: Date;
};

export type WalkthroughDocument = {
  _id: string;
  userId: string;
  name: string;
  origin: string;
  pathPattern: string;
  steps: WalkthroughStep[];
  createdAt: Date;
  updatedAt: Date;
};
