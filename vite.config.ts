import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' so the built app works from any folder or sub-path (GitHub Pages, USB stick, friend's PC)
export default defineConfig({
  plugins: [react()],
  base: './',
});
