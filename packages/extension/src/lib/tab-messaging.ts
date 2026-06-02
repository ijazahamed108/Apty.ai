const PING_MESSAGE = { type: 'PING' } as const;

export class TabMessagingError extends Error {
  constructor(
    message: string,
    public readonly code: 'NO_TAB' | 'UNSUPPORTED_URL' | 'CONTENT_SCRIPT_UNAVAILABLE'
  ) {
    super(message);
    this.name = 'TabMessagingError';
  }
}

export function isInjectableUrl(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const { protocol } = new URL(url);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

async function pingTab(tabId: number): Promise<boolean> {
  try {
    const response = await chrome.tabs.sendMessage(tabId, PING_MESSAGE);
    return (response as { ok?: boolean } | undefined)?.ok === true;
  } catch {
    return false;
  }
}

async function injectContentScripts(tabId: number): Promise<void> {
  const files = chrome.runtime.getManifest().content_scripts?.[0]?.js;
  if (!files?.length) {
    throw new Error('Content scripts are not registered in the extension manifest.');
  }

  await chrome.scripting.executeScript({
    target: { tabId },
    files: [...files],
  });
}

/** Ensures the Mini Apty content script is listening on the tab (injects if needed). */
export async function ensureContentScript(tabId: number): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (await pingTab(tabId)) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  try {
    await injectContentScripts(tabId);
  } catch {
    // Script may already be present; keep polling for the listener.
  }

  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (await pingTab(tabId)) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  throw new TabMessagingError(
    'Could not reach the page. Refresh the tab and try again.',
    'CONTENT_SCRIPT_UNAVAILABLE'
  );
}

export async function sendTabMessage<T>(
  tabId: number,
  message: Record<string, unknown>
): Promise<T> {
  await ensureContentScript(tabId);
  return chrome.tabs.sendMessage(tabId, message) as Promise<T>;
}

export async function getActiveInjectableTab(): Promise<chrome.tabs.Tab> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    throw new TabMessagingError('No active tab found.', 'NO_TAB');
  }
  if (!isInjectableUrl(tab.url)) {
    throw new TabMessagingError(
      'Open an http(s) page in this tab first.',
      'UNSUPPORTED_URL'
    );
  }
  return tab;
}
