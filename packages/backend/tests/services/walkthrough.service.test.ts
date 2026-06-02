import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WalkthroughService } from '../../src/services/walkthrough.service.js';
import type { Db, Collection } from 'mongodb';
import type { WalkthroughDocument } from '../../src/db/collections.js';
import type { WalkthroughStep } from '@mini-apty/shared';

const sampleSteps: WalkthroughStep[] = [
  {
    id: 'step-1',
    order: 0,
    title: 'Click login',
    description: 'Open the login form',
    advanceTrigger: 'next-button',
    target: {
      selector: 'button.login',
      fingerprint: { tagName: 'BUTTON', textSnippet: 'Login' },
    },
  },
];

function createMockCollection<T>() {
  return {
    insertOne: vi.fn(),
    findOne: vi.fn(),
    find: vi.fn(),
    replaceOne: vi.fn(),
    deleteOne: vi.fn(),
  } as unknown as Collection<T>;
}

function createMockDb(walkthroughs: Collection<WalkthroughDocument>): Db {
  return {
    collection: vi.fn().mockReturnValue(walkthroughs),
  } as unknown as Db;
}

describe('WalkthroughService', () => {
  let walkthroughs: Collection<WalkthroughDocument>;
  let db: Db;
  let service: WalkthroughService;

  beforeEach(() => {
    walkthroughs = createMockCollection<WalkthroughDocument>();
    db = createMockDb(walkthroughs);
    service = new WalkthroughService(db);
  });

  it('create persists walkthrough for user', async () => {
    vi.mocked(walkthroughs.insertOne).mockResolvedValueOnce({ acknowledged: true } as never);

    const result = await service.create('user-1', {
      name: 'Login flow',
      origin: 'https://example.com',
      pathPattern: '/login',
      steps: sampleSteps,
    });

    expect(result.userId).toBe('user-1');
    expect(result.steps).toHaveLength(1);
    expect(walkthroughs.insertOne).toHaveBeenCalledOnce();
  });

  it('getById returns 403 for non-owner', async () => {
    vi.mocked(walkthroughs.findOne).mockResolvedValueOnce({
      _id: 'wt-1',
      userId: 'other-user',
      name: 'Login flow',
      origin: 'https://example.com',
      pathPattern: '/login',
      steps: sampleSteps,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(service.getById('user-1', 'wt-1')).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN',
    });
  });

  it('getById returns 404 when missing', async () => {
    vi.mocked(walkthroughs.findOne).mockResolvedValueOnce(null);

    await expect(service.getById('user-1', 'missing')).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });

  it('listByOriginAndPath filters by path pattern', async () => {
    const now = new Date();
    vi.mocked(walkthroughs.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([
          {
            _id: 'wt-1',
            userId: 'user-1',
            name: 'Login',
            origin: 'https://example.com',
            pathPattern: '/login%',
            steps: sampleSteps,
            createdAt: now,
            updatedAt: now,
          },
          {
            _id: 'wt-2',
            userId: 'user-1',
            name: 'Dashboard',
            origin: 'https://example.com',
            pathPattern: '/dashboard',
            steps: sampleSteps,
            createdAt: now,
            updatedAt: now,
          },
        ]),
      }),
    } as never);

    const result = await service.listByOriginAndPath(
      'user-1',
      'https://example.com',
      '/login/callback'
    );

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('wt-1');
  });
});
