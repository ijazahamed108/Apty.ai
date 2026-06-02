import { useState, useEffect } from 'react';
import type { WalkthroughStep } from '@mini-apty/shared';
import { createWalkthrough } from '../../lib/api';
import { NormalizedApiError } from '../../lib/api-client';
import { cacheWalkthrough } from '../../lib/storage';
import { CreateWalkthroughSchema } from '@mini-apty/shared';
import { useAuthStore, useAuthorStore } from '../../store';

type Props = {
  origin: string;
  path: string;
  onSaved: () => void;
};

export function AuthorPanel({ origin, path, onSaved }: Props) {
  const token = useAuthStore((s) => s.token);
  const { isRecording, steps, setRecording, addStep, updateStep, removeStep, clear } = useAuthorStore();
  const [name, setName] = useState('');
  const [pathPattern, setPathPattern] = useState(path);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
    setRecording(next);
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      await chrome.tabs.sendMessage(tab.id, { type: next ? 'START_AUTHOR' : 'STOP_AUTHOR' });
    }
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
          ? 'Click elements on the page to capture steps.'
          : 'Start recording, then click targets on the active tab.'}
      </p>

      {steps.length > 0 && (
        <>
          <label>
            Walkthrough name
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="My flow" />
          </label>
          <label>
            Path pattern
            <input value={pathPattern} onChange={(e) => setPathPattern(e.target.value)} />
          </label>
          <div className="stack">
            {steps.map((step, index) => (
              <StepEditor
                key={step.id}
                step={step}
                index={index}
                onChange={(patch) => updateStep(step.id, patch)}
                onRemove={() => removeStep(step.id)}
              />
            ))}
          </div>
          {error && <div className="error">{error}</div>}
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
