import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

const repoRoot = resolve(__dirname, '../..');

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, repoRoot, '');

  const apiProxy = {
    '/api': {
      target: env.VITE_API_BASE_URL || 'http://localhost:3001',
      changeOrigin: true,
      rewrite: (path: string) => path.replace(/^\/api/, ''),
    },
  };

  return {
    envDir: repoRoot,
    plugins: [react()],
    server: {
      proxy: apiProxy,
    },
    preview: {
      proxy: apiProxy,
    },
    build: {
      outDir: resolve(repoRoot, 'dist'),
      emptyOutDir: true,
    },
  };
});
