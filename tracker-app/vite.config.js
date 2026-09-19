import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function localDataPlugin() {
  const dataDir = path.resolve(__dirname, 'data');
  const dataFile = path.resolve(dataDir, 'database.json');

  const handler = (req, res, next) => {
    const url = req.url ? req.url.split('?')[0] : '';
    if (url === '/api/data') {
      if (req.method === 'GET') {
        try {
          if (fs.existsSync(dataFile)) {
            const content = fs.readFileSync(dataFile, 'utf8');
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.statusCode = 200;
            res.end(content);
            return;
          } else {
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.statusCode = 200;
            res.end(JSON.stringify({ folders: [], tests: [] }));
            return;
          }
        } catch (err) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ error: err.message }));
          return;
        }
      }

      if (req.method === 'POST') {
        try {
          const chunks = [];
          req.on('data', chunk => chunks.push(chunk));
          req.on('end', () => {
            try {
              const body = Buffer.concat(chunks).toString('utf8');
              const parsed = JSON.parse(body);
              if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
              }
              fs.writeFileSync(dataFile, JSON.stringify(parsed, null, 2), 'utf8');
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true, count: parsed.tests?.length || 0 }));
            } catch (e) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ error: 'Failed parsing JSON payload: ' + e.message }));
            }
          });
          return;
        } catch (err) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ error: err.message }));
          return;
        }
      }
    }
    next();
  };

  return {
    name: 'local-data-api',
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), localDataPlugin()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api/auth': 'http://localhost:5000',
      '/api/folders': 'http://localhost:5000',
      '/api/tests': 'http://localhost:5000',
      '/api/sync': 'http://localhost:5000',
      '/api/health': 'http://localhost:5000'
    }
  }
});
