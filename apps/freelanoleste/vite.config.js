import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const appDir = path.dirname(fileURLToPath(import.meta.url));

function firebaseDefines(mode) {
  const env = loadEnv(mode, appDir, '');
  const pick = (key) => env[`VITE_${key}`] || env[key] || '';
  const keys = [
    'FIREBASE_API_KEY',
    'FIREBASE_AUTH_DOMAIN',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_STORAGE_BUCKET',
    'FIREBASE_MESSAGING_SENDER_ID',
    'FIREBASE_APP_ID',
  ];
  return Object.fromEntries(
    keys.flatMap((key) => {
      const value = JSON.stringify(pick(key));
      return [
        [`import.meta.env.${key}`, value],
        [`import.meta.env.VITE_${key}`, value],
      ];
    })
  );
}

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  envDir: appDir,
  envPrefix: ['VITE_', 'FIREBASE_'],
  define: firebaseDefines(mode),
  server: {
    port: 5174,
  },
}));
