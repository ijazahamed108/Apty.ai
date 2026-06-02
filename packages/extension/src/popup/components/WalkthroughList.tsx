import { useEffect, useState } from 'react';
import type { Walkthrough } from '@mini-apty/shared';
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

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    setLoading(true);
    listWalkthroughs(token, origin, path)
      .then((data) => {
        if (!cancelled) {
          setItems(data);
          void cacheWalkthroughs(data);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof NormalizedApiError ? err.message : 'Failed to load walkthroughs');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token, origin, path]);

  async function handleDelete(id: string) {
    if (!token) return;
    await deleteWalkthrough(token, id);
    setItems((prev) => prev.filter((w) => w.id !== id));
  }

  if (loading) return <p className="muted">Loading walkthroughs…</p>;
  if (error) return <div className="error">{error}</div>;
  if (items.length === 0) return <p className="muted">No walkthroughs for this page yet.</p>;

  return (
    <ul className="list">
      {items.map((wt) => (
        <li key={wt.id} className="list-item stack">
          <strong>{wt.name}</strong>
          <span className="muted">{wt.steps.length} steps · {wt.pathPattern}</span>
          <div className="row">
            <button type="button" onClick={() => onPreview(wt.id)}>
              Preview
            </button>
            <button type="button" className="danger" onClick={() => void handleDelete(wt.id)}>
              Delete
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
