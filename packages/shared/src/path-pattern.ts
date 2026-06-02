/** Normalizes origin for consistent matching (lowercase host). */
export function normalizeOrigin(origin: string): string {
  try {
    const url = new URL(origin);
    url.hostname = url.hostname.toLowerCase();
    return url.origin;
  } catch {
    return origin.trim();
  }
}

/** Converts SQL LIKE patterns (% and _) to a RegExp test against the page path. */
export function matchesPathPattern(path: string, pattern: string): boolean {
  if (pattern === '*') {
    return true;
  }

  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regexSource = `^${escaped.replace(/%/g, '.*').replace(/_/g, '.')}$`;
  return new RegExp(regexSource).test(path);
}
