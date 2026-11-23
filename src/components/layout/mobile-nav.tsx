"use client";

import { Menu } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SidebarNav } from "@/components/layout/sidebar-nav";

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Abrir menu"
          />
        }
      >
        <Menu className="size-5" />
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] p-0">
        <SheetHeader className="border-b px-4 py-4 text-left">
          <SheetTitle className="font-heading text-base">
            Finanças em Família
          </SheetTitle>
        </SheetHeader>
        <SidebarNav onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
