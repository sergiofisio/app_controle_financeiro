"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { HouseholdRole } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMembership, requireMembership, requireSession } from "@/lib/session";
import { seedDefaultCategories } from "@/server/categories/defaults";

const createHouseholdSchema = z.object({
  name: z.string().min(2, "Informe o nome da família").max(80),
});

const inviteSchema = z.object({
  email: z.email("E-mail inválido").optional().or(z.literal("")),
  daysValid: z.coerce.number().int().min(1).max(30).default(7),
});

async function requireAdmin() {
  const { session, membership } = await requireMembership();
  if (membership.role !== HouseholdRole.ADMIN) {
    throw new Error("Apenas administradores podem realizar esta ação.");
  }
  return { session, membership };
}

export async function createHouseholdAction(formData: FormData) {
  const session = await requireSession();
  const existing = await getMembership(session.user.id);
  if (existing) {
    redirect("/");
  }

  const parsed = createHouseholdSchema.safeParse({
    name: formData.get("name"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  await prisma.$transaction(async (tx) => {
    const household = await tx.household.create({
      data: { name: parsed.data.name },
    });
    await tx.householdMember.create({
      data: {
        householdId: household.id,
        userId: session.user.id,
        role: HouseholdRole.ADMIN,
      },
    });
    await seedDefaultCategories(tx, household.id);
  });

  revalidatePath("/");
  redirect("/");
}

export async function createInvitationAction(formData: FormData) {
  const { session, membership } = await requireAdmin();

  const parsed = inviteSchema.safeParse({
    email: formData.get("email") || "",
    daysValid: formData.get("daysValid") || 7,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(
    Date.now() + parsed.data.daysValid * 24 * 60 * 60 * 1000,
  );

  const invitation = await prisma.householdInvitation.create({
    data: {
      householdId: membership.householdId,
      email: parsed.data.email ? parsed.data.email.toLowerCase() : null,
      role: HouseholdRole.MEMBER,
      token,
      expiresAt,
      createdById: session.user.id,
    },
  });

  const baseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  const inviteUrl = `${baseUrl}/convite/${invitation.token}`;

  revalidatePath("/configuracoes");
  return { inviteUrl, expiresAt: expiresAt.toISOString() };
}

export async function revokeInvitationAction(invitationId: string) {
  const { membership } = await requireAdmin();

  await prisma.householdInvitation.deleteMany({
    where: {
      id: invitationId,
      householdId: membership.householdId,
      acceptedAt: null,
    },
  });

  revalidatePath("/configuracoes");
  return { ok: true };
}

export async function acceptInvitationAction(token: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    redirect(`/login?next=${encodeURIComponent(`/convite/${token}`)}`);
  }

  const existing = await getMembership(session.user.id);
  if (existing) {
    return {
      error: "Você já pertence a uma família. Saia dela antes de aceitar outro convite.",
    };
  }

  const invitation = await prisma.householdInvitation.findUnique({
    where: { token },
  });

  if (!invitation || invitation.acceptedAt) {
    return { error: "Convite inválido ou já utilizado." };
  }
  if (invitation.expiresAt < new Date()) {
    return { error: "Este convite expirou." };
  }
  if (
    invitation.email &&
    invitation.email.toLowerCase() !== session.user.email.toLowerCase()
  ) {
    return {
      error: "Este convite foi emitido para outro e-mail.",
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.householdMember.create({
      data: {
        householdId: invitation.householdId,
        userId: session.user.id,
        role: invitation.role,
      },
    });
    await tx.householdInvitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    });
  });

  revalidatePath("/");
  redirect("/");
}

export async function updateProfileAction(formData: FormData) {
  const session = await requireSession();
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) {
    return { error: "Informe um nome válido." };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { name },
  });

  revalidatePath("/configuracoes");
  return { ok: true };
}

export async function listHouseholdMembers() {
  const { membership } = await requireMembership();
  return prisma.householdMember.findMany({
    where: { householdId: membership.householdId },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function listPendingInvitations() {
  const { membership } = await requireMembership();
  if (membership.role !== HouseholdRole.ADMIN) {
    return [];
  }
  return prisma.householdInvitation.findMany({
    where: {
      householdId: membership.householdId,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });
}
