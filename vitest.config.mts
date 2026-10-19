import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      // The real `server-only` package throws when imported outside a React Server Components build; unit tests run in plain Node.
      // tests/unit/static-boundaries.test.ts separately proves the real package throws and that every server module imports it.
      "server-only": path.resolve(import.meta.dirname, "tests/stubs/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.{ts,tsx}"],
    setupFiles: ["tests/setup.ts"],
    restoreMocks: true,
    unstubGlobals: true,
    unstubEnvs: true,
  },
});
