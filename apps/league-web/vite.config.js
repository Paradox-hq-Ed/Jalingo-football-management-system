import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Served at /league/ when the API process hosts the built apps.
export default defineConfig({
  // base: '/league/',
  plugins: [react()],
  server: { port: 5174, proxy: { '/api': 'https://jalingo-football-management-system.onrender.com' } },
  build: { outDir: 'dist', sourcemap: true }
});
