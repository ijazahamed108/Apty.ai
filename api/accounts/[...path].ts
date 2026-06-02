import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleApiRequest } from '../app.js';

/** Vercel reserves /api/auth/* — route auth through /api/accounts/* and remap to Express /auth. */
function remapAccountsToAuth(req: VercelRequest): void {
  if (!req.url) return;

  const [pathname, query = ''] = req.url.split('?');
  const path = pathname
    .replace(/^\/api\/accounts/, '/auth')
    .replace(/^\/accounts/, '/auth');

  req.url = query ? `${path}?${query}` : path;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  remapAccountsToAuth(req);
  return handleApiRequest(req, res);
}
