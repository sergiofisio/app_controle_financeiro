"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { createCardAction } from "@/server/cards/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function CardForm({
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
          const result = await createCardAction(fd);
          if (result?.error) toast.error(result.error);
          else toast.success("Cartão cadastrado.");
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="institution">Instituição</Label>
          <Input id="institution" name="institution" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="name">Nome do cartão</Label>
          <Input id="name" name="name" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="holderUserId">Titular</Label>
          <select
            id="holderUserId"
            name="holderUserId"
            className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm"
            defaultValue=""
          >
            <option value="">Família / não definido</option>
            {members.map((m) => (
              <option key={m.user.id} value={m.user.id}>
                {m.user.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="creditLimit">Limite</Label>
          <Input id="creditLimit" name="creditLimit" defaultValue="0,00" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="closingDay">Dia de fechamento</Label>
          <Input
            id="closingDay"
            name="closingDay"
            type="number"
            min={1}
            max={28}
            defaultValue={10}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dueDay">Dia de vencimento</Label>
          <Input
            id="dueDay"
            name="dueDay"
            type="number"
            min={1}
            max={28}
            defaultValue={17}
            required
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="notes">Observações</Label>
        <Textarea id="notes" name="notes" rows={2} />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Salvando..." : "Cadastrar cartão"}
      </Button>
    </form>
  );
}
