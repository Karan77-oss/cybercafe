import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const rawTarget = env.VITE_API_URL || 'http://localhost:4000';
  const targetBackend = rawTarget.replace(/\/api\/?$/, '').replace(/\/+$/, '') || 'http://localhost:4000';

  return {
    plugins: [react()],
    server: {
      host: true,
      port: 5176,
      proxy: {
        '/api': {
          target: targetBackend,
          changeOrigin: true,
          secure: false,
        }
      }
    }
  };
});
