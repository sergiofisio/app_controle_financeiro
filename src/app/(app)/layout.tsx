import { AppShell } from "@/components/layout/app-shell";
import { requireMembership } from "@/lib/session";
import { listActiveAccounts } from "@/server/accounts/queries";
import {
  listCategories,
  listHouseholdMembersForSelect,
} from "@/server/transactions/queries";
import { seedDefaultCategories } from "@/server/categories/defaults";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session, membership } = await requireMembership();
  await seedDefaultCategories(prisma, membership.householdId);

  const [accounts, categories, members] = await Promise.all([
    listActiveAccounts(),
    listCategories(),
    listHouseholdMembersForSelect(),
  ]);

  return (
    <AppShell
      user={{ name: session.user.name, email: session.user.email }}
      householdName={membership.household.name}
      quickForm={{
        accounts: accounts.map((a) => ({ id: a.id, name: a.name })),
        categories: categories.map((c) => ({
          id: c.id,
          name: c.name,
          kind: c.kind as "INCOME" | "EXPENSE",
        })),
        members,
      }}
    >
      {children}
    </AppShell>
  );
}
