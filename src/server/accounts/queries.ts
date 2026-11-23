"use server";

import { prisma } from "@/lib/prisma";
import { calculateBalance } from "@/lib/money";
import { requireHouseholdContext } from "@/server/household-authz";
import type { TxType } from "@/lib/money/tx-types";

export async function listAccountsWithBalances() {
  const { householdId } = await requireHouseholdContext();
  const accounts = await prisma.financialAccount.findMany({
    where: { householdId, deletedAt: null },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  const txs = await prisma.transaction.findMany({
    where: {
      householdId,
      deletedAt: null,
      status: { in: ["CLEARED", "PENDING"] },
      accountId: { in: accounts.map((a) => a.id) },
      OR: [
        { type: { not: "TRANSFER" } },
        { type: "TRANSFER" },
      ],
    },
    select: {
      accountId: true,
      type: true,
      amount: true,
      transferGroup: {
        select: { fromAccountId: true, toAccountId: true },
      },
    },
  });

  return accounts.map((account) => {
    const movements = txs
      .filter((t) => t.accountId === account.id)
      .map((t) => {
        let transferDirection: "OUT" | "IN" | undefined;
        if (t.type === "TRANSFER" && t.transferGroup) {
          transferDirection =
            t.transferGroup.fromAccountId === account.id ? "OUT" : "IN";
        }
        // Compras no cartão não afetam saldo da conta bancária
        if (t.type === "EXPENSE" && !t.accountId) {
          return null;
        }
        return {
          type: t.type as TxType,
          amount: t.amount,
          transferDirection,
        };
      })
      .filter(Boolean) as Array<{
      type: TxType;
      amount: typeof txs[0]["amount"];
      transferDirection?: "OUT" | "IN";
    }>;

    const balance = calculateBalance(account.initialBalance, movements);
    return { ...account, balance };
  });
}

export async function listActiveAccounts() {
  const { householdId } = await requireHouseholdContext();
  return prisma.financialAccount.findMany({
    where: { householdId, deletedAt: null, isActive: true },
    orderBy: { name: "asc" },
  });
}
