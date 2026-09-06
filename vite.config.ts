import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, Plugin} from 'vite';

function googleSheetsProxyPlugin(): Plugin {
  return {
    name: 'google-sheets-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url && req.url.startsWith('/api/proxy-sheet')) {
          try {
            const urlObj = new URL(req.url, 'http://localhost:3000');
            let targetUrl = urlObj.searchParams.get('url');
            if (!targetUrl) {
              res.statusCode = 400;
              res.end('Missing url parameter');
              return;
            }
            if (targetUrl.includes('docs.google.com/spreadsheets')) {
              const match = targetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
              if (match) {
                targetUrl = `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`;
              }
            }
            const fetchRes = await fetch(targetUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              },
            });
            const buffer = await fetchRes.arrayBuffer();
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Content-Type', fetchRes.headers.get('content-type') || 'text/csv; charset=utf-8');
            res.end(Buffer.from(buffer));
          } catch (err: any) {
            res.statusCode = 500;
            res.end(err?.message || 'Failed to fetch sheet');
          }
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), googleSheetsProxyPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
