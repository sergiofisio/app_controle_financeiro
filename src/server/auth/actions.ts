"use server";

import { prisma } from "@/lib/prisma";

export async function getLatestPasswordResetLink(email: string) {
  const normalized = email.trim().toLowerCase();
  const link = await prisma.authShareLink.findFirst({
    where: {
      email: normalized,
      type: "PASSWORD_RESET",
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  return link?.url ?? null;
}
