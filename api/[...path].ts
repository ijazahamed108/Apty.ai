import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleApiRequest } from './app.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  return handleApiRequest(req, res);
}
