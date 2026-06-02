import { access } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const distDir = join(root, 'dist');
const indexHtml = join(distDir, 'index.html');

try {
  await access(indexHtml);
  console.log(`Vercel static output verified: ${indexHtml}`);
} catch {
  console.error(`Missing Vercel output: expected ${indexHtml} after build:web`);
  process.exit(1);
}
