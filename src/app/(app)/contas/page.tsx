import { Wallet } from "lucide-react";
import { AccountForm } from "@/features/accounts/account-form";
import { ResetAccountButton } from "@/features/accounts/reset-account-button";
import { EmptyState } from "@/components/empty-state";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatMoney } from "@/lib/format";
import { decimalToNumber } from "@/lib/money";
import { accountTypeLabels } from "@/lib/finance-labels";
import { listAccountsWithBalances } from "@/server/accounts/queries";
import { listHouseholdMembersForSelect } from "@/server/transactions/queries";

export default async function ContasPage() {
  const [accounts, members] = await Promise.all([
    listAccountsWithBalances(),
    listHouseholdMembersForSelect(),
  ]);

  const total = accounts.reduce(
    (acc, a) => acc + decimalToNumber(a.balance),
    0,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Contas bancárias
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Saldos calculados a partir do saldo inicial e dos lançamentos
          confirmados/pendentes.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardDescription>Saldo consolidado</CardDescription>
          <CardTitle className="text-2xl tabular-nums text-[var(--info)]">
            {formatMoney(total)}
          </CardTitle>
        </CardHeader>
      </Card>

      {accounts.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Nenhuma conta cadastrada"
          description="Cadastre a primeira conta para começar a controlar saldos e lançamentos."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {accounts.map((account) => (
            <Card key={account.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{account.name}</CardTitle>
                  <Badge variant={account.isActive ? "secondary" : "outline"}>
                    {account.isActive ? "Ativa" : "Inativa"}
                  </Badge>
                </div>
                <CardDescription>
                  {account.institution || "Sem instituição"} ·{" "}
                  {accountTypeLabels[account.type]}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="space-y-1">
                  <p className="text-2xl font-semibold tabular-nums">
                    {formatMoney(decimalToNumber(account.balance))}
                  </p>
                  <p className="text-muted-foreground">
                    Inicial{" "}
                    {formatMoney(decimalToNumber(account.initialBalance))} em{" "}
                    {formatDate(account.initialBalanceDate)}
                  </p>
                </div>
                <ResetAccountButton
                  accountId={account.id}
                  accountName={account.name}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Nova conta</CardTitle>
          <CardDescription>
            Informe o saldo inicial e a data de referência corretamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AccountForm members={members} />
        </CardContent>
      </Card>
    </div>
  );
}
