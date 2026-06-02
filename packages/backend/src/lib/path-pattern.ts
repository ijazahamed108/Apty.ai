/** Converts SQL LIKE patterns (% and _) to a RegExp test against the page path. */
export function matchesPathPattern(path: string, pattern: string): boolean {
  if (pattern === '*') {
    return true;
  }

  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regexSource = `^${escaped.replace(/%/g, '.*').replace(/_/g, '.')}$`;
  return new RegExp(regexSource).test(path);
}
