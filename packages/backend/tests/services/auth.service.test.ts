import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthService } from '../../src/services/auth.service.js';
import { AppError } from '../../src/lib/errors.js';
import type { Db, Collection } from 'mongodb';
import type { UserDocument } from '../../src/db/collections.js';

function createMockCollection<T>() {
  return {
    findOne: vi.fn(),
    insertOne: vi.fn(),
    updateOne: vi.fn(),
  } as unknown as Collection<T>;
}

function createMockDb(usersCollection: Collection<UserDocument>): Db {
  return {
    collection: vi.fn().mockReturnValue(usersCollection),
  } as unknown as Db;
}

describe('AuthService', () => {
  const jwtSecret = 'test-secret-key-minimum-length';
  let users: Collection<UserDocument>;
  let db: Db;
  let service: AuthService;

  beforeEach(() => {
    delete process.env.ADMIN_EMAILS;
    users = createMockCollection<UserDocument>();
    db = createMockDb(users);
    service = new AuthService(db, jwtSecret);
  });

  it('signup creates user and returns token', async () => {
    vi.mocked(users.findOne).mockResolvedValueOnce(null);
    vi.mocked(users.insertOne).mockResolvedValueOnce({ acknowledged: true } as never);

    const result = await service.signup('Test@Example.com', 'password123');

    expect(result.user.email).toBe('test@example.com');
    expect(result.user.role).toBe('author');
    expect(result.token).toBeTruthy();
    expect(users.findOne).toHaveBeenCalledWith(
      { email: 'test@example.com' },
      { projection: { _id: 1 } }
    );
  });

  it('signup assigns admin role for configured admin emails', async () => {
    process.env.ADMIN_EMAILS = 'admin@example.com';
    vi.mocked(users.findOne).mockResolvedValueOnce(null);
    vi.mocked(users.insertOne).mockResolvedValueOnce({ acknowledged: true } as never);

    const result = await service.signup('Admin@Example.com', 'password123');
    const payload = jwt.verify(result.token, jwtSecret) as { role: string };

    expect(result.user.role).toBe('admin');
    expect(payload.role).toBe('admin');
  });

  it('signup rejects duplicate email', async () => {
    vi.mocked(users.findOne).mockResolvedValueOnce({ _id: 'existing' } as UserDocument);

    await expect(service.signup('test@example.com', 'password123')).rejects.toMatchObject({
      statusCode: 409,
      code: 'EMAIL_EXISTS',
    });
  });

  it('login returns token for valid credentials', async () => {
    const hash = await bcrypt.hash('password123', 12);
    vi.mocked(users.findOne).mockResolvedValueOnce({
      _id: 'user-1',
      email: 'test@example.com',
      role: 'author',
      passwordHash: hash,
      createdAt: new Date(),
    });

    const result = await service.login('test@example.com', 'password123');

    expect(result.user.id).toBe('user-1');
    expect(result.token).toBeTruthy();
  });

  it('login rejects invalid password', async () => {
    const hash = await bcrypt.hash('password123', 12);
    vi.mocked(users.findOne).mockResolvedValueOnce({
      _id: 'user-1',
      email: 'test@example.com',
      role: 'author',
      passwordHash: hash,
      createdAt: new Date(),
    });

    await expect(service.login('test@example.com', 'wrong')).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
    });
  });

  it('login rejects unknown user', async () => {
    vi.mocked(users.findOne).mockResolvedValueOnce(null);

    await expect(service.login('missing@example.com', 'password123')).rejects.toBeInstanceOf(
      AppError
    );
  });

  it('resetPassword updates hash for existing user', async () => {
    vi.mocked(users.findOne).mockResolvedValueOnce({ _id: 'user-1' } as UserDocument);
    vi.mocked(users.updateOne).mockResolvedValueOnce({ acknowledged: true } as never);

    const result = await service.resetPassword('Test@Example.com', 'newpassword123');

    expect(result.message).toContain('Password updated');
    expect(users.updateOne).toHaveBeenCalledWith(
      { email: 'test@example.com' },
      {
        $set: { passwordHash: expect.any(String) },
        $unset: { passwordResetRequestedAt: '' },
      }
    );
  });

  it('resetPassword rejects unknown email', async () => {
    vi.mocked(users.findOne).mockResolvedValueOnce(null);

    await expect(service.resetPassword('missing@example.com', 'newpassword123')).rejects.toMatchObject({
      statusCode: 404,
      code: 'USER_NOT_FOUND',
    });
  });
});
