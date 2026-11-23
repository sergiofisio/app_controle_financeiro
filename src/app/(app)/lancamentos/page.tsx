import { TransactionForm } from "@/features/transactions/transaction-form";
import { TransactionsTable } from "@/features/transactions/transactions-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { listActiveAccounts } from "@/server/accounts/queries";
import {
  listCategories,
  listHouseholdMembersForSelect,
  listTransactions,
} from "@/server/transactions/queries";

export default async function LancamentosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const type = typeof sp.type === "string" ? sp.type : undefined;
  const accountId = typeof sp.accountId === "string" ? sp.accountId : undefined;
  const page = typeof sp.page === "string" ? Number(sp.page) : 1;

  const [accounts, categories, members, result] = await Promise.all([
    listActiveAccounts(),
    listCategories(),
    listHouseholdMembersForSelect(),
    listTransactions({ q, type, accountId, page }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Lançamentos
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Receitas, despesas e transferências com histórico auditável.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registrar</CardTitle>
          <CardDescription>
            Use o botão + Novo lançamento no topo para acesso rápido em qualquer
            tela.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TransactionForm
            accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
            categories={categories.map((c) => ({
              id: c.id,
              name: c.name,
              kind: c.kind as "INCOME" | "EXPENSE",
            }))}
            members={members}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico</CardTitle>
          <CardDescription>
            {result.total} registro(s) · página {result.page} de{" "}
            {Math.max(1, result.pageCount)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="flex flex-wrap gap-2">
            <input
              name="q"
              defaultValue={q}
              placeholder="Buscar descrição"
              className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
            />
            <select
              name="type"
              defaultValue={type ?? ""}
              className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
            >
              <option value="">Todos os tipos</option>
              <option value="INCOME">Receita</option>
              <option value="EXPENSE">Despesa</option>
              <option value="TRANSFER">Transferência</option>
            </select>
            <select
              name="accountId"
              defaultValue={accountId ?? ""}
              className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
            >
              <option value="">Todas as contas</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="h-8 rounded-lg bg-primary px-3 text-sm text-primary-foreground"
            >
              Filtrar
            </button>
          </form>
          <TransactionsTable items={result.items as never} />
        </CardContent>
      </Card>
    </div>
  );
}
