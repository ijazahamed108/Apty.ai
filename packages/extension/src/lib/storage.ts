import type { Walkthrough } from '@mini-apty/shared';

const WALKTHROUGH_PREFIX = 'walkthrough:';

export function walkthroughCacheKey(id: string): string {
  return `${WALKTHROUGH_PREFIX}${id}`;
}

export async function cacheWalkthrough(walkthrough: Walkthrough): Promise<void> {
  await chrome.storage.local.set({ [walkthroughCacheKey(walkthrough.id)]: walkthrough });
}

export async function cacheWalkthroughs(walkthroughs: Walkthrough[]): Promise<void> {
  const entries: Record<string, Walkthrough> = {};
  for (const wt of walkthroughs) {
    entries[walkthroughCacheKey(wt.id)] = wt;
  }
  await chrome.storage.local.set(entries);
}

export async function readCachedWalkthrough(id: string): Promise<Walkthrough | undefined> {
  const result = await chrome.storage.local.get(walkthroughCacheKey(id));
  return result[walkthroughCacheKey(id)] as Walkthrough | undefined;
}
