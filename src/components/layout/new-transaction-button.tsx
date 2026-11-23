"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TransactionForm } from "@/features/transactions/transaction-form";

export type QuickFormData = {
  accounts: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string; kind: "INCOME" | "EXPENSE" }>;
  members: Array<{ user: { id: string; name: string } }>;
};

export function NewTransactionButton({
  className,
  compact = false,
  formData,
}: {
  className?: string;
  compact?: boolean;
  formData: QuickFormData;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className={className} size={compact ? "sm" : "default"} />
        }
      >
        <Plus className="size-4" />
        {compact ? "Novo" : "Novo lançamento"}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo lançamento</DialogTitle>
        </DialogHeader>
        <TransactionForm
          accounts={formData.accounts}
          categories={formData.categories}
          members={formData.members}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
