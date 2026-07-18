import { defineConfig } from "vitest/config";
import path from "path";

const root = path.resolve(__dirname, "../..");

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/__tests__/**/*.test.ts"],
    exclude: ["node_modules", "dist"],
    setupFiles: ["src/__tests__/setup.ts"],
    testTimeout: 10000,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.d.ts", "src/__tests__/**"],
    },
  },
  resolve: {
    alias: {
      "@Sentinel360/auth": path.resolve(root, "packages/auth/src/index.ts"),
      "@Sentinel360/db": path.resolve(root, "packages/db/src/index.ts"),
      "@Sentinel360/env/server": path.resolve(root, "packages/env/src/server.ts"),
      "@Sentinel360/db/schema": path.resolve(root, "packages/db/src/schema"),
      "@Sentinel360/db/schema/auth": path.resolve(root, "packages/db/src/schema/auth.ts"),
      "@Sentinel360/db/schema/rbac": path.resolve(root, "packages/db/src/schema/rbac.ts"),
    },
  },
});
