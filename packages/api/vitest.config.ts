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
    // Regexes, not string keys: a string alias also matches as a prefix, so
    // "@Sentinel360/db" turned "@Sentinel360/db/schema/auth" into
    // ".../db/src/index.ts/schema/auth".
    alias: [
      { find: /^@Sentinel360\/auth$/, replacement: path.resolve(root, "packages/auth/src/index.ts") },
      { find: /^@Sentinel360\/db$/, replacement: path.resolve(root, "packages/db/src/index.ts") },
      { find: /^@Sentinel360\/env\/server$/, replacement: path.resolve(root, "packages/env/src/server.ts") },
      { find: /^@Sentinel360\/db\/schema\/(.+)$/, replacement: path.resolve(root, "packages/db/src/schema/$1.ts") },
      { find: /^@Sentinel360\/db\/schema$/, replacement: path.resolve(root, "packages/db/src/schema") },
    ],
  },
});
