import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = join(root, 'public');

const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Mini Apty API</title>
    <meta http-equiv="refresh" content="0;url=/health" />
  </head>
  <body>
    <p>Mini Apty API — <a href="/health">health check</a></p>
  </body>
</html>
`;

await mkdir(publicDir, { recursive: true });
await writeFile(join(publicDir, 'index.html'), html, 'utf8');
console.log('Prepared Vercel output directory: public/index.html');
