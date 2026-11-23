"use client";

import { useRouter } from "next/navigation";
import { LogOut, Settings } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenu({
  name,
  email,
}: {
  name: string;
  email: string;
}) {
  const router = useRouter();
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  async function handleLogout() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" className="gap-2 px-2" />}
      >
        <Avatar className="size-7">
          <AvatarFallback>{initials || "U"}</AvatarFallback>
        </Avatar>
        <span className="hidden max-w-[140px] truncate text-sm sm:inline">
          {name}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">{name}</span>
            <span className="text-xs text-muted-foreground">{email}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/configuracoes")}>
          <Settings className="size-4" />
          Configurações
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="size-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
