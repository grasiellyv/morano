import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O E2E usa outra pasta de build para não colidir com um `next dev` já aberto na porta 3000.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
