import Link from "next/link";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-100 via-background to-emerald-50 px-4 py-10 dark:from-slate-900 dark:via-background dark:to-slate-950">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/login" className="inline-block">
            <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
              Finanças em Família
            </h1>
          </Link>
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <div className="rounded-2xl border bg-card/90 p-6 shadow-sm backdrop-blur">
          <h2 className="mb-4 font-heading text-xl font-semibold">{title}</h2>
          {children}
        </div>
      </div>
    </div>
  );
}
