"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import {
  confirmImportBatchAction,
  revertImportBatchAction,
  updateImportRowAction,
} from "@/server/imports/actions";
import { formatDate, formatMoney } from "@/lib/format";
import { decimalToNumber } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Row = {
  id: string;
  lineNumber: number;
  movementDate: Date | string | null;
  description: string | null;
  amount: { toString(): string } | null;
  suggestedType: string | null;
  userType: string | null;
  userDescription: string | null;
  suggestedCategoryId: string | null;
  userCategoryId: string | null;
  status: string;
  include: boolean;
  classificationState: string;
  reviewNote: string | null;
};

export function ImportPreviewTable({
  batchId,
  status,
  rows,
  categories,
}: {
  batchId: string;
  status: string;
  rows: Row[];
  categories: Array<{ id: string; name: string; kind: string }>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const editable = status === "PREVIEW";

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Incluir</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  {editable ? (
                    <input
                      type="checkbox"
                      defaultChecked={row.include}
                      disabled={row.status === "DUPLICATE" || pending}
                      onChange={(e) => {
                        const fd = new FormData();
                        fd.set("rowId", row.id);
                        fd.set("include", String(e.target.checked));
                        startTransition(async () => {
                          const r = await updateImportRowAction(fd);
                          if (r?.error) toast.error(r.error);
                        });
                      }}
                    />
                  ) : (
                    row.include ? "Sim" : "Não"
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {row.movementDate ? formatDate(row.movementDate) : "—"}
                </TableCell>
                <TableCell className="min-w-[220px]">
                  {editable ? (
                    <Input
                      defaultValue={row.userDescription || row.description || ""}
                      onBlur={(e) => {
                        const fd = new FormData();
                        fd.set("rowId", row.id);
                        fd.set("userDescription", e.target.value);
                        fd.set("include", String(row.include));
                        startTransition(async () => {
                          await updateImportRowAction(fd);
                        });
                      }}
                    />
                  ) : (
                    row.userDescription || row.description || "—"
                  )}
                  {row.reviewNote ? (
                    <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                      {row.reviewNote}
                    </p>
                  ) : null}
                </TableCell>
                <TableCell>
                  {editable ? (
                    <select
                      className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
                      defaultValue={row.userType || row.suggestedType || "EXPENSE"}
                      onChange={(e) => {
                        const fd = new FormData();
                        fd.set("rowId", row.id);
                        fd.set("userType", e.target.value);
                        fd.set("include", String(row.include));
                        startTransition(async () => {
                          await updateImportRowAction(fd);
                        });
                      }}
                    >
                      <option value="INCOME">Receita</option>
                      <option value="EXPENSE">Despesa</option>
                      <option value="TRANSFER">Transferência</option>
                      <option value="YIELD">Rendimento</option>
                      <option value="ADJUSTMENT">Ajuste</option>
                    </select>
                  ) : (
                    row.userType || row.suggestedType || "—"
                  )}
                </TableCell>
                <TableCell>
                  {editable ? (
                    <select
                      className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
                      defaultValue={
                        row.userCategoryId || row.suggestedCategoryId || ""
                      }
                      onChange={(e) => {
                        const fd = new FormData();
                        fd.set("rowId", row.id);
                        fd.set("userCategoryId", e.target.value);
                        fd.set("include", String(row.include));
                        startTransition(async () => {
                          await updateImportRowAction(fd);
                        });
                      }}
                    >
                      <option value="">Sem categoria</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.amount
                    ? formatMoney(decimalToNumber(row.amount.toString()))
                    : "—"}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{row.status}</Badge>
                  <div className="text-[10px] text-muted-foreground">
                    {row.classificationState}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap gap-2">
        {editable ? (
          <Button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const r = await confirmImportBatchAction(batchId);
                if (r?.error) toast.error(r.error);
                else {
                  toast.success("Importação confirmada.");
                  router.refresh();
                }
              })
            }
          >
            Confirmar importação
          </Button>
        ) : null}
        {status === "CONFIRMED" ? (
          <Button
            variant="outline"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const r = await revertImportBatchAction(batchId);
                if (r?.error) toast.error(r.error);
                else {
                  toast.success("Importação desfeita.");
                  router.refresh();
                }
              })
            }
          >
            Desfazer importação
          </Button>
        ) : null}
      </div>
    </div>
  );
}
