"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navGroups, navItems } from "@/lib/navigation";

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-6 px-3 py-4" aria-label="Principal">
      {navGroups.map((group) => {
        const items = navItems.filter((item) => item.group === group.id);
        if (items.length === 0) return null;

        return (
          <div key={group.id} className="space-y-1">
            <p className="px-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {items.map((item) => {
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname === item.href ||
                      pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;

                return (
                  <li key={item.href + item.title}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      className={cn(
                        "flex items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors",
                        active
                          ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground",
                      )}
                    >
                      <Icon className="size-4 shrink-0 opacity-80" />
                      <span className="truncate">{item.title}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
