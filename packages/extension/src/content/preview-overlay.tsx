import { StrictMode, useEffect, useState, useCallback } from 'react';
import { createRoot, Root } from 'react-dom/client';
import type { Walkthrough } from '@mini-apty/shared';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { observeElement, resolveElement } from '../lib/targeting';

type PreviewProps = {
  walkthrough: Walkthrough;
  initialStepIndex: number;
  onStepChange: (index: number) => void;
  onClose: () => void;
};

function PreviewOverlay({ walkthrough, initialStepIndex, onStepChange, onClose }: PreviewProps) {
  const [stepIndex, setStepIndex] = useState(initialStepIndex);
  const [missingTarget, setMissingTarget] = useState(false);
  const step = walkthrough.steps[stepIndex];
  const isComplete = stepIndex >= walkthrough.steps.length;

  const goNext = useCallback(() => {
    setStepIndex((i) => Math.min(i + 1, walkthrough.steps.length));
  }, [walkthrough.steps.length]);

  const goPrev = useCallback(() => {
    setStepIndex((i) => Math.max(i - 1, 0));
  }, []);

  useEffect(() => {
    onStepChange(stepIndex);
  }, [stepIndex, onStepChange]);

  useEffect(() => {
    if (!step) return;

    setMissingTarget(false);
    return observeElement(
      step.target,
      () => setMissingTarget(false),
      () => setMissingTarget(true)
    );
  }, [step]);

  useEffect(() => {
    if (!step || step.advanceTrigger === 'next-button') return;
    const el = resolveElement(step.target);
    if (!el) return;

    if (step.advanceTrigger === 'click-target') {
      el.addEventListener('click', goNext, true);
      return () => el.removeEventListener('click', goNext, true);
    }

    if (step.advanceTrigger === 'input-change') {
      el.addEventListener('change', goNext, true);
      return () => el.removeEventListener('change', goNext, true);
    }
  }, [step, goNext]);

  if (isComplete) {
    return (
      <div className="mini-apty-balloon" data-mini-apty-root>
        <p>Walkthrough complete.</p>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
    );
  }

  if (!step) return null;

  const targetEl = resolveElement(step.target);
  const rect = targetEl?.getBoundingClientRect();

  const style: React.CSSProperties = rect
    ? {
        position: 'fixed',
        top: Math.min(rect.bottom + 8, window.innerHeight - 160),
        left: Math.min(rect.left, window.innerWidth - 320),
        zIndex: 2147483647,
      }
    : { position: 'fixed', top: 24, left: 24, zIndex: 2147483647 };

  return (
    <>
      {rect && (
        <div
          className="mini-apty-spotlight"
          style={{
            position: 'fixed',
            top: rect.top - 4,
            left: rect.left - 4,
            width: rect.width + 8,
            height: rect.height + 8,
            pointerEvents: 'none',
            zIndex: 2147483646,
          }}
        />
      )}
      <div className="mini-apty-balloon" style={style} data-mini-apty-root>
        <strong>
          Step {stepIndex + 1} of {walkthrough.steps.length}
        </strong>
        <h3>{step.title}</h3>
        <p>{step.description}</p>
        {missingTarget && (
          <p className="mini-apty-warning">Target not found — waiting for page to update…</p>
        )}
        <div className="mini-apty-actions">
          <button type="button" onClick={goPrev} disabled={stepIndex === 0}>
            Previous
          </button>
          {(step.advanceTrigger === 'next-button' || stepIndex === walkthrough.steps.length - 1) && (
            <button type="button" onClick={goNext}>
              {stepIndex === walkthrough.steps.length - 1 ? 'Finish' : 'Next'}
            </button>
          )}
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </>
  );
}

let shadowHost: HTMLDivElement | null = null;
let reactRoot: Root | null = null;

function ensureShadowRoot(): void {
  if (shadowHost) return;

  shadowHost = document.createElement('div');
  shadowHost.setAttribute('data-mini-apty-root', 'host');
  shadowHost.style.all = 'initial';
  document.documentElement.appendChild(shadowHost);
  const shadow = shadowHost.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = `
    :host { all: initial; }
    .mini-apty-balloon {
      all: initial;
      font-family: system-ui, sans-serif;
      font-size: 14px;
      color: #111827;
      background: #fff;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      box-shadow: 0 10px 25px rgba(0,0,0,.15);
      padding: 12px;
      width: 280px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .mini-apty-balloon h3 { all: initial; font-size: 16px; font-weight: 700; display: block; margin: 0; color: #111827; }
    .mini-apty-balloon p { all: initial; display: block; margin: 0; color: #374151; line-height: 1.4; }
    .mini-apty-balloon strong { all: initial; font-size: 12px; color: #2563eb; font-weight: 600; }
    .mini-apty-warning { color: #b45309 !important; }
    .mini-apty-actions { display: flex; gap: 8px; flex-wrap: wrap; }
    .mini-apty-balloon button {
      all: initial;
      font-family: inherit;
      font-size: 13px;
      padding: 6px 10px;
      border-radius: 6px;
      cursor: pointer;
      background: #2563eb;
      color: #fff;
    }
    .mini-apty-balloon button:disabled { opacity: .5; cursor: not-allowed; }
    .mini-apty-spotlight {
      outline: 2px solid #2563eb;
      border-radius: 4px;
      box-shadow: 0 0 0 9999px rgba(15, 23, 42, 0.45);
      background: transparent;
    }
  `;
  shadow.appendChild(style);
  const mount = document.createElement('div');
  mount.id = 'mini-apty-mount';
  shadow.appendChild(mount);
  reactRoot = createRoot(mount);
}

export function mountPreview(
  walkthrough: Walkthrough,
  initialStepIndex: number,
  onStepChange: (index: number) => void
): () => void {
  ensureShadowRoot();
  reactRoot!.render(
    <StrictMode>
      <ErrorBoundary>
        <PreviewOverlay
          walkthrough={walkthrough}
          initialStepIndex={initialStepIndex}
          onStepChange={onStepChange}
          onClose={unmountPreview}
        />
      </ErrorBoundary>
    </StrictMode>
  );

  return unmountPreview;
}

export function unmountPreview(): void {
  reactRoot?.render(null);
}
