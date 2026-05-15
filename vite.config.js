import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  server: {
    port: 5173,
    open: true,
  },
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 720,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) {
            return 'three';
          }
          if (
            id.includes('/simulation/') ||
            id.includes('roomLayer') ||
            id.includes('guidedIntro') ||
            id.includes('assetLoader')
          ) {
            return 'simulation';
          }
        },
      },
    },
  },
});
