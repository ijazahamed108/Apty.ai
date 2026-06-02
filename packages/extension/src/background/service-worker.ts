chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'STEP_CAPTURED') {
    void chrome.runtime.sendMessage(message).catch(() => {
      // Popup may be closed — ignore delivery errors
    });
    sendResponse({ ok: true });
    return true;
  }
  return false;
});

export {};
