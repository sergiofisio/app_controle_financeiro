import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Config canônica do Prisma 7.
 * URL fica aqui — não no schema.prisma.
 * Preferimos DIRECT_URL (session pooler / direct) para CLI e migrations.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DIRECT_URL"] || process.env["DATABASE_URL"],
  },
});
