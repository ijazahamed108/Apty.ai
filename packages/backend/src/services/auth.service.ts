import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { UserRole } from '@mini-apty/shared';
import { MongoServerError, type Db } from 'mongodb';
import { AppError } from '../lib/errors.js';
import { COLLECTIONS, type UserDocument } from '../db/collections.js';

const SALT_ROUNDS = 12;
const PASSWORD_RESET_SUCCESS_MESSAGE = 'Password updated. You can sign in with your new password.';

export type AuthUser = {
  id: string;
  email: string;
  role: UserRole;
};

export class AuthService {
  constructor(
    private readonly db: Db,
    private readonly jwtSecret: string
  ) {}

  async signup(email: string, password: string): Promise<{ token: string; user: AuthUser }> {
    const normalizedEmail = email.toLowerCase();
    const role = this.resolveSignupRole(normalizedEmail);
    const users = this.db.collection<UserDocument>(COLLECTIONS.users);

    const existing = await users.findOne({ email: normalizedEmail }, { projection: { _id: 1 } });
    if (existing) {
      throw new AppError(409, 'EMAIL_EXISTS', 'An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user: UserDocument = {
      _id: randomUUID(),
      email: normalizedEmail,
      role,
      passwordHash,
      createdAt: new Date(),
    };

    try {
      await users.insertOne(user);
    } catch (err) {
      if (err instanceof MongoServerError && err.code === 11_000) {
        throw new AppError(409, 'EMAIL_EXISTS', 'An account with this email already exists');
      }
      throw err;
    }

    const token = this.signToken(user._id, user.email, user.role);
    return { token, user: { id: user._id, email: user.email, role: user.role } };
  }

  async login(email: string, password: string): Promise<{ token: string; user: AuthUser }> {
    const user = await this.db
      .collection<UserDocument>(COLLECTIONS.users)
      .findOne({ email: email.toLowerCase() });

    if (!user) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    const role = user.role ?? 'author';
    const token = this.signToken(user._id, user.email, role);
    return { token, user: { id: user._id, email: user.email, role } };
  }

  async resetPassword(email: string, password: string): Promise<{ message: string }> {
    const normalizedEmail = email.toLowerCase();
    const users = this.db.collection<UserDocument>(COLLECTIONS.users);
    const user = await users.findOne({ email: normalizedEmail }, { projection: { _id: 1 } });

    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'No account found for this email');
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    await users.updateOne(
      { email: normalizedEmail },
      {
        $set: { passwordHash },
        $unset: { passwordResetRequestedAt: '' },
      }
    );

    return { message: PASSWORD_RESET_SUCCESS_MESSAGE };
  }

  private signToken(userId: string, email: string, role: UserRole): string {
    return jwt.sign({ sub: userId, email, role }, this.jwtSecret, { expiresIn: '7d' });
  }

  private resolveSignupRole(email: string): UserRole {
    const adminEmails = (process.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);

    return adminEmails.includes(email) ? 'admin' : 'author';
  }
}
