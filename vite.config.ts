import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    // ── Performance: Code Splitting ──────────────────────────────────────────
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            // Firebase SDK — loaded on auth init, not at first paint
            firebase: ['firebase/app', 'firebase/firestore', 'firebase/auth'],
            // Gemini AI SDK — heavy, only needed when AI operations run
            gemini: ['@google/genai'],
            // Motion/animation library
            motion: ['motion/react'],
            // React ecosystem
            'react-vendor': ['react', 'react-dom', 'react-redux', '@reduxjs/toolkit'],
          },
        },
      },
    },
    // ── Fix dynamic import warnings for Firebase modules ─────────────────────
    optimizeDeps: {
      include: [
        'firebase/app',
        'firebase/firestore',
        'firebase/auth',
      ],
    },
  };
});
