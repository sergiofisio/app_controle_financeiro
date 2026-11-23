"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  confirmImportBatchAction,
  revertImportBatchAction,
  updateImportRowAction,
} from "@/server/imports/actions";
import { batchDescriptionMatchKey } from "@/lib/imports/description-match";
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

function rowText(row: Pick<Row, "userDescription" | "description">) {
  return row.userDescription || row.description;
}

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
  const [draftRows, setDraftRows] = useState(rows);
  const editable = status === "PREVIEW";

  useEffect(() => {
    setDraftRows(rows);
  }, [rows]);

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
            {draftRows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  {editable ? (
                    <input
                      type="checkbox"
                      checked={row.include}
                      disabled={row.status === "DUPLICATE" || pending}
                      onChange={(e) => {
                        const include = e.target.checked;
                        setDraftRows((prev) =>
                          prev.map((r) =>
                            r.id === row.id ? { ...r, include } : r,
                          ),
                        );
                        const fd = new FormData();
                        fd.set("rowId", row.id);
                        fd.set("include", String(include));
                        if (row.userCategoryId) {
                          fd.set("userCategoryId", row.userCategoryId);
                        }
                        if (row.userType || row.suggestedType) {
                          fd.set(
                            "userType",
                            row.userType || row.suggestedType || "",
                          );
                        }
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
                      value={row.userDescription || row.description || ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        setDraftRows((prev) =>
                          prev.map((r) =>
                            r.id === row.id
                              ? { ...r, userDescription: value }
                              : r,
                          ),
                        );
                      }}
                      onBlur={(e) => {
                        const fd = new FormData();
                        fd.set("rowId", row.id);
                        fd.set("userDescription", e.target.value);
                        fd.set("include", String(row.include));
                        if (row.userCategoryId) {
                          fd.set("userCategoryId", row.userCategoryId);
                        }
                        if (row.userType || row.suggestedType) {
                          fd.set(
                            "userType",
                            row.userType || row.suggestedType || "",
                          );
                        }
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
                      value={row.userType || row.suggestedType || "EXPENSE"}
                      onChange={(e) => {
                        const userType = e.target.value;
                        setDraftRows((prev) =>
                          prev.map((r) =>
                            r.id === row.id ? { ...r, userType } : r,
                          ),
                        );
                        const fd = new FormData();
                        fd.set("rowId", row.id);
                        fd.set("userType", userType);
                        fd.set("include", String(row.include));
                        if (row.userCategoryId) {
                          fd.set("userCategoryId", row.userCategoryId);
                        }
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
                      value={
                        row.userCategoryId || row.suggestedCategoryId || ""
                      }
                      onChange={(e) => {
                        const userCategoryId = e.target.value || null;
                        const sourceKey = batchDescriptionMatchKey(
                          rowText(row),
                        );
                        const currentType =
                          row.userType || row.suggestedType || "EXPENSE";

                        setDraftRows((prev) =>
                          prev.map((r) => {
                            if (r.id === row.id) {
                              return {
                                ...r,
                                userCategoryId,
                                classificationState: userCategoryId
                                  ? "CONFIRMED"
                                  : r.classificationState,
                              };
                            }
                            if (
                              !userCategoryId ||
                              !sourceKey ||
                              r.status === "DUPLICATE" ||
                              r.userCategoryId
                            ) {
                              return r;
                            }
                            if (
                              batchDescriptionMatchKey(rowText(r)) !==
                              sourceKey
                            ) {
                              return r;
                            }
                            return {
                              ...r,
                              userCategoryId,
                              userType: r.userType || currentType,
                              classificationState: "CONFIRMED",
                              status:
                                r.status === "DUPLICATE" ? r.status : "READY",
                            };
                          }),
                        );

                        const fd = new FormData();
                        fd.set("rowId", row.id);
                        fd.set("userCategoryId", userCategoryId || "");
                        fd.set("include", String(row.include));
                        fd.set("userType", currentType);
                        startTransition(async () => {
                          const r = await updateImportRowAction(fd);
                          if (r?.error) {
                            toast.error(r.error);
                            setDraftRows(rows);
                            return;
                          }
                          const propagated =
                            r && "propagated" in r ? (r.propagated ?? 0) : 0;
                          if (propagated > 0) {
                            toast.success(
                              `Categoria aplicada a ${propagated} linha(s) similar(es).`,
                            );
                          }
                          router.refresh();
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
