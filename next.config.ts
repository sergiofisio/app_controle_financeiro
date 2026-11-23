import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components exige Suspense em toda leitura de sessão.
  // Mantemos desligado na Fase 1 para auth/household estáveis com Better Auth.
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
