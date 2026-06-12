import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// If you deploy to GitHub Pages under a subpath like
// https://<user>.github.io/<repo>/, set base to '/<repo>/'.
// For Vercel/Netlify or a custom domain, leave it as '/'.
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5173,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1500,
  },
});
