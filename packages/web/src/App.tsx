import { useState } from 'react';

type HealthState = 'idle' | 'loading' | 'ok' | 'error';

export function App() {
  const [healthState, setHealthState] = useState<HealthState>('idle');
  const [message, setMessage] = useState('Click the health check to verify the live Express API.');

  const checkHealth = async () => {
    setHealthState('loading');
    setMessage('Checking /health...');

    try {
      const response = await fetch('/health');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = (await response.json()) as { status: string; service: string };
      setHealthState('ok');
      setMessage(`${data.service} is ${data.status}`);
    } catch (error) {
      setHealthState('error');
      setMessage(error instanceof Error ? error.message : 'Unable to reach API');
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
