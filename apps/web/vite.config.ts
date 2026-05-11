import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { superpowersWatcherPlugin } from 'watcher';

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
    superpowersWatcherPlugin({
      statePath: resolve(dirname, '../../state.json'),
      basePlanDir: resolve(dirname, '../../docs/superpowers-plus'),
    }),
  ],
  server: {
    watch: {
      ignored: ['**/node_modules/**', '**/.git/**', '**/dist/**'],
    },
  },
});
