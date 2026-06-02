import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { Collection, Db } from 'mongodb';
import { buildApp } from '../../src/app.js';
import { COLLECTIONS, type UserDocument, type WalkthroughDocument } from '../../src/db/collections.js';

const jwtSecret = 'route-test-secret-key';

function collectionMock<T>() {
  return {
    findOne: vi.fn(),
    insertOne: vi.fn(),
    updateOne: vi.fn(),
    find: vi.fn(),
    replaceOne: vi.fn(),
    deleteOne: vi.fn(),
  } as unknown as Collection<T>;
}

function createDb({
  users = collectionMock<UserDocument>(),
  walkthroughs = collectionMock<WalkthroughDocument>(),
}: {
  users?: Collection<UserDocument>;
  walkthroughs?: Collection<WalkthroughDocument>;
} = {}): Db {
  return {
    collection: vi.fn((name: string) => {
      if (name === COLLECTIONS.users) return users;
      if (name === COLLECTIONS.walkthroughs) return walkthroughs;
      throw new Error(`Unexpected collection: ${name}`);
    }),
  } as unknown as Db;
}

function sign(role: 'author' | 'admin', sub = 'user-1') {
  return jwt.sign({ sub, email: `${sub}@example.com`, role }, jwtSecret, { expiresIn: '1h' });
}

function walkthroughDoc(userId: string): WalkthroughDocument {
  return {
    _id: 'walkthrough-1',
    userId,
    name: 'Login flow',
    origin: 'https://example.com',
    pathPattern: '/login',
    steps: [
      {
        id: 'step-1',
        order: 0,
        title: 'Click login',
        description: 'Open login',
        advanceTrigger: 'next-button',
        target: {
          selector: 'button.login',
          fingerprint: { tagName: 'BUTTON', textSnippet: 'Login' },
        },
      },
    ],
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };
}

describe('API routes', () => {
  it('POST /auth/signup creates a user and returns JWT + role', async () => {
    const users = collectionMock<UserDocument>();
    vi.mocked(users.findOne).mockResolvedValueOnce(null);
    vi.mocked(users.insertOne).mockResolvedValueOnce({ acknowledged: true } as never);

    const app = buildApp({ db: createDb({ users }), jwtSecret });

    const response = await request(app)
      .post('/auth/signup')
      .send({ email: 'test@example.com', password: 'password123' })
      .expect(201);

    expect(response.body.token).toBeTruthy();
    expect(response.body.user).toMatchObject({ email: 'test@example.com', role: 'author' });
  });

  it('POST /auth/login returns a JWT for valid credentials', async () => {
    const users = collectionMock<UserDocument>();
    const passwordHash = await bcrypt.hash('password123', 12);
    vi.mocked(users.findOne).mockResolvedValueOnce({
      _id: 'user-1',
      email: 'test@example.com',
      role: 'author',
      passwordHash,
      createdAt: new Date(),
    });

    const app = buildApp({ db: createDb({ users }), jwtSecret });

    const response = await request(app)
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'password123' })
      .expect(200);

    expect(response.body.token).toBeTruthy();
    expect(response.body.user).toMatchObject({ id: 'user-1', role: 'author' });
  });

  it('GET /walkthroughs requires authentication', async () => {
    const app = buildApp({ db: createDb(), jwtSecret });

    const response = await request(app)
      .get('/walkthroughs?origin=https://example.com&path=/login')
      .expect(401);

    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('GET /walkthroughs/:id returns 403 for non-owner author', async () => {
    const walkthroughs = collectionMock<WalkthroughDocument>();
    vi.mocked(walkthroughs.findOne).mockResolvedValueOnce(walkthroughDoc('other-user'));
    const app = buildApp({ db: createDb({ walkthroughs }), jwtSecret });

    const response = await request(app)
      .get('/walkthroughs/walkthrough-1')
      .set('Authorization', `Bearer ${sign('author', 'user-1')}`)
      .expect(403);

    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('GET /walkthroughs/:id allows admin to read another owner walkthrough', async () => {
    const walkthroughs = collectionMock<WalkthroughDocument>();
    vi.mocked(walkthroughs.findOne).mockResolvedValueOnce(walkthroughDoc('other-user'));
    const app = buildApp({ db: createDb({ walkthroughs }), jwtSecret });

    const response = await request(app)
      .get('/walkthroughs/walkthrough-1')
      .set('Authorization', `Bearer ${sign('admin', 'admin-user')}`)
      .expect(200);

    expect(response.body).toMatchObject({ id: 'walkthrough-1', userId: 'other-user' });
  });
});
