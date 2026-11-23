import { AppShell } from "@/components/layout/app-shell";
import { requireMembership } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session, membership } = await requireMembership();

  return (
    <AppShell
      user={{ name: session.user.name, email: session.user.email }}
      householdName={membership.household.name}
    >
      {children}
    </AppShell>
  );
}
