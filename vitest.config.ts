import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    exclude: [
      "**/node_modules/**",
      "**/.next/**",
    ],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname),
    },
  },
});
