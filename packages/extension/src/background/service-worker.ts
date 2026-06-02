import { appendAuthorStep } from '../lib/author-draft';
import type { WalkthroughStep } from '@mini-apty/shared';

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'STEP_CAPTURED' && message.step) {
    void (async () => {
      await appendAuthorStep(message.step as WalkthroughStep);
      void chrome.runtime.sendMessage(message).catch(() => {
        // Popup may be closed while the user clicks on the page.
      });
      sendResponse({ ok: true });
    })();
    return true;
  }
  return false;
});

export {};
