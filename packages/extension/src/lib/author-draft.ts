import type { WalkthroughStep } from '@mini-apty/shared';

export const AUTHOR_DRAFT_KEY = 'mini-apty-author-draft';

export type AuthorDraft = {
  isRecording: boolean;
  steps: WalkthroughStep[];
  origin?: string;
  pathPattern?: string;
  name?: string;
};

const emptyDraft = (): AuthorDraft => ({ isRecording: false, steps: [] });

export async function readAuthorDraft(): Promise<AuthorDraft> {
  const result = await chrome.storage.local.get(AUTHOR_DRAFT_KEY);
  const draft = result[AUTHOR_DRAFT_KEY] as AuthorDraft | undefined;
  if (!draft) return emptyDraft();
  return {
    isRecording: Boolean(draft.isRecording),
    steps: Array.isArray(draft.steps) ? draft.steps : [],
    origin: draft.origin,
    pathPattern: draft.pathPattern,
    name: draft.name,
  };
}

export async function writeAuthorDraft(draft: AuthorDraft): Promise<void> {
  await chrome.storage.local.set({ [AUTHOR_DRAFT_KEY]: draft });
}

export async function appendAuthorStep(step: WalkthroughStep): Promise<AuthorDraft> {
  const draft = await readAuthorDraft();
  const next: AuthorDraft = {
    ...draft,
    steps: [...draft.steps, { ...step, order: draft.steps.length }],
  };
  await writeAuthorDraft(next);
  return next;
}

export async function updateAuthorDraft(patch: Partial<AuthorDraft>): Promise<AuthorDraft> {
  const draft = await readAuthorDraft();
  const next = { ...draft, ...patch };
  await writeAuthorDraft(next);
  return next;
}

export async function clearAuthorDraft(): Promise<void> {
  await chrome.storage.local.remove(AUTHOR_DRAFT_KEY);
}
