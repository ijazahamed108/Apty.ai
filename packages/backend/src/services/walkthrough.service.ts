import { randomUUID } from 'node:crypto';
import type { Db } from 'mongodb';
import type {
  CreateWalkthroughInput,
  UpdateWalkthroughInput,
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
    path: string
  ): Promise<Walkthrough[]> {
    const docs = await this.collection()
      .find({ userId, origin })
      .sort({ updatedAt: -1 })
      .toArray();

    return docs.filter((doc) => matchesPathPattern(path, doc.pathPattern)).map(mapDocument);
  }

  async getById(userId: string, id: string): Promise<Walkthrough> {
    const doc = await this.collection().findOne({ _id: id });

    if (!doc) {
      throw new AppError(404, 'NOT_FOUND', 'Walkthrough not found');
    }

    assertOwner(doc.userId, userId);
    return mapDocument(doc);
  }

  async update(userId: string, id: string, input: UpdateWalkthroughInput): Promise<Walkthrough> {
    const existing = await this.getById(userId, id);

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

    await this.collection().replaceOne({ _id: id, userId }, updated);
    return mapDocument(updated);
  }

  async delete(userId: string, id: string): Promise<void> {
    await this.getById(userId, id);
    await this.collection().deleteOne({ _id: id, userId });
  }
}
