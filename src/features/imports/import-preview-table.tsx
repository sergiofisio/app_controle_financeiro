"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
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
  amount: string | null;
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

function hasCategory(row: Row) {
  return Boolean(row.userCategoryId || row.suggestedCategoryId);
}

type DescriptionGroup = {
  key: string;
  label: string;
  total: number;
  withoutCategory: number;
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
  const [draftRows, setDraftRows] = useState(rows);
  const [filterKey, setFilterKey] = useState<string | null>(null);
  const [onlyWithoutCategory, setOnlyWithoutCategory] = useState(false);
  const editable = status === "PREVIEW";

  useEffect(() => {
    setDraftRows(rows);
  }, [rows]);

  const activeRows = useMemo(
    () =>
      draftRows.filter(
        (r) => r.include && r.status !== "DUPLICATE",
      ),
    [draftRows],
  );

  const withoutCategoryCount = useMemo(
    () => activeRows.filter((r) => !hasCategory(r)).length,
    [activeRows],
  );

  const descriptionGroups = useMemo(() => {
    const map = new Map<string, DescriptionGroup>();
    for (const row of activeRows) {
      const text = rowText(row) || "(sem descrição)";
      const key = batchDescriptionMatchKey(text) || text.toUpperCase();
      const current = map.get(key);
      if (current) {
        current.total += 1;
        if (!hasCategory(row)) current.withoutCategory += 1;
      } else {
        map.set(key, {
          key,
          label: text,
          total: 1,
          withoutCategory: hasCategory(row) ? 0 : 1,
        });
      }
    }
    return [...map.values()].sort((a, b) => {
      if (b.withoutCategory !== a.withoutCategory) {
        return b.withoutCategory - a.withoutCategory;
      }
      return b.total - a.total;
    });
  }, [activeRows]);

  const visibleRows = useMemo(() => {
    return draftRows.filter((row) => {
      if (onlyWithoutCategory && hasCategory(row)) return false;
      if (!filterKey) return true;
      const text = rowText(row) || "(sem descrição)";
      const key = batchDescriptionMatchKey(text) || text.toUpperCase();
      return key === filterKey;
    });
  }, [draftRows, filterKey, onlyWithoutCategory]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium">Progresso da categorização</p>
            <p className="text-xs text-muted-foreground">
              {activeRows.length} linha(s) a importar ·{" "}
              {descriptionGroups.length} descrição(ões) distintas
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant={withoutCategoryCount > 0 ? "destructive" : "secondary"}
              className="tabular-nums"
            >
              {withoutCategoryCount} sem categoria
            </Badge>
            <Button
              type="button"
              size="sm"
              variant={onlyWithoutCategory ? "default" : "outline"}
              onClick={() => setOnlyWithoutCategory((v) => !v)}
            >
              {onlyWithoutCategory ? "Ver todas" : "Só sem categoria"}
            </Button>
            {filterKey ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setFilterKey(null)}
              >
                Limpar filtro
              </Button>
            ) : null}
          </div>
        </div>

        <div className="max-h-56 overflow-y-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right w-20">Qtd</TableHead>
                <TableHead className="text-right w-28">Sem categoria</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {descriptionGroups.map((group) => (
                <TableRow
                  key={group.key}
                  className={
                    filterKey === group.key
                      ? "bg-muted/50 cursor-pointer"
                      : "cursor-pointer hover:bg-muted/30"
                  }
                  onClick={() =>
                    setFilterKey((prev) =>
                      prev === group.key ? null : group.key,
                    )
                  }
                >
                  <TableCell className="max-w-[420px] truncate text-sm">
                    {group.label}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {group.total}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {group.withoutCategory > 0 ? (
                      <span className="text-amber-700 dark:text-amber-300">
                        {group.withoutCategory}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

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
            {visibleRows.map((row) => (
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
                  {row.amount ? formatMoney(decimalToNumber(row.amount)) : "—"}
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
                  router.push("/importar");
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
