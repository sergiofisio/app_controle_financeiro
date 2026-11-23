"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  categorizeImportGroupAction,
  confirmImportBatchAction,
  revertImportBatchAction,
  updateImportRowAction,
} from "@/server/imports/actions";
import { batchDescriptionMatchKey } from "@/lib/imports/description-match";
import { formatDate, formatMoney } from "@/lib/format";
import {
  cashEffect,
  decimalToNumber,
  subMoney,
  toDecimal,
  type TxType,
} from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  signedAmount: string | null;
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

function formatBRLInput(value: number | string | null | undefined): string {
  if (value == null || value === "") return "";
  const n = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(n)) return String(value);
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function resolvePreviewType(row: Row): TxType {
  let type = (row.userType || row.suggestedType || "EXPENSE") as TxType;
  if (type === "ADJUSTMENT") {
    if (row.signedAmount) {
      type = toDecimal(row.signedAmount).isNegative() ? "EXPENSE" : "INCOME";
    } else {
      type = "INCOME";
    }
  }
  return type;
}

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
  categoryId: string | null;
  suggestedType: string | null;
};

export function ImportPreviewTable({
  batchId,
  status,
  rows,
  categories,
  statementBalance: initialStatementBalance,
  statementBalanceAt: initialStatementBalanceAt,
  currentAccountBalance,
}: {
  batchId: string;
  status: string;
  rows: Row[];
  categories: Array<{ id: string; name: string; kind: string }>;
  statementBalance?: string | null;
  statementBalanceAt?: string | null;
  currentAccountBalance: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [draftRows, setDraftRows] = useState(rows);
  const [filterKey, setFilterKey] = useState<string | null>(null);
  const [onlyWithoutCategory, setOnlyWithoutCategory] = useState(false);
  const [statementBalance, setStatementBalance] = useState(
    formatBRLInput(initialStatementBalance),
  );
  const [statementBalanceAt, setStatementBalanceAt] = useState(
    initialStatementBalanceAt?.slice(0, 10) ?? "",
  );
  const editable = status === "PREVIEW";

  useEffect(() => {
    setDraftRows(rows);
  }, [rows]);

  useEffect(() => {
    setStatementBalance(formatBRLInput(initialStatementBalance));
    setStatementBalanceAt(initialStatementBalanceAt?.slice(0, 10) ?? "");
  }, [initialStatementBalance, initialStatementBalanceAt]);

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

  const balancePreview = useMemo(() => {
    let batchEffect = toDecimal(0);
    for (const row of activeRows) {
      if (!row.amount) continue;
      batchEffect = batchEffect.plus(
        cashEffect(resolvePreviewType(row), row.amount),
      );
    }
    const projected = toDecimal(currentAccountBalance).plus(batchEffect);
    let statement: ReturnType<typeof toDecimal> | null = null;
    try {
      if (statementBalance.trim()) {
        const cleaned = statementBalance
          .trim()
          .replace(/\s/g, "")
          .replace(/R\$\s?/i, "")
          .replace(/\./g, "")
          .replace(",", ".");
        if (cleaned && !Number.isNaN(Number(cleaned))) {
          statement = toDecimal(cleaned);
        }
      }
    } catch {
      statement = null;
    }
    const difference =
      statement != null ? subMoney(statement, projected) : null;
    return {
      batchEffect: decimalToNumber(batchEffect),
      projected: decimalToNumber(projected),
      statement: statement ? decimalToNumber(statement) : null,
      difference: difference ? decimalToNumber(difference) : null,
    };
  }, [activeRows, currentAccountBalance, statementBalance]);

  const descriptionGroups = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string;
        label: string;
        total: number;
        withoutCategory: number;
        categoryIds: Set<string>;
        suggestedType: string | null;
      }
    >();

    for (const row of activeRows) {
      const text = rowText(row) || "(sem descrição)";
      const key = batchDescriptionMatchKey(text) || text.toUpperCase();
      const categoryId = row.userCategoryId || row.suggestedCategoryId;
      const current = map.get(key);
      if (current) {
        current.total += 1;
        if (!hasCategory(row)) current.withoutCategory += 1;
        if (categoryId) current.categoryIds.add(categoryId);
        if (!current.suggestedType && (row.userType || row.suggestedType)) {
          current.suggestedType = row.userType || row.suggestedType;
        }
      } else {
        map.set(key, {
          key,
          label: text,
          total: 1,
          withoutCategory: hasCategory(row) ? 0 : 1,
          categoryIds: new Set(categoryId ? [categoryId] : []),
          suggestedType: row.userType || row.suggestedType,
        });
      }
    }

    return [...map.values()]
      .map(
        (group): DescriptionGroup => ({
          key: group.key,
          label: group.label,
          total: group.total,
          withoutCategory: group.withoutCategory,
          suggestedType: group.suggestedType,
          categoryId:
            group.categoryIds.size === 1 ? [...group.categoryIds][0]! : null,
        }),
      )
      .sort((a, b) => {
        if (b.withoutCategory !== a.withoutCategory) {
          return b.withoutCategory - a.withoutCategory;
        }
        return b.total - a.total;
      });
  }, [activeRows]);

  function applyCategoryToGroup(
    group: DescriptionGroup,
    userCategoryId: string,
  ) {
    setDraftRows((prev) =>
      prev.map((row) => {
        if (!row.include || row.status === "DUPLICATE") return row;
        const text = rowText(row) || "(sem descrição)";
        const key = batchDescriptionMatchKey(text) || text.toUpperCase();
        if (key !== group.key) return row;
        return {
          ...row,
          userCategoryId: userCategoryId || null,
          classificationState: userCategoryId ? "CONFIRMED" : "UNKNOWN",
          status: row.status === "DUPLICATE" ? row.status : "READY",
          userType: row.userType || group.suggestedType || row.suggestedType,
        };
      }),
    );

    const fd = new FormData();
    fd.set("batchId", batchId);
    fd.set("matchKey", group.key);
    fd.set("userCategoryId", userCategoryId);
    if (group.suggestedType) fd.set("userType", group.suggestedType);

    startTransition(async () => {
      const result = await categorizeImportGroupAction(fd);
      if (result?.error) {
        toast.error(result.error);
        setDraftRows(rows);
        return;
      }
      const updated =
        result && "updated" in result ? (result.updated ?? 0) : 0;
      if (updated > 0 && userCategoryId) {
        toast.success(`Categoria aplicada a ${updated} linha(s).`);
      }
      router.refresh();
    });
  }

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

        <div className="max-h-72 overflow-y-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right w-16">Qtd</TableHead>
                <TableHead className="text-right w-24">Sem cat.</TableHead>
                {editable ? <TableHead className="w-52">Categoria</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {descriptionGroups.map((group) => (
                <TableRow
                  key={group.key}
                  className={
                    filterKey === group.key
                      ? "bg-muted/50"
                      : "hover:bg-muted/30"
                  }
                >
                  <TableCell
                    className="max-w-[320px] truncate text-sm cursor-pointer"
                    title={group.label}
                    onClick={() =>
                      setFilterKey((prev) =>
                        prev === group.key ? null : group.key,
                      )
                    }
                  >
                    {group.label}
                  </TableCell>
                  <TableCell
                    className="text-right tabular-nums text-sm cursor-pointer"
                    onClick={() =>
                      setFilterKey((prev) =>
                        prev === group.key ? null : group.key,
                      )
                    }
                  >
                    {group.total}
                  </TableCell>
                  <TableCell
                    className="text-right tabular-nums text-sm cursor-pointer"
                    onClick={() =>
                      setFilterKey((prev) =>
                        prev === group.key ? null : group.key,
                      )
                    }
                  >
                    {group.withoutCategory > 0 ? (
                      <span className="text-amber-700 dark:text-amber-300">
                        {group.withoutCategory}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </TableCell>
                  {editable ? (
                    <TableCell>
                      <select
                        className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm"
                        value={group.categoryId || ""}
                        disabled={pending}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) =>
                          applyCategoryToGroup(group, e.target.value)
                        }
                      >
                        <option value="">Sem categoria</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </TableCell>
                  ) : null}
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
                <TableCell className="min-w-55">
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

      {editable ? (
        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
          <p className="text-sm font-medium">Saldo do extrato</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="preview-statement-balance">
                Saldo atual no extrato
              </Label>
              <Input
                id="preview-statement-balance"
                value={statementBalance}
                onChange={(e) => setStatementBalance(e.target.value)}
                placeholder="220,50"
                inputMode="decimal"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="preview-statement-at">Data do saldo</Label>
              <Input
                id="preview-statement-at"
                type="date"
                value={statementBalanceAt}
                onChange={(e) => setStatementBalanceAt(e.target.value)}
              />
            </div>
          </div>
          <dl className="grid gap-1 text-sm sm:grid-cols-2">
            <div className="flex justify-between gap-2 sm:block">
              <dt className="text-muted-foreground">Saldo atual da conta</dt>
              <dd className="tabular-nums font-medium">
                {formatMoney(currentAccountBalance)}
              </dd>
            </div>
            <div className="flex justify-between gap-2 sm:block">
              <dt className="text-muted-foreground">Efeito líquido do lote</dt>
              <dd className="tabular-nums font-medium">
                {formatMoney(balancePreview.batchEffect)}
              </dd>
            </div>
            <div className="flex justify-between gap-2 sm:block">
              <dt className="text-muted-foreground">
                Saldo calculado (abertura atual + lote)
              </dt>
              <dd className="tabular-nums font-medium">
                {formatMoney(balancePreview.projected)}
              </dd>
            </div>
            <div className="flex justify-between gap-2 sm:block">
              <dt className="text-muted-foreground">Diferença vs extrato</dt>
              <dd className="tabular-nums font-medium">
                {balancePreview.difference != null
                  ? formatMoney(balancePreview.difference)
                  : "—"}
              </dd>
            </div>
          </dl>
          <p className="text-xs text-muted-foreground">
            Na confirmação, o saldo inicial da conta é recalculado para que o
            saldo final bata com o extrato
            {balancePreview.statement != null
              ? ` (${formatMoney(balancePreview.statement)})`
              : ""}
            .
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {editable ? (
          <Button
            disabled={pending || !statementBalance.trim()}
            onClick={() =>
              startTransition(async () => {
                const fd = new FormData();
                fd.set("batchId", batchId);
                fd.set("statementBalance", statementBalance.trim());
                if (statementBalanceAt) {
                  fd.set("statementBalanceAt", statementBalanceAt);
                }
                const r = await confirmImportBatchAction(fd);
                if (r?.error) toast.error(r.error);
                else {
                  toast.success("Importação confirmada. Saldo alinhado ao extrato.");
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
