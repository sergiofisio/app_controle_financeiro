"use server";

import { prisma } from "@/lib/prisma";
import { requireHouseholdContext } from "@/server/household-authz";
import { seedDefaultCategories } from "@/server/categories/defaults";

export type TransactionFilters = {
  q?: string;
  type?: string;
  accountId?: string;
  categoryId?: string;
  holderUserId?: string;
  origin?: string;
  from?: string;
  to?: string;
  minAmount?: string;
  maxAmount?: string;
  page?: number;
  pageSize?: number;
};

export async function listTransactions(filters: TransactionFilters = {}) {
  const { householdId } = await requireHouseholdContext();
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, filters.pageSize ?? 20));

  const where = {
    householdId,
    deletedAt: null,
    ...(filters.type ? { type: filters.type as never } : {}),
    ...(filters.accountId ? { accountId: filters.accountId } : {}),
    ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    ...(filters.holderUserId ? { holderUserId: filters.holderUserId } : {}),
    ...(filters.origin ? { origin: filters.origin as never } : {}),
    ...(filters.q
      ? {
          description: {
            contains: filters.q,
            mode: "insensitive" as const,
          },
        }
      : {}),
    ...(filters.from || filters.to
      ? {
          movementDate: {
            ...(filters.from ? { gte: new Date(filters.from) } : {}),
            ...(filters.to ? { lte: new Date(filters.to) } : {}),
          },
        }
      : {}),
  };

  const [total, items] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where,
      include: {
        category: true,
        account: true,
        creditCard: true,
        createdBy: { select: { id: true, name: true } },
        transferGroup: true,
      },
      orderBy: [{ movementDate: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return { items, total, page, pageSize, pageCount: Math.ceil(total / pageSize) };
}

export async function listCategories(kind?: "INCOME" | "EXPENSE") {
  const { householdId } = await requireHouseholdContext();
  await seedDefaultCategories(prisma, householdId);
  return prisma.category.findMany({
    where: {
      householdId,
      isActive: true,
      ...(kind ? { kind } : {}),
    },
    orderBy: { name: "asc" },
  });
}

export async function listHouseholdMembersForSelect() {
  const { householdId } = await requireHouseholdContext();
  return prisma.householdMember.findMany({
    where: { householdId },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}
