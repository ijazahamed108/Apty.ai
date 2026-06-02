import { mountAuthorMode } from './author-mode';
import { mountPreview, unmountPreview } from './preview-overlay';
import type { Walkthrough, WalkthroughStep } from '@mini-apty/shared';
import { getWalkthrough } from '../lib/api';
import { cacheWalkthrough, readCachedWalkthrough } from '../lib/storage';

type ContentMessage =
  | { type: 'PING' }
  | { type: 'START_AUTHOR' }
  | { type: 'STOP_AUTHOR' }
  | { type: 'GET_AUTHOR_STATUS' }
  | { type: 'START_PREVIEW'; walkthroughId: string }
  | { type: 'STOP_PREVIEW' };

const CONTENT_SCRIPT_GUARD = '__miniAptyContentScriptInitialized';

let stopAuthor: (() => void) | null = null;
let stopPreview: (() => void) | null = null;

function registerMessageListener(): void {
  const globalScope = globalThis as typeof globalThis & Record<string, boolean | undefined>;
  if (globalScope[CONTENT_SCRIPT_GUARD]) return;
  globalScope[CONTENT_SCRIPT_GUARD] = true;

  chrome.runtime.onMessage.addListener((message: ContentMessage, _sender, sendResponse) => {
    void handleContentMessage(message, sendResponse);
    return true;
  });
}

function progressKey(walkthroughId: string): string {
  return `mini-apty-progress:${walkthroughId}`;
}

async function readProgress(walkthroughId: string): Promise<number> {
  const result = await chrome.storage.local.get(progressKey(walkthroughId));
  const value = result[progressKey(walkthroughId)] as { stepIndex?: number } | undefined;
  return value?.stepIndex ?? 0;
}

async function writeProgress(walkthroughId: string, stepIndex: number): Promise<void> {
  await chrome.storage.local.set({
    [progressKey(walkthroughId)]: {
      stepIndex,
      updatedAt: new Date().toISOString(),
    },
  });
}

async function readAuthToken(): Promise<string | null> {
  const auth = await chrome.storage.local.get('mini-apty-auth');
  const parsed = auth['mini-apty-auth'] as { state?: { token?: string } } | undefined;
  return parsed?.state?.token ?? null;
}

async function loadWalkthrough(id: string): Promise<Walkthrough | null> {
  const token = await readAuthToken();

  if (token) {
    try {
      const fresh = await getWalkthrough(token, id);
      await cacheWalkthrough(fresh);
      return fresh;
    } catch {
      // fall through to cache
    }
  }

  return (await readCachedWalkthrough(id)) ?? null;
}

function handleAuthorCapture(step: WalkthroughStep) {
  void chrome.runtime.sendMessage({ type: 'STEP_CAPTURED', step });
}

async function handleContentMessage(
  message: ContentMessage,
  sendResponse: (response: unknown) => void
): Promise<void> {
  switch (message.type) {
    case 'PING':
      sendResponse({ ok: true });
      break;
    case 'START_AUTHOR':
      stopAuthor?.();
      stopPreview?.();
      stopPreview = null;
      stopAuthor = mountAuthorMode(handleAuthorCapture);
      sendResponse({ ok: true });
      break;
    case 'STOP_AUTHOR':
      stopAuthor?.();
      stopAuthor = null;
      sendResponse({ ok: true });
      break;
    case 'GET_AUTHOR_STATUS':
      sendResponse({ ok: true, active: stopAuthor !== null });
      break;
    case 'START_PREVIEW': {
      stopAuthor?.();
      stopAuthor = null;
      stopPreview?.();

      const walkthrough = await loadWalkthrough(message.walkthroughId);
      if (!walkthrough) {
        sendResponse({ ok: false, error: 'Walkthrough unavailable (offline / auth required)' });
        return;
      }

      const stepIndex = await readProgress(message.walkthroughId);
      stopPreview = mountPreview(walkthrough, stepIndex, (index) => {
        void writeProgress(message.walkthroughId, index);
      });
      sendResponse({ ok: true });
      break;
    }
    case 'STOP_PREVIEW':
      unmountPreview();
      stopPreview = null;
      sendResponse({ ok: true });
      break;
    default:
      sendResponse({ ok: false });
  }
}

registerMessageListener();
console.info('[Mini Apty] content script ready');
