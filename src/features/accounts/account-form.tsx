"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { createAccountAction } from "@/server/accounts/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { accountTypeLabels } from "@/lib/finance-labels";

export function AccountForm({
  members,
}: {
  members: Array<{ user: { id: string; name: string } }>;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-3"
      action={(fd) => {
        startTransition(async () => {
          const result = await createAccountAction(fd);
          if (result?.error) toast.error(result.error);
          else toast.success("Conta criada.");
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">Nome</Label>
          <Input id="name" name="name" required minLength={2} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="institution">Instituição</Label>
          <Input id="institution" name="institution" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="type">Tipo</Label>
          <select
            id="type"
            name="type"
            className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm"
            defaultValue="CHECKING"
          >
            {Object.entries(accountTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="holderKind">Titular</Label>
          <select
            id="holderKind"
            name="holderKind"
            className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm"
            defaultValue="HOUSEHOLD"
          >
            <option value="HOUSEHOLD">Família / conjunto</option>
            <option value="MEMBER">Membro</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="holderUserId">Membro (se aplicável)</Label>
          <select
            id="holderUserId"
            name="holderUserId"
            className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm"
            defaultValue=""
          >
            <option value="">—</option>
            {members.map((m) => (
              <option key={m.user.id} value={m.user.id}>
                {m.user.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="initialBalance">Saldo inicial</Label>
          <Input
            id="initialBalance"
            name="initialBalance"
            placeholder="0,00"
            required
            defaultValue="0,00"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="initialBalanceDate">Data do saldo inicial</Label>
          <Input
            id="initialBalanceDate"
            name="initialBalanceDate"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="notes">Observações</Label>
        <Textarea id="notes" name="notes" rows={2} />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Salvando..." : "Cadastrar conta"}
      </Button>
    </form>
  );
}
