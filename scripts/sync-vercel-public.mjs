import { cp, mkdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const webPublic = join(root, 'packages', 'web', 'public');
const rootPublic = join(root, 'public');

await rm(rootPublic, { recursive: true, force: true });
await mkdir(rootPublic, { recursive: true });
await cp(webPublic, rootPublic, { recursive: true });

console.log('Synced Vercel output fallback: packages/web/public -> public');
