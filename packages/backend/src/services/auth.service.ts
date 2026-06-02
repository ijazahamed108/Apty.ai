import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { MongoServerError, type Db } from 'mongodb';
import { AppError } from '../lib/errors.js';
import { COLLECTIONS, type UserDocument } from '../db/collections.js';

const SALT_ROUNDS = 12;

export type AuthUser = {
  id: string;
  email: string;
};

export class AuthService {
  constructor(
    private readonly db: Db,
    private readonly jwtSecret: string
  ) {}

  async signup(email: string, password: string): Promise<{ token: string; user: AuthUser }> {
    const normalizedEmail = email.toLowerCase();
    const users = this.db.collection<UserDocument>(COLLECTIONS.users);

    const existing = await users.findOne({ email: normalizedEmail }, { projection: { _id: 1 } });
    if (existing) {
      throw new AppError(409, 'EMAIL_EXISTS', 'An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user: UserDocument = {
      _id: randomUUID(),
      email: normalizedEmail,
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

    const token = this.signToken(user._id, user.email);
    return { token, user: { id: user._id, email: user.email } };
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

    const token = this.signToken(user._id, user.email);
    return { token, user: { id: user._id, email: user.email } };
  }

  private signToken(userId: string, email: string): string {
    return jwt.sign({ sub: userId, email }, this.jwtSecret, { expiresIn: '7d' });
  }
}
