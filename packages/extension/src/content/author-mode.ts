import { randomUUID } from '../lib/uuid';
import type { WalkthroughStep } from '@mini-apty/shared';
import { captureElementTarget } from '../lib/targeting';

const HIGHLIGHT_ATTR = 'data-mini-apty-highlight';

export function mountAuthorMode(onCapture: (step: WalkthroughStep) => void): () => void {
  const style = document.createElement('style');
  style.textContent = `
    [${HIGHLIGHT_ATTR}] {
      outline: 2px solid #2563eb !important;
      outline-offset: 2px !important;
      cursor: crosshair !important;
    }
  `;
  document.documentElement.appendChild(style);

  function onMouseOver(e: MouseEvent) {
    const target = e.target;
    if (!(target instanceof Element)) return;
    if (target.closest('[data-mini-apty-root]')) return;
    target.setAttribute(HIGHLIGHT_ATTR, 'true');
  }

  function onMouseOut(e: MouseEvent) {
    const target = e.target;
    if (target instanceof Element) target.removeAttribute(HIGHLIGHT_ATTR);
  }

  function onClick(e: MouseEvent) {
    const target = e.target;
    if (!(target instanceof Element)) return;
    if (target.closest('[data-mini-apty-root]')) return;

    e.preventDefault();
    e.stopPropagation();

    const elementTarget = captureElementTarget(target);
    const step: WalkthroughStep = {
      id: randomUUID(),
      order: 0,
      title: 'New step',
      description: '',
      advanceTrigger: 'next-button',
      target: elementTarget,
    };

    onCapture(step);
  }

  document.addEventListener('mouseover', onMouseOver, true);
  document.addEventListener('mouseout', onMouseOut, true);
  document.addEventListener('click', onClick, true);

  return () => {
    document.removeEventListener('mouseover', onMouseOver, true);
    document.removeEventListener('mouseout', onMouseOut, true);
    document.removeEventListener('click', onClick, true);
    style.remove();
    document.querySelectorAll(`[${HIGHLIGHT_ATTR}]`).forEach((el) => el.removeAttribute(HIGHLIGHT_ATTR));
  };
}
