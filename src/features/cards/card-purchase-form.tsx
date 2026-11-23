"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { createCardPurchaseAction } from "@/server/transactions/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CardPurchaseForm({
  cards,
  categories,
  members,
}: {
  cards: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string }>;
  members: Array<{ user: { id: string; name: string } }>;
}) {
  const [pending, startTransition] = useTransition();
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form
      className="space-y-3"
      action={(fd) => {
        startTransition(async () => {
          const result = await createCardPurchaseAction(fd);
          if (result?.error) toast.error(result.error);
          else toast.success("Compra registrada (despesa + obrigação).");
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Cartão</Label>
          <select
            name="creditCardId"
            required
            className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm"
          >
            {cards.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Valor total</Label>
          <Input name="amount" placeholder="0,00" required />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Descrição</Label>
          <Input name="description" required />
        </div>
        <div className="space-y-1.5">
          <Label>Data da compra</Label>
          <Input name="movementDate" type="date" defaultValue={today} required />
        </div>
        <div className="space-y-1.5">
          <Label>Parcelas</Label>
          <Input name="installments" type="number" min={1} max={48} defaultValue={1} />
        </div>
        <div className="space-y-1.5">
          <Label>Categoria</Label>
          <select
            name="categoryId"
            className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm"
            defaultValue=""
          >
            <option value="">Sem categoria</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Titular</Label>
          <select
            name="holderKind"
            className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm"
            defaultValue="HOUSEHOLD"
          >
            <option value="HOUSEHOLD">Família</option>
            <option value="MEMBER">Membro</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Membro</Label>
          <select
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
      </div>
      <p className="text-xs text-muted-foreground">
        A compra gera despesa na competência. O pagamento da fatura depois só
        liquida a obrigação — não cria segunda despesa.
      </p>
      <Button type="submit" disabled={pending || cards.length === 0}>
        {pending ? "Salvando..." : "Registrar compra"}
      </Button>
    </form>
  );
}
