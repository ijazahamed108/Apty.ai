import { useEffect, useState, useCallback, useMemo } from 'react';
import { createRoot, Root } from 'react-dom/client';
import type { Walkthrough, WalkthroughStep } from '@mini-apty/shared';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { observeElement, resolveElement } from '../lib/targeting';

type PreviewProps = {
  walkthrough: Walkthrough;
  initialStepIndex: number;
  onStepChange: (index: number) => void;
  onClose: () => void;
};

function sortSteps(steps: WalkthroughStep[]): WalkthroughStep[] {
  return [...steps].sort((a, b) => a.order - b.order);
}

function clampStepIndex(index: number, stepCount: number): number {
  if (stepCount <= 0) return 0;
  return Math.min(Math.max(0, index), stepCount - 1);
}

function PreviewOverlay({ walkthrough, initialStepIndex, onStepChange, onClose }: PreviewProps) {
  const steps = useMemo(() => sortSteps(walkthrough.steps), [walkthrough.steps]);
  const [stepIndex, setStepIndex] = useState(() => clampStepIndex(initialStepIndex, steps.length));
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [missingTarget, setMissingTarget] = useState(false);
  const [pulseKey, setPulseKey] = useState(0);

  const step = steps[stepIndex];
  const isComplete = stepIndex >= steps.length;

  const goNext = useCallback(() => {
    setStepIndex((current) => {
      if (current >= steps.length - 1) return steps.length;
      return current + 1;
    });
    setPulseKey((key) => key + 1);
  }, [steps.length]);

  const goPrev = useCallback(() => {
    setStepIndex((current) => Math.max(current - 1, 0));
    setPulseKey((key) => key + 1);
  }, []);

  useEffect(() => {
    onStepChange(stepIndex);
  }, [stepIndex, onStepChange]);

  useEffect(() => {
    if (!step) {
      setTargetRect(null);
      setMissingTarget(false);
      return;
    }

    let frame = 0;

    const updateTarget = () => {
      const el = resolveElement(step.target);
      if (!el) {
        setTargetRect(null);
        setMissingTarget(true);
        return;
      }

      setMissingTarget(false);
      setTargetRect(el.getBoundingClientRect());
    };

    updateTarget();
    elScrollIntoView(step);

    const stopObserve = observeElement(
      step.target,
      () => updateTarget(),
      () => {
        setTargetRect(null);
        setMissingTarget(true);
      }
    );

    const scheduleUpdate = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updateTarget);
    };

    window.addEventListener('scroll', scheduleUpdate, true);
    window.addEventListener('resize', scheduleUpdate);

    return () => {
      stopObserve();
      window.removeEventListener('scroll', scheduleUpdate, true);
      window.removeEventListener('resize', scheduleUpdate);
      cancelAnimationFrame(frame);
    };
  }, [step, stepIndex, pulseKey]);

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
      <div className="mini-apty-balloon mini-apty-interactive" data-mini-apty-root>
        <p>Walkthrough complete.</p>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
    );
  }

  if (!step) return null;

  const balloonStyle: React.CSSProperties = targetRect
    ? {
        top: Math.min(targetRect.bottom + 12, window.innerHeight - 180),
        left: Math.min(Math.max(targetRect.left, 12), window.innerWidth - 300),
      }
    : { top: 24, left: 24 };

  return (
    <>
      {targetRect && (
        <div
          key={pulseKey}
          className="mini-apty-spotlight mini-apty-spotlight-pulse"
          style={{
            top: targetRect.top - 6,
            left: targetRect.left - 6,
            width: targetRect.width + 12,
            height: targetRect.height + 12,
          }}
        />
      )}
      <div
        className="mini-apty-balloon mini-apty-interactive"
        style={balloonStyle}
        data-mini-apty-root
      >
        <strong>
          Step {stepIndex + 1} of {steps.length}
        </strong>
        <h3>{step.title || `Step ${stepIndex + 1}`}</h3>
        {step.description ? <p>{step.description}</p> : null}
        {missingTarget && (
          <p className="mini-apty-warning">
            Target not found on this page — try scrolling or refreshing.
          </p>
        )}
        <div className="mini-apty-actions">
          <button type="button" onClick={goPrev} disabled={stepIndex === 0}>
            Previous
          </button>
          {(step.advanceTrigger === 'next-button' || stepIndex === steps.length - 1) && (
            <button type="button" onClick={goNext}>
              {stepIndex === steps.length - 1 ? 'Finish' : 'Next'}
            </button>
          )}
          <button type="button" className="mini-apty-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </>
  );
}

