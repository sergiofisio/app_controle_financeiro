"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  HolderKind,
  TxOrigin,
  TxStatus,
  TxType,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { parseBRLInput, splitInstallments, toDecimal } from "@/lib/money";
import {
  assertAccountInHousehold,
  assertCategoryInHousehold,
  requireHouseholdContext,
} from "@/server/household-authz";
import { seedDefaultCategories } from "@/server/categories/defaults";

const baseTxSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  amount: z.string().min(1),
  description: z.string().min(2).max(200),
  categoryId: z.string().optional().nullable(),
  accountId: z.string().min(1),
  holderKind: z.enum(["MEMBER", "HOUSEHOLD"]),
  holderUserId: z.string().optional().nullable(),
  movementDate: z.string().min(1),
  competenceDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  status: z.enum(["PENDING", "CLEARED", "SCHEDULED"]).default("CLEARED"),
  notes: z.string().max(500).optional().nullable(),
});

function revalidateFinance() {
  revalidatePath("/");
  revalidatePath("/lancamentos");
  revalidatePath("/contas");
  revalidatePath("/cartoes");
}

export async function ensureCategoriesAction() {
  const { householdId } = await requireHouseholdContext();
  await seedDefaultCategories(prisma, householdId);
  return { ok: true };
}

export async function createTransactionAction(formData: FormData) {
  const { householdId, userId } = await requireHouseholdContext();
  await seedDefaultCategories(prisma, householdId);

  const parsed = baseTxSchema.safeParse({
    type: formData.get("type"),
    amount: formData.get("amount"),
    description: formData.get("description"),
    categoryId: formData.get("categoryId") || null,
    accountId: formData.get("accountId"),
    holderKind: formData.get("holderKind") || "HOUSEHOLD",
    holderUserId: formData.get("holderUserId") || null,
    movementDate: formData.get("movementDate"),
    competenceDate: formData.get("competenceDate") || null,
    dueDate: formData.get("dueDate") || null,
    status: formData.get("status") || "CLEARED",
    notes: formData.get("notes") || null,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  let amount;
  try {
    amount = parseBRLInput(parsed.data.amount);
  } catch {
    return { error: "Valor inválido" };
  }
  if (amount.lte(0)) return { error: "Valor deve ser maior que zero" };

  await assertAccountInHousehold(parsed.data.accountId, householdId);
  if (parsed.data.categoryId) {
    const cat = await assertCategoryInHousehold(
      parsed.data.categoryId,
      householdId,
    );
    if (
      (parsed.data.type === "INCOME" && cat.kind !== "INCOME") ||
      (parsed.data.type === "EXPENSE" && cat.kind !== "EXPENSE")
    ) {
      return { error: "Categoria incompatível com o tipo do lançamento" };
    }
  }

  await prisma.transaction.create({
    data: {
      householdId,
      type: parsed.data.type as TxType,
      amount,
      description: parsed.data.description,
      categoryId: parsed.data.categoryId,
      accountId: parsed.data.accountId,
      holderKind: parsed.data.holderKind as HolderKind,
      holderUserId:
        parsed.data.holderKind === "MEMBER" ? parsed.data.holderUserId : null,
      movementDate: new Date(parsed.data.movementDate),
      competenceDate: parsed.data.competenceDate
        ? new Date(parsed.data.competenceDate)
        : new Date(parsed.data.movementDate),
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      status: parsed.data.status as TxStatus,
      origin: TxOrigin.MANUAL,
      notes: parsed.data.notes,
      createdById: userId,
      updatedById: userId,
    },
  });

  revalidateFinance();
  return { ok: true };
}

export async function createTransferAction(formData: FormData) {
  const { householdId, userId } = await requireHouseholdContext();
  const schema = z.object({
    amount: z.string().min(1),
    description: z.string().min(2).max(200),
    fromAccountId: z.string().min(1),
    toAccountId: z.string().min(1),
    movementDate: z.string().min(1),
  });
  const parsed = schema.safeParse({
    amount: formData.get("amount"),
    description: formData.get("description"),
    fromAccountId: formData.get("fromAccountId"),
    toAccountId: formData.get("toAccountId"),
    movementDate: formData.get("movementDate"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  if (parsed.data.fromAccountId === parsed.data.toAccountId) {
    return { error: "Contas de origem e destino devem ser diferentes" };
  }

  let amount;
  try {
    amount = parseBRLInput(parsed.data.amount);
  } catch {
    return { error: "Valor inválido" };
  }
  if (amount.lte(0)) return { error: "Valor deve ser maior que zero" };

  await assertAccountInHousehold(parsed.data.fromAccountId, householdId);
  await assertAccountInHousehold(parsed.data.toAccountId, householdId);

  const movementDate = new Date(parsed.data.movementDate);

  await prisma.$transaction(async (tx) => {
    const group = await tx.transferGroup.create({
      data: {
        householdId,
        fromAccountId: parsed.data.fromAccountId,
        toAccountId: parsed.data.toAccountId,
        amount,
        movementDate,
        description: parsed.data.description,
      },
    });

    await tx.transaction.createMany({
      data: [
        {
          householdId,
          type: TxType.TRANSFER,
          amount,
          description: parsed.data.description,
          accountId: parsed.data.fromAccountId,
          holderKind: HolderKind.HOUSEHOLD,
          movementDate,
          competenceDate: movementDate,
          status: TxStatus.CLEARED,
          origin: TxOrigin.TRANSFER,
          transferGroupId: group.id,
          createdById: userId,
          updatedById: userId,
        },
        {
          householdId,
          type: TxType.TRANSFER,
          amount,
          description: parsed.data.description,
          accountId: parsed.data.toAccountId,
          holderKind: HolderKind.HOUSEHOLD,
          movementDate,
          competenceDate: movementDate,
          status: TxStatus.CLEARED,
          origin: TxOrigin.TRANSFER,
          transferGroupId: group.id,
          createdById: userId,
          updatedById: userId,
        },
      ],
    });
  });

  revalidateFinance();
  return { ok: true };
}

export async function softDeleteTransactionAction(id: string) {
  const { householdId, userId } = await requireHouseholdContext();
  const tx = await prisma.transaction.findFirst({
    where: { id, householdId, deletedAt: null },
  });
  if (!tx) return { error: "Lançamento não encontrado" };

  if (tx.transferGroupId) {
    await prisma.transaction.updateMany({
      where: {
        householdId,
        transferGroupId: tx.transferGroupId,
        deletedAt: null,
      },
      data: { deletedAt: new Date(), status: TxStatus.CANCELLED, updatedById: userId },
    });
  } else if (tx.installmentGroupId) {
    await prisma.transaction.updateMany({
      where: {
        householdId,
        installmentGroupId: tx.installmentGroupId,
        deletedAt: null,
      },
      data: { deletedAt: new Date(), status: TxStatus.CANCELLED, updatedById: userId },
    });
  } else {
    await prisma.transaction.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: TxStatus.CANCELLED,
        updatedById: userId,
      },
    });
  }

  revalidateFinance();
  return { ok: true };
}

export async function duplicateTransactionAction(id: string) {
  const { householdId, userId } = await requireHouseholdContext();
  const source = await prisma.transaction.findFirst({
    where: { id, householdId, deletedAt: null },
  });
  if (!source) return { error: "Lançamento não encontrado" };
  if (source.type === "TRANSFER") {
    return { error: "Duplique transferências pela tela de transferência" };
  }

  await prisma.transaction.create({
    data: {
      householdId,
      type: source.type,
      amount: toDecimal(source.amount),
      description: `${source.description} (cópia)`,
      categoryId: source.categoryId,
      accountId: source.accountId,
      creditCardId: source.creditCardId,
      holderKind: source.holderKind,
      holderUserId: source.holderUserId,
      movementDate: source.movementDate,
      competenceDate: source.competenceDate,
      dueDate: source.dueDate,
      status: source.status,
      origin: TxOrigin.MANUAL,
      notes: source.notes,
      createdById: userId,
      updatedById: userId,
    },
  });

  revalidateFinance();
  return { ok: true };
}

export async function createCardPurchaseAction(formData: FormData) {
  const { householdId, userId } = await requireHouseholdContext();
  await seedDefaultCategories(prisma, householdId);

  const schema = z.object({
    creditCardId: z.string().min(1),
    amount: z.string().min(1),
    description: z.string().min(2).max(200),
    categoryId: z.string().optional().nullable(),
    movementDate: z.string().min(1),
    installments: z.coerce.number().int().min(1).max(48).default(1),
    holderKind: z.enum(["MEMBER", "HOUSEHOLD"]).default("HOUSEHOLD"),
    holderUserId: z.string().optional().nullable(),
    notes: z.string().max(500).optional().nullable(),
  });

  const parsed = schema.safeParse({
    creditCardId: formData.get("creditCardId"),
    amount: formData.get("amount"),
    description: formData.get("description"),
    categoryId: formData.get("categoryId") || null,
    movementDate: formData.get("movementDate"),
    installments: formData.get("installments") || 1,
    holderKind: formData.get("holderKind") || "HOUSEHOLD",
    holderUserId: formData.get("holderUserId") || null,
    notes: formData.get("notes") || null,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  let amount;
  try {
    amount = parseBRLInput(parsed.data.amount);
  } catch {
    return { error: "Valor inválido" };
  }
  if (amount.lte(0)) return { error: "Valor deve ser maior que zero" };

  const card = await prisma.creditCard.findFirst({
    where: {
      id: parsed.data.creditCardId,
      householdId,
      deletedAt: null,
    },
  });
  if (!card) return { error: "Cartão não encontrado" };

  const parts = splitInstallments(amount, parsed.data.installments);
  const installmentGroupId =
    parsed.data.installments > 1 ? randomUUID() : null;
  const purchaseDate = new Date(parsed.data.movementDate);

  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < parts.length; i++) {
      const competence = new Date(purchaseDate);
      competence.setMonth(competence.getMonth() + i);

      const invoice = await ensureInvoiceForPurchase(
        tx,
        householdId,
        card.id,
        card.closingDay,
        card.dueDay,
        competence,
      );

      await tx.transaction.create({
        data: {
          householdId,
          type: TxType.EXPENSE,
          amount: parts[i]!,
          description:
            parts.length > 1
              ? `${parsed.data.description} (${i + 1}/${parts.length})`
              : parsed.data.description,
          categoryId: parsed.data.categoryId,
          creditCardId: card.id,
          invoiceId: invoice.id,
          accountId: null,
          holderKind: parsed.data.holderKind as HolderKind,
          holderUserId:
            parsed.data.holderKind === "MEMBER"
              ? parsed.data.holderUserId
              : null,
          movementDate: purchaseDate,
          competenceDate: competence,
          dueDate: invoice.dueDate,
          status: TxStatus.CLEARED,
          origin: TxOrigin.CARD,
          notes: parsed.data.notes,
          installmentGroupId,
          installmentNumber: parts.length > 1 ? i + 1 : null,
          installmentTotal: parts.length > 1 ? parts.length : null,
          createdById: userId,
          updatedById: userId,
        },
      });
    }
  });

  revalidateFinance();
  return { ok: true };
}

async function ensureInvoiceForPurchase(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  householdId: string,
  creditCardId: string,
  closingDay: number,
  dueDay: number,
  competenceDate: Date,
) {
  const year = competenceDate.getUTCFullYear();
  const month = competenceDate.getUTCMonth();
  const day = competenceDate.getUTCDate();

  let refYear = year;
  let refMonth = month;
  if (day > closingDay) {
    refMonth += 1;
    if (refMonth > 11) {
      refMonth = 0;
      refYear += 1;
    }
  }

  const referenceMonth = new Date(Date.UTC(refYear, refMonth, 1));
  const closingDate = new Date(Date.UTC(refYear, refMonth, closingDay));
  let dueMonth = refMonth;
  let dueYear = refYear;
  if (dueDay <= closingDay) {
    dueMonth += 1;
    if (dueMonth > 11) {
      dueMonth = 0;
      dueYear += 1;
    }
  }
  const dueDate = new Date(Date.UTC(dueYear, dueMonth, dueDay));

  const existing = await tx.creditCardInvoice.findUnique({
    where: {
      creditCardId_referenceMonth: { creditCardId, referenceMonth },
    },
  });
  if (existing) return existing;

  return tx.creditCardInvoice.create({
    data: {
      householdId,
      creditCardId,
      referenceMonth,
      closingDate,
      dueDate,
      status: "OPEN",
    },
  });
}
