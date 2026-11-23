"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import {
  createTransactionAction,
  createTransferAction,
} from "@/server/transactions/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Account = { id: string; name: string };
type Category = { id: string; name: string; kind: "INCOME" | "EXPENSE" };
type Member = { user: { id: string; name: string } };

export function TransactionForm({
  accounts,
  categories,
  members,
  onSuccess,
  defaultType = "EXPENSE",
}: {
  accounts: Account[];
  categories: Category[];
  members: Member[];
  onSuccess?: () => void;
  defaultType?: "INCOME" | "EXPENSE";
}) {
  const [pending, startTransition] = useTransition();
  const today = new Date().toISOString().slice(0, 10);

  function finish(result?: { error?: string; ok?: boolean }) {
    if (result?.error) toast.error(result.error);
    else {
      toast.success("Lançamento registrado.");
      onSuccess?.();
    }
  }

  return (
    <Tabs defaultValue={defaultType === "INCOME" ? "income" : "expense"}>
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="expense">Despesa</TabsTrigger>
        <TabsTrigger value="income">Receita</TabsTrigger>
        <TabsTrigger value="transfer">Transferência</TabsTrigger>
      </TabsList>

      {(["expense", "income"] as const).map((tab) => {
        const type = tab === "income" ? "INCOME" : "EXPENSE";
        const cats = categories.filter((c) => c.kind === type);
        return (
          <TabsContent key={tab} value={tab} className="space-y-3 pt-3">
            <form
              className="space-y-3"
              action={(fd) => {
                fd.set("type", type);
                startTransition(async () => finish(await createTransactionAction(fd)));
              }}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Valor</Label>
                  <Input name="amount" placeholder="0,00" required />
                </div>
                <div className="space-y-1.5">
                  <Label>Data</Label>
                  <Input name="movementDate" type="date" defaultValue={today} required />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Descrição</Label>
                  <Input name="description" required minLength={2} />
                </div>
                <div className="space-y-1.5">
                  <Label>Conta</Label>
                  <select
                    name="accountId"
                    required
                    className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm"
                    defaultValue={accounts[0]?.id}
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Categoria</Label>
                  <select
                    name="categoryId"
                    className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm"
                    defaultValue=""
                  >
                    <option value="">Sem categoria</option>
                    {cats.map((c) => (
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
              <div className="space-y-1.5">
                <Label>Observações</Label>
                <Textarea name="notes" rows={2} />
              </div>
              <Button type="submit" disabled={pending || accounts.length === 0}>
                {pending ? "Salvando..." : "Salvar"}
              </Button>
              {accounts.length === 0 ? (
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Cadastre uma conta antes de lançar.
                </p>
              ) : null}
            </form>
          </TabsContent>
        );
      })}

      <TabsContent value="transfer" className="space-y-3 pt-3">
        <form
          className="space-y-3"
          action={(fd) => {
            startTransition(async () => finish(await createTransferAction(fd)));
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Valor</Label>
              <Input name="amount" placeholder="0,00" required />
            </div>
            <div className="space-y-1.5">
              <Label>Data</Label>
              <Input name="movementDate" type="date" defaultValue={today} required />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Descrição</Label>
              <Input name="description" required defaultValue="Transferência entre contas" />
            </div>
            <div className="space-y-1.5">
              <Label>De</Label>
              <select
                name="fromAccountId"
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
              <Label>Para</Label>
              <select
                name="toAccountId"
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
          </div>
          <p className="text-xs text-muted-foreground">
            Transferências não alteram receita, despesa nem patrimônio familiar.
          </p>
          <Button type="submit" disabled={pending || accounts.length < 2}>
            {pending ? "Transferindo..." : "Transferir"}
          </Button>
        </form>
      </TabsContent>
    </Tabs>
  );
}
