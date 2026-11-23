"use server";

import { prisma } from "@/lib/prisma";
import { addMoney, toDecimal } from "@/lib/money";
import { requireHouseholdContext } from "@/server/household-authz";

export async function listCardsWithInvoices() {
  const { householdId } = await requireHouseholdContext();
  const cards = await prisma.creditCard.findMany({
    where: { householdId, deletedAt: null },
    include: {
      holder: { select: { id: true, name: true } },
      invoices: {
        where: { status: { in: ["OPEN", "CLOSED", "PARTIAL"] } },
        include: {
          purchases: {
            where: { deletedAt: null, status: { not: "CANCELLED" } },
          },
        },
        orderBy: { referenceMonth: "desc" },
        take: 6,
      },
    },
    orderBy: { name: "asc" },
  });

  return cards.map((card) => ({
    ...card,
    invoices: card.invoices.map((invoice) => ({
      ...invoice,
      total: invoice.purchases.reduce(
        (acc, p) => addMoney(acc, p.amount),
        toDecimal(0),
      ),
    })),
  }));
}
