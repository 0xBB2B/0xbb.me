import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { htmlPlugin } from './plugins/htmlPlugin';

export default defineConfig({
  base: './',
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react(), htmlPlugin()],
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        game: path.resolve(__dirname, 'game/index.html'),
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
