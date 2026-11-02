import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

// `import.meta.dirname` is the ESM-safe equivalent of `__dirname`
// (required by Vite's native config loader).
const rootDir = import.meta.dirname ?? path.resolve(process.cwd());

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': rootDir,
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch:
        process.env.DISABLE_HMR === 'true'
          ? null
          : {
              // Never watch dependency caches, build output or agent tooling caches,
              // otherwise they trigger constant full-page reloads.
              ignored: [
                '**/node_modules/**',
                '**/.git/**',
                '**/dist/**',
                '**/screenshots/**',
                '**/.cline-home/**',
                '**/*.log',
              ],
            },
    },
  };
});
