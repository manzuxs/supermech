import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { supermechWatcherPlugin } from '@supermech/runtime/vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const dirname = import.meta.dirname ?? fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(dirname, './src'),
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    supermechWatcherPlugin({
      basePlanDir: resolve(dirname, '../../.supermech'),
    }),
  ],
  server: {
    watch: {
      ignored: ['**/node_modules/**', '**/.git/**', '**/dist/**'],
    },
  },
});
