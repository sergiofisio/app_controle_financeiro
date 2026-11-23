import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const BUILD_PLACEHOLDER =
  "postgresql://postgres:postgres@127.0.0.1:5432/postgres?sslmode=disable";

function resolveConnectionString() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  // Permite `next build` sem credenciais reais; queries em runtime ainda falham se vazio.
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return BUILD_PLACEHOLDER;
  }

  throw new Error(
    "DATABASE_URL não configurada. Preencha .env com a URL do pooler Supabase (porta 6543 + pgbouncer=true).",
  );
}

function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: resolveConnectionString(),
  });
  return new PrismaClient({ adapter });
}

function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrisma();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
