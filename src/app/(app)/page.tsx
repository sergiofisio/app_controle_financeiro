import { LayoutDashboard, PiggyBank, Wallet } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { formatMoney } from "@/lib/format";
import { decimalToNumber, isOperationalExpense, isOperationalIncome } from "@/lib/money";
import { requireMembership } from "@/lib/session";
import { listAccountsWithBalances } from "@/server/accounts/queries";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const { session, membership } = await requireMembership();
  const accounts = await listAccountsWithBalances();
  const bankBalance = accounts.reduce(
    (acc, a) => acc + decimalToNumber(a.balance),
    0,
  );

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const monthTxs = await prisma.transaction.findMany({
    where: {
      householdId: membership.householdId,
      deletedAt: null,
      status: { in: ["CLEARED", "PENDING"] },
      movementDate: { gte: monthStart },
    },
    select: { type: true, amount: true, accountId: true, creditCardId: true },
  });

  let income = 0;
  let expense = 0;
  for (const tx of monthTxs) {
    const value = decimalToNumber(tx.amount);
    if (isOperationalIncome(tx.type)) income += value;
    if (isOperationalExpense(tx.type)) expense += value;
  }

  const hasData = accounts.length > 0 || monthTxs.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Olá, {session.user.name}. Família{" "}
          <span className="font-medium text-foreground">
            {membership.household.name}
          </span>
          .
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Saldo bancário consolidado</CardDescription>
            <CardTitle className="text-2xl tabular-nums text-[var(--info)]">
              {hasData ? formatMoney(bankBalance) : "—"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {accounts.length === 0
              ? "Sem contas cadastradas ainda."
              : `${accounts.length} conta(s) ativa(s)/cadastrada(s).`}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Receitas do mês</CardDescription>
            <CardTitle className="text-2xl tabular-nums text-[var(--income)]">
              {hasData ? formatMoney(income) : "—"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Exclui transferências e aportes.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Despesas do mês</CardDescription>
            <CardTitle className="text-2xl tabular-nums text-[var(--expense)]">
              {hasData ? formatMoney(expense) : "—"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Inclui compras no cartão; exclui pagamento de fatura.
          </CardContent>
        </Card>
      </div>

      {!hasData ? (
        <EmptyState
          icon={LayoutDashboard}
          title="Nenhum dado financeiro ainda"
          description="Cadastre contas e lançamentos para ver indicadores reais. Nada é inventado."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <EmptyState
            icon={Wallet}
            title="Resultado do mês"
            description={`Líquido operacional: ${formatMoney(income - expense)}`}
          />
          <EmptyState
            icon={PiggyBank}
            title="Próximos passos"
            description="Orçamento, metas e gráficos completos entram nas fases 4 e 5."
            phase={4}
          />
        </div>
      )}
    </div>
  );
}
