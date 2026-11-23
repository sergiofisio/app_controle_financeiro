import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
}

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

export async function getMembership(userId: string) {
  return prisma.householdMember.findFirst({
    where: { userId },
    include: {
      household: true,
      user: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function requireMembership() {
  const session = await requireSession();
  const membership = await getMembership(session.user.id);
  if (!membership) {
    redirect("/onboarding");
  }
  return { session, membership };
}
