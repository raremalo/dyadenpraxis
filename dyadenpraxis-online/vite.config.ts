import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {},
      resolve: {
        alias: {
          '@': import.meta.dirname,
        }
      },
      build: {
        rolldownOptions: {
          output: {
            manualChunks(id) {
              if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router-dom')) {
                return 'vendor-react';
              }
              if (id.includes('node_modules/@supabase')) {
                return 'vendor-supabase';
              }
              if (id.includes('node_modules/lucide-react')) {
                return 'vendor-ui';
              }
              if (id.includes('node_modules/@daily-co')) {
                return 'vendor-daily';
              }
            },
          },
        },
      },
    };
});
