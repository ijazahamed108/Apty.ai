import { useEffect, useState } from 'react';
import {
  getActiveInjectableTab,
  sendTabMessage,
  TabMessagingError,
} from '../lib/tab-messaging';
import { useAuthStore } from '../store';
import { AuthForm } from './components/AuthForm';
import { AuthorPanel } from './components/AuthorPanel';
import { WalkthroughList } from './components/WalkthroughList';

type TabContext = {
  origin: string;
  path: string;
};

export function PopupApp() {
  const { token, user, logout } = useAuthStore();
  const [tab, setTab] = useState<TabContext | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [tabError, setTabError] = useState<string | null>(null);

  useEffect(() => {
    void chrome.tabs.query({ active: true, currentWindow: true }).then(([activeTab]) => {
      if (!activeTab?.url) return;
      try {
        const url = new URL(activeTab.url);
        if (url.protocol.startsWith('http')) {
          setTab({ origin: url.origin, path: url.pathname });
        }
      } catch {
        setTab(null);
      }
    });
  }, []);

  async function startPreview(walkthroughId: string) {
    setTabError(null);

    try {
      const tab = await getActiveInjectableTab();
      const response = await sendTabMessage<{ ok: boolean; error?: string }>(tab.id!, {
        type: 'START_PREVIEW',
        walkthroughId,
      });
      if (!response?.ok) {
        setTabError(response?.error ?? 'Preview failed to start.');
      }
    } catch (err) {
      setTabError(
        err instanceof TabMessagingError
          ? err.message
          : 'Could not reach the page. Refresh the tab and try preview again.'
      );
    }
  }

  return (
    <div className="app">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1>Mini Apty</h1>
        <span className="badge">MERN · TS</span>
      </div>

      {!token || !user ? (
        <AuthForm />
      ) : (
        <>
          <div className="card row" style={{ justifyContent: 'space-between' }}>
            <span>
              {user.email} · {user.role}
            </span>
            <button type="button" className="secondary" onClick={logout}>
              Sign out
            </button>
          </div>

          {tab ? (
            <>
              <p className="muted">
                Page: {tab.origin}
                {tab.path}
              </p>
              {tabError && <div className="error">{tabError}</div>}
              <AuthorPanel
                origin={tab.origin}
                path={tab.path}
                onSaved={() => setRefreshKey((k) => k + 1)}
              />
              <div className="card stack">
                <h2>Saved walkthroughs</h2>
                <WalkthroughList
                  key={refreshKey}
                  origin={tab.origin}
                  path={tab.path}
                  onPreview={(id) => void startPreview(id)}
                />
              </div>
            </>
          ) : (
            <div className="error">Open an http(s) page to author or preview walkthroughs.</div>
          )}
        </>
      )}
    </div>
  );
}
