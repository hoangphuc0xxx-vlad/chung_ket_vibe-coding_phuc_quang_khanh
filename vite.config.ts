import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';

// Khi chạy `npm run dev`, phục vụ /api/ai bằng đúng mã của api/ai.js (trên Vercel nó chạy thành hàm riêng).
function apiDev(): Plugin {
  return {
    name: 'api-dev',
    configureServer(server) {
      const docBody = (req: import('http').IncomingMessage, gioiHan: number) =>
        new Promise<string>((xong) => {
          let raw = '';
          req.on('data', (c) => {
            raw += c;
            if (raw.length > gioiHan) req.destroy();
          });
          req.on('end', () => xong(raw));
          req.on('close', () => xong(raw));
        });

      server.middlewares.use('/api/ai', async (req, res) => {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        try {
          const raw = await docBody(req, 20000);
          const mod = await server.ssrLoadModule('/api/ai.js');
          const env = loadEnv(server.config.mode, process.cwd(), '');
          const kq = await mod.taoGoiY(JSON.parse(raw || '{}'), env);
          res.statusCode = kq.ok ? 200 : 502;
          res.end(JSON.stringify(kq));
        } catch {
          res.statusCode = 500;
          res.end(JSON.stringify({ ok: false, loi: 'Lỗi máy chủ' }));
        }
      });

      server.middlewares.use('/api/sync', async (req, res) => {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        try {
          const raw = req.method === 'POST' ? await docBody(req, 1000000) : '';
          const mod = await server.ssrLoadModule('/api/sync.js');
          const env = loadEnv(server.config.mode, process.cwd(), '');
          const ma = new URL(req.url ?? '/', 'http://x').searchParams.get('ma');
          const kq = await mod.dongBo(req.method, raw ? JSON.parse(raw) : null, env, ma);
          res.statusCode = kq.status;
          res.end(JSON.stringify(kq.json));
        } catch {
          res.statusCode = 500;
          res.end(JSON.stringify({ ok: false, loi: 'Lỗi máy chủ' }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), apiDev()],
  // @ts-expect-error cấu hình của Vitest
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
