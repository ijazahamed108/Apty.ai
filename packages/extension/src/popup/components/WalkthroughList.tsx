import { useCallback, useEffect, useState } from 'react';
import type { Walkthrough } from '@mini-apty/shared';
import { matchesPathPattern } from '@mini-apty/shared';
import { listWalkthroughs, deleteWalkthrough } from '../../lib/api';
import { NormalizedApiError } from '../../lib/api-client';
import { cacheWalkthroughs } from '../../lib/storage';
import { useAuthStore } from '../../store';

type Props = {
  origin: string;
  path: string;
  onPreview: (id: string) => void;
};

export function WalkthroughList({ origin, path, onPreview }: Props) {
  const token = useAuthStore((s) => s.token);
  const [items, setItems] = useState<Walkthrough[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError(null);
    try {
      const data = await listWalkthroughs(token, origin);
      setItems(data);
      await cacheWalkthroughs(data);
    } catch (err: unknown) {
      setError(err instanceof NormalizedApiError ? err.message : 'Failed to load walkthroughs');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [token, origin]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleDelete(id: string) {
    if (!token) return;
    await deleteWalkthrough(token, id);
    setItems((prev) => prev.filter((w) => w.id !== id));
  }

  if (loading) return <p className="muted">Loading walkthroughs…</p>;
  if (error) return <div className="error">{error}</div>;
  if (items.length === 0) {
    return (
      <p className="muted">
        No walkthroughs saved for this site yet ({origin}).
      </p>
    );
  }

  const matching = items.filter((wt) => matchesPathPattern(path, wt.pathPattern));
  const other = items.filter((wt) => !matchesPathPattern(path, wt.pathPattern));

  return (
    <div className="stack">
      <button type="button" className="secondary" onClick={() => void load()}>
        Refresh list
      </button>

      {matching.length > 0 && (
        <WalkthroughGroup
          title="On this page"
          items={matching}
          onPreview={onPreview}
          onDelete={(id) => void handleDelete(id)}
        />
      )}

      {other.length > 0 && (
        <WalkthroughGroup
          title="Other paths on this site"
          items={other}
          onPreview={onPreview}
          onDelete={(id) => void handleDelete(id)}
          showPathHint
        />
      )}
    </div>
  );
}

function WalkthroughGroup({
  title,
  items,
  onPreview,
  onDelete,
  showPathHint = false,
}: {
  title: string;
  items: Walkthrough[];
  onPreview: (id: string) => void;
  onDelete: (id: string) => void;
  showPathHint?: boolean;
}) {
  return (
    <div className="stack">
      <h3 style={{ margin: 0, fontSize: '0.9rem' }}>{title}</h3>
      <ul className="list">
        {items.map((wt) => (
          <li key={wt.id} className="list-item stack">
            <strong>{wt.name}</strong>
            <span className="muted">
              {wt.steps.length} steps · path: {wt.pathPattern}
            </span>
            {showPathHint && (
              <span className="muted">Navigate to a matching path to preview reliably.</span>
            )}
            <div className="row">
              <button type="button" onClick={() => onPreview(wt.id)}>
                Preview
              </button>
              <button type="button" className="danger" onClick={() => onDelete(wt.id)}>
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
