"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  AccountType,
  HolderKind,
  ImportBatchStatus,
  ImportRowStatus,
  TxStatus,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { parseBRLInput } from "@/lib/money";
import { requireHouseholdContext } from "@/server/household-authz";

const accountSchema = z.object({
  name: z.string().min(2).max(80),
  institution: z.string().max(80).optional(),
  type: z.nativeEnum(AccountType),
  holderKind: z.nativeEnum(HolderKind),
  holderUserId: z.string().optional().nullable(),
  initialBalance: z.string().min(1),
  initialBalanceDate: z.string().min(1),
  notes: z.string().max(500).optional(),
});

export async function createAccountAction(formData: FormData) {
  const { householdId } = await requireHouseholdContext();
  const parsed = accountSchema.safeParse({
    name: formData.get("name"),
    institution: formData.get("institution") || undefined,
    type: formData.get("type"),
    holderKind: formData.get("holderKind"),
    holderUserId: formData.get("holderUserId") || null,
    initialBalance: formData.get("initialBalance"),
    initialBalanceDate: formData.get("initialBalanceDate"),
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  let initialBalance;
  try {
    initialBalance = parseBRLInput(parsed.data.initialBalance);
  } catch {
    return { error: "Saldo inicial inválido" };
  }

  await prisma.financialAccount.create({
    data: {
      householdId,
      name: parsed.data.name,
      institution: parsed.data.institution,
      type: parsed.data.type,
      holderKind: parsed.data.holderKind,
      holderUserId:
        parsed.data.holderKind === HolderKind.MEMBER
          ? parsed.data.holderUserId
          : null,
      initialBalance,
      initialBalanceDate: new Date(parsed.data.initialBalanceDate),
      notes: parsed.data.notes,
    },
  });

  revalidatePath("/contas");
  revalidatePath("/");
  return { ok: true };
}

export async function updateAccountAction(id: string, formData: FormData) {
  const { householdId } = await requireHouseholdContext();
  const existing = await prisma.financialAccount.findFirst({
    where: { id, householdId, deletedAt: null },
  });
  if (!existing) return { error: "Conta não encontrada" };

  const parsed = accountSchema.safeParse({
    name: formData.get("name"),
    institution: formData.get("institution") || undefined,
    type: formData.get("type"),
    holderKind: formData.get("holderKind"),
    holderUserId: formData.get("holderUserId") || null,
    initialBalance: formData.get("initialBalance"),
    initialBalanceDate: formData.get("initialBalanceDate"),
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  let initialBalance;
  try {
    initialBalance = parseBRLInput(parsed.data.initialBalance);
  } catch {
    return { error: "Saldo inicial inválido" };
  }

  await prisma.financialAccount.update({
    where: { id },
    data: {
      name: parsed.data.name,
      institution: parsed.data.institution,
      type: parsed.data.type,
      holderKind: parsed.data.holderKind,
      holderUserId:
        parsed.data.holderKind === HolderKind.MEMBER
          ? parsed.data.holderUserId
          : null,
      initialBalance,
      initialBalanceDate: new Date(parsed.data.initialBalanceDate),
      notes: parsed.data.notes,
      isActive: formData.get("isActive") !== "false",
    },
  });

  revalidatePath("/contas");
  revalidatePath("/");
  return { ok: true };
}

export async function softDeleteAccountAction(id: string) {
  const { householdId } = await requireHouseholdContext();
  await prisma.financialAccount.updateMany({
    where: { id, householdId, deletedAt: null },
    data: { deletedAt: new Date(), isActive: false },
  });
  revalidatePath("/contas");
  return { ok: true };
}

/** Limpa lançamentos e importações da conta; zera saldos. Mantém o cadastro. */
export async function resetFinancialAccountAction(accountId: string) {
  const { householdId, userId } = await requireHouseholdContext();
  const account = await prisma.financialAccount.findFirst({
    where: { id: accountId, householdId, deletedAt: null },
  });
  if (!account) return { error: "Conta não encontrada" };

  const now = new Date();

  await prisma.$transaction(
    async (tx) => {
      await tx.transaction.updateMany({
        where: {
          householdId,
          accountId,
          deletedAt: null,
        },
        data: {
          deletedAt: now,
          status: TxStatus.CANCELLED,
          updatedById: userId,
        },
      });

      await tx.importBatch.updateMany({
        where: {
          householdId,
          accountId,
          status: { not: ImportBatchStatus.REVERTED },
        },
        data: {
          status: ImportBatchStatus.REVERTED,
          revertedAt: now,
        },
      });

      await tx.importRow.updateMany({
        where: {
          batch: { householdId, accountId },
          status: {
            in: [
              ImportRowStatus.IMPORTED,
              ImportRowStatus.READY,
              ImportRowStatus.PENDING,
              ImportRowStatus.NEEDS_REVIEW,
              ImportRowStatus.DUPLICATE,
            ],
          },
        },
        data: { status: ImportRowStatus.SKIPPED },
      });

      await tx.financialAccount.update({
        where: { id: accountId },
        data: {
          initialBalance: 0,
          initialBalanceDate: now,
          statedBalance: null,
          statedBalanceAt: null,
          lastReconciledAt: null,
        },
      });
    },
    { timeout: 60_000 },
  );

  revalidatePath("/contas");
  revalidatePath("/lancamentos");
  revalidatePath("/importar");
  revalidatePath("/");
  return { ok: true };
}
