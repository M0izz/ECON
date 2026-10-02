import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

function nansenDevProxy() {
  return {
    name: 'nansen-dev-proxy',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (!req.url?.startsWith('/api/nansen/')) return next();

        const endpoint = req.url.replace('/api/nansen/', '').split('?')[0];
        const apiKey = process.env.NANSEN_API_KEY;

        if (req.method === 'POST') {
          let bodyStr = '';
          req.on('data', (chunk: any) => {
            bodyStr += chunk;
          });

          req.on('end', async () => {
            if (!apiKey || apiKey.trim() === '') {
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  available: false,
                  source: 'nansen',
                  error: 'NANSEN_API_KEY is not configured in .env on the server.',
                })
              );
              return;
            }

            try {
              const body = JSON.parse(bodyStr || '{}');
              let nansenEndpoint = `address/${endpoint}`;
              if (endpoint === 'profile') {
                nansenEndpoint = 'address/labels';
              }

              const nansenRes = await fetch(`https://api.nansen.ai/api/v1/profiler/${nansenEndpoint}`, {
                method: 'POST',
                headers: {
                  apikey: apiKey,
                  'Content-Type': 'application/json',
                  Accept: 'application/json',
                },
                body: JSON.stringify(body),
              });

              const status = nansenRes.status;
              const json = await nansenRes.json().catch(() => ({}));

              res.setHeader('Content-Type', 'application/json');
              res.statusCode = status;
              res.end(
                JSON.stringify({
                  available: nansenRes.ok,
                  data: json,
                  source: 'nansen',
                })
              );
            } catch (err: any) {
              res.statusCode = 503;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  available: false,
                  error: err.message || 'Nansen API request failed',
                  source: 'nansen',
                })
              );
            }
          });
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  if (env.NANSEN_API_KEY && !process.env.NANSEN_API_KEY) {
    process.env.NANSEN_API_KEY = env.NANSEN_API_KEY;
  }

  return {
    plugins: [react(), nansenDevProxy()],
    resolve: {
      alias: {
        '@wagmi/core/tempo': path.resolve(__dirname, './src/config/tempo-shim.ts'),
        '@econ/sdk': path.resolve(__dirname, './src/sdk/index.ts'),
        '@econ/settlement': path.resolve(__dirname, './src/settlement/index.ts'),
        '@econ/demo': path.resolve(__dirname, './src/demo/index.ts'),
        '@econ/nansen': path.resolve(__dirname, './src/integrations/nansen/index.ts'),
      },
    },
    server: {
      port: 5173,
      host: true,
    },
  };
});
