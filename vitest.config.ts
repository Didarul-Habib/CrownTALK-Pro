import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: false,
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    exclude: ["tests-e2e/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
