"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import {
  duplicateTransactionAction,
  softDeleteTransactionAction,
} from "@/server/transactions/actions";
import { formatDate, formatMoney } from "@/lib/format";
import { decimalToNumber } from "@/lib/money";
import { txStatusLabels, txTypeLabels } from "@/lib/finance-labels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Item = {
  id: string;
  type: keyof typeof txTypeLabels;
  status: keyof typeof txStatusLabels;
  amount: { toString(): string };
  description: string;
  movementDate: Date | string;
  origin: string;
  category: { name: string } | null;
  account: { name: string } | null;
  creditCard: { name: string } | null;
  createdBy: { name: string } | null;
};

export function TransactionsTable({ items }: { items: Item[] }) {
  const [pending, startTransition] = useTransition();

  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        Nenhum lançamento encontrado neste filtro. Os dados não são inventados.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Conta / Cartão</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead>Status</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const value = decimalToNumber(item.amount.toString());
            const positive =
              item.type === "INCOME" ||
              item.type === "YIELD" ||
              item.type === "CONTRIBUTION";
            return (
              <TableRow key={item.id}>
                <TableCell className="whitespace-nowrap">
                  {formatDate(item.movementDate)}
                </TableCell>
                <TableCell>
                  <div className="font-medium">{item.description}</div>
                  <div className="text-xs text-muted-foreground">
                    {item.createdBy?.name ?? "—"} · {item.origin}
                  </div>
                </TableCell>
                <TableCell>{txTypeLabels[item.type]}</TableCell>
                <TableCell>
                  {item.account?.name ?? item.creditCard?.name ?? "—"}
                </TableCell>
                <TableCell>{item.category?.name ?? "—"}</TableCell>
                <TableCell
                  className={`text-right tabular-nums ${
                    positive
                      ? "text-[var(--income)]"
                      : item.type === "EXPENSE" || item.type === "WITHDRAWAL"
                        ? "text-[var(--expense)]"
                        : ""
                  }`}
                >
                  {formatMoney(value)}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {txStatusLabels[item.status]}
                  </Badge>
                </TableCell>
                <TableCell className="space-x-1 whitespace-nowrap">
                  <Button
                    size="xs"
                    variant="ghost"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        const r = await duplicateTransactionAction(item.id);
                        if (r?.error) toast.error(r.error);
                        else toast.success("Duplicado.");
                      })
                    }
                  >
                    Duplicar
                  </Button>
                  <Button
                    size="xs"
                    variant="ghost"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        const r = await softDeleteTransactionAction(item.id);
                        if (r?.error) toast.error(r.error);
                        else toast.success("Excluído.");
                      })
                    }
                  >
                    Excluir
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
