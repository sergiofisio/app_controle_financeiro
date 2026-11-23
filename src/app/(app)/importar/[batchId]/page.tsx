import { notFound } from "next/navigation";
import { ImportPreviewTable } from "@/features/imports/import-preview-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";
import { getImportBatch } from "@/server/imports/queries";
import { listCategories } from "@/server/transactions/queries";

export default async function ImportBatchPage({
  params,
}: {
  params: Promise<{ batchId: string }>;
}) {
  const { batchId } = await params;
  const [batch, categories] = await Promise.all([
    getImportBatch(batchId),
    listCategories(),
  ]);
  if (!batch) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Prévia da importação
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {batch.fileName} · {batch.account.name}
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">{batch.format}</CardTitle>
              <CardDescription>
                Criado em {formatDateTime(batch.createdAt)} por{" "}
                {batch.createdBy.name}
              </CardDescription>
            </div>
            <Badge variant="secondary">{batch.status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            Linhas: {batch.rowCount} · Duplicadas: {batch.duplicateCount} ·
            Importadas: {batch.importedCount}
          </p>
          {batch.warningMessage ? (
            <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-amber-800 dark:text-amber-200">
              {batch.warningMessage}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <ImportPreviewTable
        batchId={batch.id}
        status={batch.status}
        rows={batch.rows.map((row) => ({
          id: row.id,
          lineNumber: row.lineNumber,
          movementDate: row.movementDate,
          description: row.description,
          amount: row.amount?.toString() ?? null,
          suggestedType: row.suggestedType,
          userType: row.userType,
          userDescription: row.userDescription,
          suggestedCategoryId: row.suggestedCategoryId,
          userCategoryId: row.userCategoryId,
          status: row.status,
          include: row.include,
          classificationState: row.classificationState,
          reviewNote: row.reviewNote,
        }))}
        categories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          kind: c.kind,
        }))}
      />
    </div>
  );
}
