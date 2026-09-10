import path from 'path';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { htmlPlugin } from './plugins/htmlPlugin';

export default defineConfig({
  base: './',
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react(), htmlPlugin(), {
    name: 'portfolio-public-assets',
    generateBundle() {
      for (const fileName of ['profile-full.png', 'profile.png', 'profile.jpg', 'robots.txt', 'site-card.svg', 'sitemap.xml', 'THIRD_PARTY_NOTICES.txt']) {
        this.emitFile({ type: 'asset', fileName, source: readFileSync(path.resolve(__dirname, 'public', fileName)) });
      }
    },
  }],
  build: {
    copyPublicDir: false,
    rollupOptions: {
      input: path.resolve(__dirname, 'index.html'),
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
