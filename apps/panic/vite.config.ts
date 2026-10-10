import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type ProxyOptions } from "vite";

// The phone in the panic box loads this app from the camera laptop over the
// LAN. The browser only ever calls /api/*; this proxy forwards it to apps/ai
// and adds the shared key there, so the key stays on the laptop.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const target = env.AI_SERVICE_URL ?? "http://localhost:8001";
  const apiKey = env.AI_SERVICE_API_KEY ?? "dev-ai-pipeline-shared-secret-change-me";

  const proxy: Record<string, ProxyOptions> = {
    "/api/health": { target, changeOrigin: true, rewrite: () => "/health" },
    "/api/panic": {
      target,
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api\/panic/, "/stream/panic"),
      headers: { "X-Internal-Api-Key": apiKey },
      // POST /stream/panic waits for a camera frame (up to ~20s if the
      // pipeline has to start first).
      timeout: 30_000,
      proxyTimeout: 30_000,
    },
  };

  return {
    plugins: [react()],
    // host: reachable from the phone, not just localhost.
    server: { host: true, port: 3002, strictPort: true, proxy },
    preview: { host: true, port: 3002, strictPort: true, proxy },
  };
});
