import { randomUUID } from 'node:crypto';
import type { Db } from 'mongodb';
import type {
  CreateWalkthroughInput,
  UpdateWalkthroughInput,
  UserRole,
  Walkthrough,
  WalkthroughStep,
} from '@mini-apty/shared';
import { COLLECTIONS, type WalkthroughDocument } from '../db/collections.js';
import { AppError, assertOwner } from '../lib/errors.js';
import { matchesPathPattern } from '../lib/path-pattern.js';

function mapDocument(doc: WalkthroughDocument): Walkthrough {
  return {
    id: doc._id,
    userId: doc.userId,
    name: doc.name,
    origin: doc.origin,
    pathPattern: doc.pathPattern,
    steps: doc.steps,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

function normalizeSteps(steps: CreateWalkthroughInput['steps']): WalkthroughStep[] {
  return steps.map((step, index) => ({
    ...step,
    id: step.id ?? randomUUID(),
    order: step.order ?? index,
  }));
}

export class WalkthroughService {
  constructor(private readonly db: Db) {}

  private collection() {
    return this.db.collection<WalkthroughDocument>(COLLECTIONS.walkthroughs);
  }

  async create(userId: string, input: CreateWalkthroughInput): Promise<Walkthrough> {
    const now = new Date();
    const doc: WalkthroughDocument = {
      _id: randomUUID(),
      userId,
      name: input.name,
      origin: input.origin,
      pathPattern: input.pathPattern,
      steps: normalizeSteps(input.steps),
      createdAt: now,
      updatedAt: now,
    };

    await this.collection().insertOne(doc);
    return mapDocument(doc);
  }

  async listByOriginAndPath(
    userId: string,
    origin: string,
    path: string,
    role: UserRole = 'author'
  ): Promise<Walkthrough[]> {
    const query = role === 'admin' ? { origin } : { userId, origin };
    const docs = await this.collection()
      .find(query)
      .sort({ updatedAt: -1 })
      .toArray();

    return docs.filter((doc) => matchesPathPattern(path, doc.pathPattern)).map(mapDocument);
  }

  async getById(userId: string, id: string, role: UserRole = 'author'): Promise<Walkthrough> {
    const doc = await this.collection().findOne({ _id: id });

    if (!doc) {
      throw new AppError(404, 'NOT_FOUND', 'Walkthrough not found');
    }

    if (role !== 'admin') {
      assertOwner(doc.userId, userId);
    }
    return mapDocument(doc);
  }

  async update(
    userId: string,
    id: string,
    input: UpdateWalkthroughInput,
    role: UserRole = 'author'
  ): Promise<Walkthrough> {
    const existing = await this.getById(userId, id, role);

    const updated: WalkthroughDocument = {
      _id: existing.id,
      userId: existing.userId,
      name: input.name ?? existing.name,
      origin: input.origin ?? existing.origin,
      pathPattern: input.pathPattern ?? existing.pathPattern,
      steps: input.steps ? normalizeSteps(input.steps) : existing.steps,
      createdAt: new Date(existing.createdAt),
      updatedAt: new Date(),
    };

    const filter = role === 'admin' ? { _id: id } : { _id: id, userId };
    await this.collection().replaceOne(filter, updated);
    return mapDocument(updated);
  }

  async delete(userId: string, id: string, role: UserRole = 'author'): Promise<void> {
    await this.getById(userId, id, role);
    const filter = role === 'admin' ? { _id: id } : { _id: id, userId };
    await this.collection().deleteOne(filter);
  }
}
