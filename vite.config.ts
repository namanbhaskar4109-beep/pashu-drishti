import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';
import { handleApiRequest } from './server/api';

function pashuDrishtiApiPlugin(): Plugin {
  return {
    name: 'pashu-drishti-backend-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url?.startsWith('/api/')) {
          // Check if FastAPI backend (http://127.0.0.1:8000) is running
          let fastApiRunning = false;
          try {
            const check = await fetch('http://127.0.0.1:8000/api/health', {
              signal: AbortSignal.timeout(300)
            });
            fastApiRunning = check.ok;
          } catch {
            fastApiRunning = false;
          }

          if (fastApiRunning) {
            // FastAPI backend is active on port 8000, delegate to Vite proxy
            return next();
          }

          // Fallback to local middleware when FastAPI is not active
          try {
            const handled = await handleApiRequest(req, res);
            if (handled) return;
          } catch (err) {
            console.error('API Middleware Exception:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Server middleware exception' }));
            return;
          }
        }
        next();
      });
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    pashuDrishtiApiPlugin()
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 5173,
    open: false,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true
      }
    }
  }
});
