"use server";

import { prisma } from "@/lib/prisma";
import { calculateBalance, decimalToNumber, subMoney } from "@/lib/money";
import type { TxType } from "@/lib/money/tx-types";
import { requireHouseholdContext } from "@/server/household-authz";

export async function listImportBatches() {
  const { householdId } = await requireHouseholdContext();
  return prisma.importBatch.findMany({
    where: { householdId },
    include: {
      account: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function getImportBatch(batchId: string) {
  const { householdId } = await requireHouseholdContext();
  return prisma.importBatch.findFirst({
    where: { id: batchId, householdId },
    include: {
      account: true,
      rows: { orderBy: { lineNumber: "asc" } },
      createdBy: { select: { name: true } },
    },
  });
}

export async function listImportMappings() {
  const { householdId } = await requireHouseholdContext();
  return prisma.importMapping.findMany({
    where: { householdId },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getAccountReconciliation(accountId: string) {
  const { householdId } = await requireHouseholdContext();
  const account = await prisma.financialAccount.findFirst({
    where: { id: accountId, householdId, deletedAt: null },
  });
  if (!account) return null;

  const txs = await prisma.transaction.findMany({
    where: {
      householdId,
      accountId,
      deletedAt: null,
      status: { in: ["CLEARED", "PENDING"] },
    },
    select: {
      type: true,
      amount: true,
      transferGroup: {
        select: { fromAccountId: true, toAccountId: true },
      },
    },
  });

  const calculated = calculateBalance(
    account.initialBalance,
    txs.map((t) => {
      let transferDirection: "OUT" | "IN" | undefined;
      if (t.type === "TRANSFER" && t.transferGroup) {
        transferDirection =
          t.transferGroup.fromAccountId === accountId ? "OUT" : "IN";
      } else if (t.type === "TRANSFER") {
        transferDirection = "OUT";
      }
      return {
        type: t.type as TxType,
        amount: t.amount,
        transferDirection,
      };
    }),
  );

  const stated = account.statedBalance;
  const difference =
    stated != null ? subMoney(stated, calculated) : null;

  return {
    account,
    calculatedBalance: calculated,
    statedBalance: stated,
    difference,
    differenceNumber: difference ? decimalToNumber(difference) : null,
  };
}
