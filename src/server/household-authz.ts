import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/lib/session";

export async function requireHouseholdContext() {
  const { session, membership } = await requireMembership();
  return {
    session,
    membership,
    householdId: membership.householdId,
    userId: session.user.id,
  };
}

export async function assertAccountInHousehold(
  accountId: string,
  householdId: string,
) {
  const account = await prisma.financialAccount.findFirst({
    where: { id: accountId, householdId, deletedAt: null },
  });
  if (!account) throw new Error("Conta não encontrada nesta família.");
  return account;
}

export async function assertCardInHousehold(
  creditCardId: string,
  householdId: string,
) {
  const card = await prisma.creditCard.findFirst({
    where: { id: creditCardId, householdId, deletedAt: null },
  });
  if (!card) throw new Error("Cartão não encontrado nesta família.");
  return card;
}

export async function assertCategoryInHousehold(
  categoryId: string,
  householdId: string,
) {
  const category = await prisma.category.findFirst({
    where: { id: categoryId, householdId, isActive: true },
  });
  if (!category) throw new Error("Categoria não encontrada nesta família.");
  return category;
}
