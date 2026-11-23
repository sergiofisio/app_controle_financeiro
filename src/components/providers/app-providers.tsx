"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <TooltipProvider>
        {children}
        <Toaster richColors position="top-right" closeButton />
      </TooltipProvider>
    </ThemeProvider>
  );
}
