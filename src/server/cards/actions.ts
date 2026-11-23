"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { TxOrigin, TxStatus, TxType } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { addMoney, parseBRLInput, toDecimal } from "@/lib/money";
import {
  assertAccountInHousehold,
  assertCardInHousehold,
  requireHouseholdContext,
} from "@/server/household-authz";

const cardSchema = z.object({
  institution: z.string().min(2).max(80),
  name: z.string().min(2).max(80),
  holderUserId: z.string().optional().nullable(),
  creditLimit: z.string().min(1),
  closingDay: z.coerce.number().int().min(1).max(28),
  dueDay: z.coerce.number().int().min(1).max(28),
  notes: z.string().max(500).optional().nullable(),
});

export async function createCardAction(formData: FormData) {
  const { householdId } = await requireHouseholdContext();
  const parsed = cardSchema.safeParse({
    institution: formData.get("institution"),
    name: formData.get("name"),
    holderUserId: formData.get("holderUserId") || null,
    creditLimit: formData.get("creditLimit"),
    closingDay: formData.get("closingDay"),
    dueDay: formData.get("dueDay"),
    notes: formData.get("notes") || null,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  let creditLimit;
  try {
    creditLimit = parseBRLInput(parsed.data.creditLimit);
  } catch {
    return { error: "Limite inválido" };
  }

  await prisma.creditCard.create({
    data: {
      householdId,
      institution: parsed.data.institution,
      name: parsed.data.name,
      holderUserId: parsed.data.holderUserId,
      creditLimit,
      closingDay: parsed.data.closingDay,
      dueDay: parsed.data.dueDay,
      notes: parsed.data.notes,
    },
  });

  revalidatePath("/cartoes");
  return { ok: true };
}

export async function softDeleteCardAction(id: string) {
  const { householdId } = await requireHouseholdContext();
  await prisma.creditCard.updateMany({
    where: { id, householdId, deletedAt: null },
    data: { deletedAt: new Date(), isActive: false },
  });
  revalidatePath("/cartoes");
  return { ok: true };
}

/**
 * Pagamento de fatura: liquida obrigação, NÃO cria nova despesa operacional.
 * Gera lançamento TRANSFER/ADJUSTMENT na conta bancária (saída de caixa).
 */
export async function payInvoiceAction(formData: FormData) {
  const { householdId, userId } = await requireHouseholdContext();
  const schema = z.object({
    invoiceId: z.string().min(1),
    accountId: z.string().min(1),
    paymentDate: z.string().min(1),
    amount: z.string().optional().nullable(),
  });
  const parsed = schema.safeParse({
    invoiceId: formData.get("invoiceId"),
    accountId: formData.get("accountId"),
    paymentDate: formData.get("paymentDate"),
    amount: formData.get("amount") || null,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const invoice = await prisma.creditCardInvoice.findFirst({
    where: { id: parsed.data.invoiceId, householdId },
    include: {
      creditCard: true,
      purchases: {
        where: { deletedAt: null, status: { not: "CANCELLED" } },
      },
    },
  });
  if (!invoice) return { error: "Fatura não encontrada" };
  if (invoice.status === "PAID") return { error: "Fatura já está paga" };
  if (invoice.paymentTransactionId) {
    return { error: "Pagamento já registrado para esta fatura" };
  }

  await assertCardInHousehold(invoice.creditCardId, householdId);
  await assertAccountInHousehold(parsed.data.accountId, householdId);

  const total = invoice.purchases.reduce(
    (acc, p) => addMoney(acc, p.amount),
    toDecimal(0),
  );
  let payAmount = total;
  if (parsed.data.amount) {
    try {
      payAmount = parseBRLInput(parsed.data.amount);
    } catch {
      return { error: "Valor de pagamento inválido" };
    }
  }
  if (payAmount.lte(0)) return { error: "Valor deve ser maior que zero" };

  const paymentDate = new Date(parsed.data.paymentDate);

  await prisma.$transaction(async (tx) => {
    const payment = await tx.transaction.create({
      data: {
        householdId,
        type: TxType.TRANSFER,
        amount: payAmount,
        description: `Pagamento fatura ${invoice.creditCard.name}`,
        accountId: parsed.data.accountId,
        creditCardId: invoice.creditCardId,
        invoiceId: invoice.id,
        holderKind: "HOUSEHOLD",
        movementDate: paymentDate,
        competenceDate: paymentDate,
        dueDate: invoice.dueDate,
        status: TxStatus.CLEARED,
        origin: TxOrigin.SYSTEM,
        notes:
          "Liquidação de fatura — não conta como despesa adicional (a despesa já foi registrada na compra).",
        createdById: userId,
        updatedById: userId,
      },
    });

    const status =
      payAmount.greaterThanOrEqualTo(total) ? "PAID" : ("PARTIAL" as const);

    await tx.creditCardInvoice.update({
      where: { id: invoice.id },
      data: {
        status,
        paidAt: paymentDate,
        paymentTransactionId: payment.id,
      },
    });
  });

  revalidatePath("/cartoes");
  revalidatePath("/lancamentos");
  revalidatePath("/contas");
  revalidatePath("/");
  return { ok: true };
}
