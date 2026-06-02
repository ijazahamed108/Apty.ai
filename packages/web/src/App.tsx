import { useState } from 'react';

type HealthState = 'idle' | 'loading' | 'ok' | 'error';

function resolveHealthUrl(): string {
  if (import.meta.env.PROD) {
    return '/api/health';
  }

  const base = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '');
  if (base) {
    return `${base}/health`;
  }
  return '/api/health';
}

function formatFetchError(error: unknown, healthUrl: string): string {
  const message = error instanceof Error ? error.message : 'Unable to reach API';
  if (message === 'Failed to fetch') {
    return `Cannot reach ${healthUrl}. Start the backend (pnpm dev:backend). If you use the web UI locally, also run pnpm dev:web — or verify with curl ${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001'}/health`;
  }
  return message;
}

export function App() {
  const [healthState, setHealthState] = useState<HealthState>('idle');
  const [message, setMessage] = useState('Click the health check to verify the live Express API.');

  const checkHealth = async () => {
    const healthUrl = resolveHealthUrl();
    setHealthState('loading');
    setMessage(`Checking ${healthUrl}...`);

    try {
      const response = await fetch(healthUrl);
      const contentType = response.headers.get('content-type') ?? '';

      if (!contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(
          text.includes('FUNCTION_INVOCATION_FAILED')
            ? 'HTTP 500 — API function crashed. Set JWT_SECRET and MONGODB_URI in Vercel → Settings → Environment Variables, then redeploy.'
            : `HTTP ${response.status} — API returned non-JSON response`
        );
      }

      const data = (await response.json()) as {
        status?: string;
        service?: string;
        error?: { message?: string };
      };

      if (!response.ok) {
        throw new Error(data.error?.message ?? `HTTP ${response.status}`);
      }

      if (data.status && data.service) {
        setHealthState('ok');
        setMessage(`${data.service} is ${data.status}`);
        return;
      }

      throw new Error('Unexpected health response');
    } catch (error) {
      setHealthState('error');
      if (error instanceof Error && error.message.startsWith('HTTP ')) {
        setMessage(`${error.message} — check Vercel env vars (JWT_SECRET, MONGODB_URI) and function logs.`);
        return;
      }
      setMessage(formatFetchError(error, healthUrl));
    }
  };

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Mini Apty</p>
        <h1>Chrome MV3 walkthrough extension with a MERN backend.</h1>
        <p className="intro">
          This deployed React page validates the live Express API. The main challenge deliverable is
          the Chrome extension, which authors and previews walkthroughs on third-party websites.
        </p>

        <div className="actions">
          <button type="button" onClick={checkHealth} disabled={healthState === 'loading'}>
            {healthState === 'loading' ? 'Checking...' : 'Check API health'}
          </button>
          <span className={`status status-${healthState}`}>{message}</span>
        </div>
      </section>

      <section className="grid" aria-label="Architecture summary">
        <article>
          <h2>React Frontend</h2>
          <p>
            Vercel serves this lightweight React app from <code>public/</code> so the project deploys
            cleanly as a MERN application.
          </p>
        </article>
        <article>
          <h2>Express API</h2>
          <p>
            Serverless routes handle <code>/auth/*</code>, <code>/walkthroughs/*</code>, and{' '}
            <code>/health</code> using the same backend as local development.
          </p>
        </article>
        <article>
          <h2>MongoDB Atlas</h2>
          <p>
            Users and walkthroughs persist in MongoDB with JWT auth and owner-scoped authorization.
          </p>
        </article>
        <article>
          <h2>Chrome Extension</h2>
          <p>
            The MV3 extension remains the primary product surface for author mode, preview mode, and
            robust element targeting.
          </p>
        </article>
      </section>
    </main>
  );
}
