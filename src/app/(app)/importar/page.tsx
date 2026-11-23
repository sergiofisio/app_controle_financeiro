import Link from "next/link";
import { FileUp } from "lucide-react";
import { UploadForm } from "@/features/imports/upload-form";
import { ReconcileForm } from "@/features/imports/reconcile-form";
import { EmptyState } from "@/components/empty-state";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";
import { listActiveAccounts } from "@/server/accounts/queries";
import {
  getAccountReconciliation,
  listImportBatches,
} from "@/server/imports/queries";

export default async function ImportarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const reconcileAccountId =
    typeof sp.accountId === "string" ? sp.accountId : undefined;

  const [accounts, batches] = await Promise.all([
    listActiveAccounts(),
    listImportBatches(),
  ]);

  const reconciliation = reconcileAccountId
    ? await getAccountReconciliation(reconcileAccountId)
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Importar extratos
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          CSV, OFX e PDF textual com antiduplicação e prévia editável.
        </p>
      </div>

      {accounts.length === 0 ? (
        <EmptyState
          icon={FileUp}
          title="Cadastre uma conta primeiro"
          description="A importação precisa de uma conta financeira de destino."
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Novo envio</CardTitle>
            <CardDescription>
              O sistema gera uma prévia. Nada é gravado nos lançamentos até você
              confirmar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UploadForm
              accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Conciliação de saldo</CardTitle>
          <CardDescription>
            Compare o saldo calculado com o saldo informado no extrato.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <form className="flex flex-wrap gap-2">
            <select
              name="accountId"
              defaultValue={reconcileAccountId ?? accounts[0]?.id}
              className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="h-8 rounded-lg bg-secondary px-3 text-sm"
            >
              Carregar
            </button>
          </form>
          <ReconcileForm
            accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
            selected={
              reconciliation
                ? {
                    calculatedBalance: reconciliation.calculatedBalance.toString(),
                    statedBalance: reconciliation.statedBalance?.toString() ?? null,
                    differenceNumber: reconciliation.differenceNumber,
                  }
                : null
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de importações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {batches.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma importação ainda.
            </p>
          ) : (
            batches.map((batch) => (
              <Link
                key={batch.id}
                href={`/importar/${batch.id}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm hover:bg-muted/40"
              >
                <div>
                  <p className="font-medium">
                    {batch.fileName} · {batch.account.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(batch.createdAt)} · {batch.createdBy.name} ·{" "}
                    {batch.format}
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant="secondary">{batch.status}</Badge>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {batch.importedCount}/{batch.rowCount} importados ·{" "}
                    {batch.duplicateCount} duplicados
                  </p>
                </div>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
