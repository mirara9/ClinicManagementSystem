import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/**/*.test.ts"],
    environment: "node"
  },
  resolve: {
    alias: {
      "@usrahmedic/domain": new URL("./packages/domain/src/index.ts", import.meta.url).pathname
    }
  }
});
