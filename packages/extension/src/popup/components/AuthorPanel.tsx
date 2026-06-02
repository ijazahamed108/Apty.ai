import { useState, useEffect, useCallback } from 'react';
import type { WalkthroughStep } from '@mini-apty/shared';
import { createWalkthrough } from '../../lib/api';
import { NormalizedApiError } from '../../lib/api-client';
import {
  AUTHOR_DRAFT_KEY,
  clearAuthorDraft,
  readAuthorDraft,
  updateAuthorDraft,
  writeAuthorDraft,
  type AuthorDraft,
} from '../../lib/author-draft';
import { getActiveInjectableTab, sendTabMessage, TabMessagingError } from '../../lib/tab-messaging';
import { cacheWalkthrough } from '../../lib/storage';
import { CreateWalkthroughSchema } from '@mini-apty/shared';
import { useAuthStore, useAuthorStore } from '../../store';

type Props = {
  origin: string;
  path: string;
  onSaved: () => void;
};

export function AuthorPanel({ origin, path: currentPath, onSaved }: Props) {
  const token = useAuthStore((s) => s.token);
  const { isRecording, steps, setRecording, hydrate, addStep, setSteps, clear } = useAuthorStore();
  const [name, setName] = useState('');
  const [pathPattern, setPathPattern] = useState('*');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const applyDraft = useCallback(
    (draft: AuthorDraft) => {
      hydrate({ isRecording: draft.isRecording, steps: draft.steps });
      if (draft.name) setName(draft.name);
      if (draft.pathPattern) setPathPattern(draft.pathPattern);
    },
    [hydrate]
  );

  const persistDraft = useCallback(
    async (patch: Partial<AuthorDraft>) => {
      const draft = await updateAuthorDraft({
        origin,
        pathPattern,
        name,
        ...patch,
      });
      applyDraft(draft);
    },
    [applyDraft, name, origin, pathPattern]
  );

  useEffect(() => {
    void readAuthorDraft().then(async (draft) => {
      applyDraft(draft);

      if (!draft.isRecording) return;

      try {
        const tab = await getActiveInjectableTab();
        const status = await sendTabMessage<{ active?: boolean }>(tab.id!, {
          type: 'GET_AUTHOR_STATUS',
        });
        if (!status?.active) {
          const updated = await updateAuthorDraft({ isRecording: false });
          applyDraft(updated);
        }
      } catch {
        const updated = await updateAuthorDraft({ isRecording: false });
        applyDraft(updated);
      }
    });
  }, [applyDraft]);

  useEffect(() => {
    function onStorageChange(
      changes: Record<string, chrome.storage.StorageChange>,
      area: string
    ) {
      if (area !== 'local' || !changes[AUTHOR_DRAFT_KEY]) return;
      const draft = changes[AUTHOR_DRAFT_KEY].newValue as AuthorDraft | undefined;
      if (draft) applyDraft(draft);
    }
    chrome.storage.onChanged.addListener(onStorageChange);
    return () => chrome.storage.onChanged.removeListener(onStorageChange);
  }, [applyDraft]);

  useEffect(() => {
    function onMessage(message: { type?: string; step?: WalkthroughStep }) {
      if (message.type === 'STEP_CAPTURED' && message.step) {
        addStep({ ...message.step, order: steps.length });
      }
    }
    chrome.runtime.onMessage.addListener(onMessage);
    return () => chrome.runtime.onMessage.removeListener(onMessage);
  }, [addStep, steps.length]);

  async function toggleRecording() {
    const next = !isRecording;
    setError(null);
    try {
      const tab = await getActiveInjectableTab();
      await sendTabMessage(tab.id!, { type: next ? 'START_AUTHOR' : 'STOP_AUTHOR' });
      if (next) {
        await writeAuthorDraft({
          isRecording: true,
          steps: [],
          origin,
          pathPattern,
          name,
        });
        hydrate({ isRecording: true, steps: [] });
      } else {
        await persistDraft({ isRecording: false });
      }
      setRecording(next);
    } catch (err) {
      setError(
        err instanceof TabMessagingError
          ? err.message
          : 'Could not reach the page. Refresh the tab and try recording again.'
      );
    }
  }

  async function handleRemoveStep(id: string) {
    const nextSteps = steps
      .filter((step) => step.id !== id)
      .map((step, index) => ({ ...step, order: index }));
    setSteps(nextSteps);
    await persistDraft({ steps: nextSteps });
  }

  async function handleUpdateStep(id: string, patch: Partial<WalkthroughStep>) {
    const nextSteps = steps.map((step) => (step.id === id ? { ...step, ...patch } : step));
    setSteps(nextSteps);
    await persistDraft({ steps: nextSteps });
  }

  async function save() {
    if (!token || steps.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: name || `Walkthrough ${new Date().toLocaleString()}`,
        origin,
        pathPattern,
        steps,
      };
      CreateWalkthroughSchema.parse(payload);
      const saved = await createWalkthrough(token, payload);
      await cacheWalkthrough(saved);
      await clearAuthorDraft();
      clear();
      setName('');
      onSaved();
    } catch (err) {
      setError(err instanceof NormalizedApiError ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card stack">
      <div className="row">
        <h2>Author mode</h2>
        {isRecording && <span className="badge">Recording</span>}
      </div>
      <button type="button" onClick={() => void toggleRecording()}>
        {isRecording ? 'Stop recording' : 'Start recording'}
      </button>
      <p className="muted">
        {isRecording
          ? 'Click elements on the page to capture steps. The popup closes when you click the page — reopen it to review and save.'
          : 'Start recording, then click targets on the active tab.'}
      </p>
      {error && <div className="error">{error}</div>}

      {steps.length > 0 && (
        <>
          <label>
            Walkthrough name
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                void persistDraft({ name: e.target.value });
              }}
              placeholder="My flow"
            />
          </label>
          <label>
            Path pattern
            <input
              value={pathPattern}
              onChange={(e) => {
                setPathPattern(e.target.value);
                void persistDraft({ pathPattern: e.target.value });
              }}
              placeholder={`* = all paths (current: ${currentPath})`}
            />
          </label>
          <div className="stack">
            {steps.map((step, index) => (
              <StepEditor
                key={step.id}
                step={step}
                index={index}
                onChange={(patch) => void handleUpdateStep(step.id, patch)}
                onRemove={() => void handleRemoveStep(step.id)}
              />
            ))}
          </div>
          <button type="button" onClick={() => void save()} disabled={saving}>
            {saving ? 'Saving…' : 'Save walkthrough'}
          </button>
        </>
      )}
    </div>
  );
}

function StepEditor({
  step,
  index,
  onChange,
  onRemove,
}: {
  step: WalkthroughStep;
  index: number;
  onChange: (patch: Partial<WalkthroughStep>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="card stack">
      <strong>Step {index + 1}</strong>
      <label>
        Title
        <input value={step.title} onChange={(e) => onChange({ title: e.target.value })} />
      </label>
      <label>
        Description
        <textarea
          value={step.description}
          onChange={(e) => onChange({ description: e.target.value })}
        />
      </label>
      <label>
        Advance trigger
        <select
          value={step.advanceTrigger}
          onChange={(e) =>
            onChange({
              advanceTrigger: e.target.value as WalkthroughStep['advanceTrigger'],
            })
          }
        >
          <option value="next-button">Next button</option>
          <option value="click-target">Click target</option>
          <option value="input-change">Input change</option>
        </select>
      </label>
      <button type="button" className="secondary" onClick={onRemove}>
        Remove step
      </button>
    </div>
  );
}
