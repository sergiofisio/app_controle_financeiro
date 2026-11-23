"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { payInvoiceAction } from "@/server/cards/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PayInvoiceForm({
  invoiceId,
  accounts,
  suggestedAmount,
}: {
  invoiceId: string;
  accounts: Array<{ id: string; name: string }>;
  suggestedAmount: string;
}) {
  const [pending, startTransition] = useTransition();
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form
      className="flex flex-wrap items-end gap-2"
      action={(fd) => {
        fd.set("invoiceId", invoiceId);
        startTransition(async () => {
          const result = await payInvoiceAction(fd);
          if (result?.error) toast.error(result.error);
          else toast.success("Fatura liquidada (sem nova despesa).");
        });
      }}
    >
      <div className="space-y-1">
        <Label>Conta</Label>
        <select
          name="accountId"
          required
          className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
        >
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label>Data</Label>
        <Input name="paymentDate" type="date" defaultValue={today} required />
      </div>
      <div className="space-y-1">
        <Label>Valor</Label>
        <Input name="amount" defaultValue={suggestedAmount} />
      </div>
      <Button type="submit" size="sm" disabled={pending || accounts.length === 0}>
        {pending ? "..." : "Pagar fatura"}
      </Button>
    </form>
  );
}
