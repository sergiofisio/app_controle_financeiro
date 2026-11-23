"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { reconcileAccountAction } from "@/server/imports/actions";
import { formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ReconcileForm({
  accounts,
  selected,
}: {
  accounts: Array<{ id: string; name: string }>;
  selected?: {
    calculatedBalance: string;
    statedBalance: string | null;
    differenceNumber: number | null;
  } | null;
}) {
  const [pending, startTransition] = useTransition();
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-3">
      <form
        className="grid gap-3 sm:grid-cols-2"
        action={(fd) => {
          startTransition(async () => {
            const r = await reconcileAccountAction(fd);
            if (r?.error) toast.error(r.error);
            else toast.success("Saldo do extrato registrado para conciliação.");
          });
        }}
      >
        <div className="space-y-1.5">
          <Label>Conta</Label>
          <select
            name="accountId"
            required
            className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Saldo informado no extrato</Label>
          <Input name="statedBalance" placeholder="0,00" required />
        </div>
        <div className="space-y-1.5">
          <Label>Data de referência</Label>
          <Input name="statedBalanceAt" type="date" defaultValue={today} required />
        </div>
        <div className="flex items-end">
          <Button type="submit" disabled={pending || accounts.length === 0}>
            {pending ? "Salvando..." : "Comparar saldo"}
          </Button>
        </div>
      </form>

      {selected ? (
        <div className="rounded-lg border p-3 text-sm">
          <p>
            Calculado:{" "}
            <strong>{formatMoney(Number(selected.calculatedBalance))}</strong>
          </p>
          <p>
            Extrato:{" "}
            <strong>
              {selected.statedBalance != null
                ? formatMoney(Number(selected.statedBalance))
                : "—"}
            </strong>
          </p>
          <p>
            Diferença:{" "}
            <strong>
              {selected.differenceNumber == null
                ? "—"
                : formatMoney(selected.differenceNumber)}
            </strong>
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Diferenças não são ajustadas automaticamente — confirme a origem
            antes de lançar um ajuste manual.
          </p>
        </div>
      ) : null}
    </div>
  );
}
