import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_ACTIONS ? '/tamaradesigner/' : '/',
  optimizeDeps: {
    exclude: ['lucide-react']
  },
  server: {
    host: '0.0.0.0',
  },
});