function elScrollIntoView(step: WalkthroughStep): void {
  const el = resolveElement(step.target);
  el?.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
}

let overlayHost: HTMLDivElement | null = null;
let reactRoot: Root | null = null;

const OVERLAY_STYLES = `
  #mini-apty-preview-root {
    position: fixed;
    inset: 0;
    z-index: 2147483646;
    pointer-events: none;
    font-family: system-ui, -apple-system, sans-serif;
  }
  #mini-apty-preview-root .mini-apty-spotlight {
    position: fixed;
    pointer-events: none;
    z-index: 2147483646;
    outline: 3px solid #2563eb;
    border-radius: 6px;
    box-shadow: 0 0 0 9999px rgba(15, 23, 42, 0.5);
    background: transparent;
  }
  #mini-apty-preview-root .mini-apty-spotlight-pulse {
    animation: mini-apty-pulse 0.45s ease-out;
  }
  @keyframes mini-apty-pulse {
    0% { outline-color: #93c5fd; transform: scale(0.98); }
    100% { outline-color: #2563eb; transform: scale(1); }
  }
  #mini-apty-preview-root .mini-apty-balloon {
    position: fixed;
    z-index: 2147483647;
    box-sizing: border-box;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    color: #111827;
    background: #fff;
    border: 1px solid #d1d5db;
    border-radius: 10px;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.18);
    padding: 14px;
    width: 292px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  #mini-apty-preview-root .mini-apty-interactive {
    pointer-events: auto;
  }
  #mini-apty-preview-root .mini-apty-balloon h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
    line-height: 1.3;
    color: #111827;
  }
  #mini-apty-preview-root .mini-apty-balloon p {
    margin: 0;
    color: #374151;
    line-height: 1.45;
  }
  #mini-apty-preview-root .mini-apty-balloon strong {
    font-size: 12px;
    color: #2563eb;
    font-weight: 600;
    letter-spacing: 0.02em;
    text-transform: uppercase;
  }
  #mini-apty-preview-root .mini-apty-warning {
    color: #b45309;
    font-size: 13px;
  }
  #mini-apty-preview-root .mini-apty-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-top: 4px;
  }
  #mini-apty-preview-root .mini-apty-balloon button {
    box-sizing: border-box;
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    padding: 7px 12px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    background: #2563eb;
    color: #fff;
  }
  #mini-apty-preview-root .mini-apty-balloon button:hover {
    background: #1d4ed8;
  }
  #mini-apty-preview-root .mini-apty-balloon button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
  #mini-apty-preview-root .mini-apty-secondary {
    background: #e5e7eb !important;
    color: #111827 !important;
  }
`;

function ensureOverlayHost(): HTMLDivElement {
  if (overlayHost) return overlayHost;

  overlayHost = document.createElement('div');
  overlayHost.id = 'mini-apty-preview-root';
  overlayHost.setAttribute('data-mini-apty-root', 'preview');
  document.documentElement.appendChild(overlayHost);

  const style = document.createElement('style');
  style.textContent = OVERLAY_STYLES;
  overlayHost.appendChild(style);

  const mount = document.createElement('div');
  mount.id = 'mini-apty-preview-mount';
  overlayHost.appendChild(mount);
  reactRoot = createRoot(mount);

  return overlayHost;
}

export function mountPreview(
  walkthrough: Walkthrough,
  initialStepIndex: number,
  onStepChange: (index: number) => void
): () => void {
  ensureOverlayHost();
  const steps = sortSteps(walkthrough.steps);
  const safeIndex = clampStepIndex(initialStepIndex, steps.length);

  reactRoot!.render(
    <ErrorBoundary>
      <PreviewOverlay
        walkthrough={{ ...walkthrough, steps }}
        initialStepIndex={safeIndex}
        onStepChange={onStepChange}
        onClose={unmountPreview}
      />
    </ErrorBoundary>
  );

  return unmountPreview;
}

export function unmountPreview(): void {
  reactRoot?.render(null);
  overlayHost?.remove();
  overlayHost = null;
  reactRoot = null;
}
