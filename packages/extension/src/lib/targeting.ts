import type { ElementFingerprint, ElementTarget } from '@mini-apty/shared';

const STABLE_ATTRS = ['data-testid', 'data-test', 'data-cy', 'data-qa', 'name', 'aria-label', 'id'];

function escapeCss(value: string): string {
  if (typeof CSS !== 'undefined' && 'escape' in CSS) {
    return CSS.escape(value);
  }
  return value.replace(/[^a-zA-Z0-9_-]/g, '\\$&');
}

function getTextSnippet(el: Element): string | undefined {
  const text = (el.textContent ?? '').trim().replace(/\s+/g, ' ');
  if (!text) return undefined;
  return text.slice(0, 80);
}

export function buildFingerprint(el: Element): ElementFingerprint {
  const htmlEl = el as HTMLElement;
  const attrs: Record<string, string> = {};

  for (const name of STABLE_ATTRS) {
    const value = el.getAttribute(name);
    if (value) attrs[name] = value;
  }

  return {
    tagName: el.tagName,
    role: el.getAttribute('role') ?? undefined,
    ariaLabel: el.getAttribute('aria-label') ?? undefined,
    textSnippet: getTextSnippet(el),
    placeholder: htmlEl instanceof HTMLInputElement ? htmlEl.placeholder || undefined : undefined,
    name: htmlEl.getAttribute('name') ?? undefined,
    type: htmlEl.getAttribute('type') ?? undefined,
    href: htmlEl instanceof HTMLAnchorElement ? htmlEl.href || undefined : undefined,
    attributes: Object.keys(attrs).length > 0 ? attrs : undefined,
  };
}

function buildPrimarySelector(el: Element): string {
  for (const attr of STABLE_ATTRS) {
    const value = el.getAttribute(attr);
    if (value) {
      return `${el.tagName.toLowerCase()}[${attr}="${escapeCss(value)}"]`;
    }
  }

  const role = el.getAttribute('role');
  const aria = el.getAttribute('aria-label');
  if (role && aria) {
    return `[role="${escapeCss(role)}"][aria-label="${escapeCss(aria)}"]`;
  }

  const snippet = getTextSnippet(el);
  if (snippet && snippet.length <= 40 && el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA') {
    const candidates = Array.from(document.querySelectorAll(el.tagName.toLowerCase()));
    const match = candidates.find((node) => getTextSnippet(node) === snippet);
    if (match) {
      return buildStructuralSelector(match);
    }
  }

  return buildStructuralSelector(el);
}

function buildStructuralSelector(el: Element): string {
  const parts: string[] = [];
  let currentEl: Element | null = el;

  while (currentEl && currentEl.nodeType === Node.ELEMENT_NODE && parts.length < 5) {
    let part = currentEl.tagName.toLowerCase();
    const parentEl: Element | null = currentEl.parentElement;
    if (parentEl) {
      const siblings = Array.from(parentEl.children).filter(
        (child: Element) => child.tagName === currentEl!.tagName
      );
      if (siblings.length > 1) {
        const index = siblings.indexOf(currentEl) + 1;
        part += `:nth-of-type(${index})`;
      }
    }
    parts.unshift(part);
    if (currentEl.id) break;
    currentEl = parentEl;
  }

  return parts.join(' > ');
}

function buildXPath(el: Element): string {
  const segments: string[] = [];
  let current: Element | null = el;

  while (current) {
    let index = 1;
    let sibling = current.previousElementSibling;
    while (sibling) {
      if (sibling.tagName === current.tagName) index += 1;
      sibling = sibling.previousElementSibling;
    }
    segments.unshift(`${current.tagName.toLowerCase()}[${index}]`);
    current = current.parentElement;
  }

  return `/${segments.join('/')}`;
}

function findAnchor(el: Element): { anchorSelector: string; relativePath: string } | null {
  let parent = el.parentElement;
  let depth = 0;

  while (parent && depth < 6) {
    for (const attr of STABLE_ATTRS) {
      const value = parent.getAttribute(attr);
      if (value) {
        const anchorSelector = `${parent.tagName.toLowerCase()}[${attr}="${escapeCss(value)}"]`;
        const anchor = document.querySelector(anchorSelector);
        if (anchor) {
          const relativePath = getRelativePath(anchor, el);
          return { anchorSelector, relativePath };
        }
      }
    }
    parent = parent.parentElement;
    depth += 1;
  }

  return null;
}

function getRelativePath(root: Element, target: Element): string {
  const parts: string[] = [];
  let currentEl: Element | null = target;

  while (currentEl && currentEl !== root) {
    let part = currentEl.tagName.toLowerCase();
    const parentEl: Element | null = currentEl.parentElement;
    if (parentEl) {
      const siblings = Array.from(parentEl.children).filter(
        (child: Element) => child.tagName === currentEl!.tagName
      );
      if (siblings.length > 1) {
        part += `:nth-of-type(${siblings.indexOf(currentEl) + 1})`;
      }
    }
    parts.unshift(part);
    currentEl = parentEl;
  }

  return parts.join(' > ');
}

export function captureElementTarget(el: Element): ElementTarget {
  const anchor = findAnchor(el);
  return {
    selector: buildPrimarySelector(el),
    xpath: buildXPath(el),
    anchorSelector: anchor?.anchorSelector,
    relativePath: anchor?.relativePath,
    fingerprint: buildFingerprint(el),
  };
}

function scoreCandidate(el: Element, fingerprint: ElementFingerprint): number {
  let score = 0;
  if (el.tagName === fingerprint.tagName) score += 3;
  if (fingerprint.role && el.getAttribute('role') === fingerprint.role) score += 2;
  if (fingerprint.ariaLabel && el.getAttribute('aria-label') === fingerprint.ariaLabel) score += 3;
  if (fingerprint.textSnippet && getTextSnippet(el) === fingerprint.textSnippet) score += 2;
  if (fingerprint.attributes) {
    for (const [key, value] of Object.entries(fingerprint.attributes)) {
      if (el.getAttribute(key) === value) score += 2;
    }
  }
  return score;
}

function findByFingerprint(fingerprint: ElementFingerprint): Element | null {
  const candidates = Array.from(document.querySelectorAll(fingerprint.tagName));
  let best: { el: Element; score: number } | null = null;

  for (const el of candidates) {
    const score = scoreCandidate(el, fingerprint);
    if (score >= 4 && (!best || score > best.score)) {
      best = { el, score };
    }
  }

  return best?.el ?? null;
}

export function resolveElement(target: ElementTarget): Element | null {
  const primary = document.querySelector(target.selector);
  if (primary) return primary;

  if (target.anchorSelector && target.relativePath) {
    const anchor = document.querySelector(target.anchorSelector);
    if (anchor) {
      const relative = anchor.querySelector(target.relativePath);
      if (relative) return relative;
    }
  }

  if (target.xpath) {
    const xpathResult = document.evaluate(
      target.xpath,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    );
    const node = xpathResult.singleNodeValue;
    if (node instanceof Element) return node;
  }

  return findByFingerprint(target.fingerprint);
}

export function observeElement(
  target: ElementTarget,
  onFound: (el: Element) => void,
  onLost: () => void
): () => void {
  let current: Element | null = resolveElement(target);

  if (current) onFound(current);

  const observer = new MutationObserver(() => {
    const next = resolveElement(target);
    if (next !== current) {
      current = next;
      if (next) onFound(next);
      else onLost();
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
  });

  return () => observer.disconnect();
}
