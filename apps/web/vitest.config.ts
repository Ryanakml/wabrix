import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    exclude: ["node_modules", "**/e2e/**/*.spec.ts"],
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
