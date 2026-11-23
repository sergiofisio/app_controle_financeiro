import Link from "next/link";
import { MobileNav } from "@/components/layout/mobile-nav";
import {
  NewTransactionButton,
  type QuickFormData,
} from "@/components/layout/new-transaction-button";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";

export function AppShell({
  children,
  user,
  householdName,
  quickForm,
}: {
  children: React.ReactNode;
  user: { name: string; email: string };
  householdName: string;
  quickForm: QuickFormData;
}) {
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-50 via-background to-background dark:from-slate-900/40 dark:via-background dark:to-background">
      <div className="mx-auto flex min-h-screen max-w-[1440px]">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar/90 backdrop-blur lg:flex">
          <div className="border-b border-sidebar-border px-4 py-5">
            <Link href="/" className="block">
              <p className="font-heading text-lg font-semibold tracking-tight text-sidebar-foreground">
                Finanças em Família
              </p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {householdName}
              </p>
            </Link>
          </div>
          <div className="flex-1 overflow-y-auto">
            <SidebarNav />
          </div>
          <div className="border-t border-sidebar-border p-3">
            <NewTransactionButton className="w-full" formData={quickForm} />
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur sm:px-6">
            <MobileNav />
            <div className="min-w-0 flex-1 lg:hidden">
              <p className="truncate font-heading text-sm font-semibold">
                Finanças em Família
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {householdName}
              </p>
            </div>
            <div className="ml-auto flex items-center gap-1 sm:gap-2">
              <div className="hidden sm:block lg:hidden">
                <NewTransactionButton compact formData={quickForm} />
              </div>
              <ThemeToggle />
              <UserMenu name={user.name} email={user.email} />
            </div>
          </header>
          <main className="flex-1 px-3 py-6 sm:px-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
