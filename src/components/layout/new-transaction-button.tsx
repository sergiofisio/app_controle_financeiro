"use client";

import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TransactionForm } from "@/features/transactions/transaction-form";
import { listActiveAccounts } from "@/server/accounts/queries";
import {
  listCategories,
  listHouseholdMembersForSelect,
} from "@/server/transactions/queries";

export function NewTransactionButton({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string }>>(
    [],
  );
  const [categories, setCategories] = useState<
    Array<{ id: string; name: string; kind: "INCOME" | "EXPENSE" }>
  >([]);
  const [members, setMembers] = useState<
    Array<{ user: { id: string; name: string } }>
  >([]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const [a, c, m] = await Promise.all([
        listActiveAccounts(),
        listCategories(),
        listHouseholdMembersForSelect(),
      ]);
      if (cancelled) return;
      setAccounts(a.map((x) => ({ id: x.id, name: x.name })));
      setCategories(
        c.map((x) => ({
          id: x.id,
          name: x.name,
          kind: x.kind as "INCOME" | "EXPENSE",
        })),
      );
      setMembers(m);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

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
        {ready ? (
          <TransactionForm
            accounts={accounts}
            categories={categories}
            members={members}
            onSuccess={() => setOpen(false)}
          />
        ) : (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
