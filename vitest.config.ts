import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    exclude: ["tests/e2e/**/*", "node_modules/**/*"],
    reporters: ["default", "./tests/reporter.ts"],
    hookTimeout: 60000, // 60s for DB setup operations
    testTimeout: 30000, // 30s for individual tests
    // Run test files sequentially to avoid Neon connection pool exhaustion
    fileParallelism: false,
    // Use forks pool for better isolation
    pool: 'forks',
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/", "dist/", "tests/"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client/src"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
});
