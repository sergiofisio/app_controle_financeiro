import type { PrismaClient } from "@/generated/prisma/client";
import { CategoryKind } from "@/generated/prisma/client";

const INCOME = [
  "Salário",
  "Honorários profissionais",
  "Serviços",
  "Comissões",
  "Aluguéis",
  "Receitas extraordinárias",
  "Outros recebimentos",
];

const EXPENSE = [
  "Moradia",
  "Supermercado",
  "Alimentação",
  "Transporte",
  "Saúde",
  "Educação",
  "Academia",
  "Lazer",
  "Restaurantes",
  "Viagens",
  "Vestuário",
  "Impostos",
  "Seguros",
  "Assinaturas",
  "Serviços",
  "Outras despesas",
];

export async function seedDefaultCategories(
  tx: PrismaClient | Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0],
  householdId: string,
) {
  const existing = await tx.category.count({ where: { householdId } });
  if (existing > 0) return;

  await tx.category.createMany({
    data: [
      ...INCOME.map((name) => ({
        householdId,
        kind: CategoryKind.INCOME,
        name,
        isSystem: true,
      })),
      ...EXPENSE.map((name) => ({
        householdId,
        kind: CategoryKind.EXPENSE,
        name,
        isSystem: true,
      })),
    ],
  });
}
