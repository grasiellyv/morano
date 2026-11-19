import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";
import { createRequire } from "module";
import path from "path";

const require = createRequire(import.meta.url);
const serverOnlyEmpty = path.join(path.dirname(require.resolve("server-only")), "empty.js");

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  resolve: {
    alias: { "server-only": serverOnlyEmpty },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    css: false,
    // Valores fictícios só para os módulos que leem o ambiente ao carregar.
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "chave-publicavel-de-teste",
    },
  },
});
