import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig, loadEnv} from 'vite';

// Automatically copy generated PWA icon to /public/ folder
const sourceIcon = path.resolve(__dirname, 'src/assets/images/pwa_icon_512_1780450802351.png');
const publicDir = path.resolve(__dirname, 'public');
const destIcon512 = path.join(publicDir, 'icon-512.png');
const destIcon192 = path.join(publicDir, 'icon-192.png');

try {
  if (fs.existsSync(sourceIcon)) {
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    fs.copyFileSync(sourceIcon, destIcon512);
    fs.copyFileSync(sourceIcon, destIcon192);
    console.log(' PWA icons copied successfully from assets to public folder!');
  } else {
    console.warn('⚠️ Source PWA icon not found at: ' + sourceIcon);
  }
} catch (e) {
  console.error('❌ Failed to copy PWA icons:', e);
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
