import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev: the API runs on :4000 and is proxied so the browser sees one origin.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { '/api': 'https://jalingo-football-management-system.onrender.com' } },
  build: { outDir: 'dist', sourcemap: true }
});
