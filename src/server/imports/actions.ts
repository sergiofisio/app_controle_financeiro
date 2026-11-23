"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  ClassificationState,
  ImportBatchStatus,
  ImportFormat,
  ImportRowStatus,
  TxOrigin,
  TxStatus,
  TxType,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  cashEffect,
  parseBRLInput,
  toDecimal,
  type TxType as MoneyTxType,
} from "@/lib/money";
import {
  batchDescriptionMatchKey,
  buildCategorySuggestionMap,
  buildFingerprint,
  descriptionMatchKey,
  hashFileContent,
  parseFlexibleDate,
  parseStatementFile,
} from "@/lib/imports";
import type { CsvColumnMap } from "@/features/imports/types";
import {
  assertAccountInHousehold,
  requireHouseholdContext,
} from "@/server/household-authz";
import { seedDefaultCategories } from "@/server/categories/defaults";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

function revalidateImports(batchId?: string) {
  revalidatePath("/importar");
  if (batchId) revalidatePath(`/importar/${batchId}`);
  revalidatePath("/lancamentos");
  revalidatePath("/contas");
  revalidatePath("/");
}

function matchCategorizationRule(
  rules: Array<{ pattern: string; categoryId: string; txType: TxType | null }>,
  description: string | null,
) {
  if (!description) return null;
  const hay = description.toUpperCase();
  for (const rule of rules) {
    if (hay.includes(rule.pattern.toUpperCase())) {
      return { categoryId: rule.categoryId, txType: rule.txType };
    }
  }
  return null;
}

export async function uploadStatementAction(formData: FormData) {
  const { householdId, userId } = await requireHouseholdContext();
  await seedDefaultCategories(prisma, householdId);

  const accountId = String(formData.get("accountId") || "");
  const file = formData.get("file");
  if (!accountId) return { error: "Selecione a conta." };
  if (!(file instanceof File)) return { error: "Envie um arquivo." };
  if (file.size <= 0) return { error: "Arquivo vazio." };
  if (file.size > MAX_UPLOAD_BYTES) {
    return { error: "Arquivo acima de 5 MB." };
  }

  await assertAccountInHousehold(accountId, householdId);

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileHash = hashFileContent(buffer);

  const repeatedFile = await prisma.importBatch.findFirst({
    where: {
      householdId,
      accountId,
      fileHash,
      status: { in: ["PREVIEW", "CONFIRMED"] },
    },
    orderBy: { createdAt: "desc" },
  });

  let columnMap: CsvColumnMap | undefined;
  const mappingRaw = formData.get("columnMap");
  if (typeof mappingRaw === "string" && mappingRaw.trim()) {
    try {
      columnMap = JSON.parse(mappingRaw) as CsvColumnMap;
    } catch {
      return { error: "Mapeamento CSV inválido." };
    }
  }

  const parsed = await parseStatementFile({
    fileName: file.name,
    buffer,
    csvColumnMap: columnMap,
    csvDelimiter: String(formData.get("delimiter") || "") || undefined,
  });

  if (parsed.rows.length === 0 && parsed.warningMessage) {
    return {
      error: parsed.warningMessage,
      detectedHeaders: parsed.detectedHeaders,
      detectedDelimiter: parsed.detectedDelimiter,
    };
  }

  const [existingTxs, categorizedHistory, rules] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        householdId,
        accountId,
        deletedAt: null,
        OR: [
          { fingerprint: { not: null } },
          { bankTxnId: { not: null } },
        ],
      },
      select: { id: true, fingerprint: true, bankTxnId: true },
    }),
    prisma.transaction.findMany({
      where: {
        householdId,
        deletedAt: null,
        categoryId: { not: null },
      },
      select: {
        description: true,
        categoryId: true,
        type: true,
        movementDate: true,
        createdAt: true,
      },
      orderBy: [{ movementDate: "asc" }, { createdAt: "asc" }],
      take: 5000,
    }),
    prisma.categorizationRule.findMany({
      where: { householdId, isActive: true },
      orderBy: { priority: "asc" },
    }),
  ]);
  const byBankId = new Map(
    existingTxs.filter((t) => t.bankTxnId).map((t) => [t.bankTxnId!, t.id]),
  );
  const byFingerprint = new Map(
    existingTxs
      .filter((t) => t.fingerprint)
      .map((t) => [t.fingerprint!, t.id]),
  );
  const historyByKey = buildCategorySuggestionMap(categorizedHistory);
  const batchByKey = new Map<
    string,
    { categoryId: string; txType: TxType | null }
  >();

  let duplicateCount = 0;
  const rowCreates: Array<{
    lineNumber: number;
    rawJson: Record<string, string>;
    movementDate: Date | null;
    description: string | null;
    amount: string | null;
    signedAmount: string | null;
    bankTxnId: string | null;
    balanceAfter: string | null;
    suggestedType: TxType;
    suggestedCategoryId: string | null;
    classificationState: ClassificationState;
    fingerprint: string;
    duplicateOfTxId: string | null;
    status: ImportRowStatus;
    include: boolean;
    reviewNote: string | null | undefined;
  }> = [];

  for (const row of parsed.rows) {
    const fingerprint = buildFingerprint({
      accountId,
      movementDate: row.movementDate,
      amount: row.amount,
      description: row.description,
      bankTxnId: row.bankTxnId,
    });

    let status: ImportRowStatus = row.needsReview
      ? ImportRowStatus.NEEDS_REVIEW
      : ImportRowStatus.READY;
    let duplicateOfTxId: string | null = null;

    if (row.bankTxnId && byBankId.has(row.bankTxnId)) {
      status = ImportRowStatus.DUPLICATE;
      duplicateOfTxId = byBankId.get(row.bankTxnId)!;
      duplicateCount += 1;
    } else if (byFingerprint.has(fingerprint)) {
      status = ImportRowStatus.DUPLICATE;
      duplicateOfTxId = byFingerprint.get(fingerprint)!;
      duplicateCount += 1;
    }

    const rule = matchCategorizationRule(rules, row.description);
    const matchKey = descriptionMatchKey(row.description);
    const historyHit = matchKey ? historyByKey.get(matchKey) : undefined;
    const batchHit = matchKey ? batchByKey.get(matchKey) : undefined;

    let suggestedCategoryId: string | null = null;
    let classificationState: ClassificationState = ClassificationState.UNKNOWN;
    let suggestedType = (row.suggestedType || TxType.EXPENSE) as TxType;

    if (rule?.categoryId) {
      suggestedCategoryId = rule.categoryId;
      classificationState = ClassificationState.AUTO;
      if (rule.txType) suggestedType = rule.txType;
    } else if (historyHit) {
      suggestedCategoryId = historyHit.categoryId;
      classificationState = ClassificationState.SUGGESTED;
      if (historyHit.txType) suggestedType = historyHit.txType as TxType;
    } else if (batchHit) {
      suggestedCategoryId = batchHit.categoryId;
      classificationState = ClassificationState.SUGGESTED;
      if (batchHit.txType) suggestedType = batchHit.txType;
    } else if (row.suggestedType) {
      classificationState = ClassificationState.SUGGESTED;
    }

    if (matchKey && suggestedCategoryId) {
      batchByKey.set(matchKey, {
        categoryId: suggestedCategoryId,
        txType: suggestedType,
      });
    }

    rowCreates.push({
      lineNumber: row.lineNumber,
      rawJson: row.raw,
      movementDate: row.movementDate ? new Date(row.movementDate) : null,
      description: row.description,
      amount: row.amount,
      signedAmount: row.signedAmount,
      bankTxnId: row.bankTxnId,
      balanceAfter: row.balanceAfter,
      suggestedType,
      suggestedCategoryId,
      classificationState,
      fingerprint,
      duplicateOfTxId,
      status,
      include: status !== ImportRowStatus.DUPLICATE,
      reviewNote: row.reviewNote,
    });
  }

  const format =
    parsed.format === "OFX"
      ? ImportFormat.OFX
      : parsed.format === "PDF"
        ? ImportFormat.PDF
        : ImportFormat.CSV;

  const statementBalanceRaw = String(
    formData.get("statementBalance") || "",
  ).trim();
  let statementBalance: ReturnType<typeof parseBRLInput> | null = null;
  if (statementBalanceRaw) {
    try {
      statementBalance = parseBRLInput(statementBalanceRaw);
    } catch {
      return { error: "Saldo do extrato inválido." };
    }
  } else if (parsed.statementBalance) {
    try {
      statementBalance = toDecimal(parsed.statementBalance);
    } catch {
      statementBalance = null;
    }
  }

  const statementBalanceAtRaw = String(
    formData.get("statementBalanceAt") || "",
  ).trim();
  let statementBalanceAt: Date | null = null;
  if (statementBalanceAtRaw) {
    const iso = parseFlexibleDate(statementBalanceAtRaw);
    if (iso) statementBalanceAt = new Date(iso);
  } else if (parsed.statementBalanceAt) {
    statementBalanceAt = new Date(parsed.statementBalanceAt);
  }

  const batch = await prisma.$transaction(async (tx) => {
    const created = await tx.importBatch.create({
      data: {
        householdId,
        accountId,
        format,
        fileName: file.name,
        fileHash,
        status: ImportBatchStatus.PREVIEW,
        rowCount: rowCreates.length,
        duplicateCount,
        rejectedCount: 0,
        statementBalance,
        statementBalanceAt,
        warningMessage: [
          parsed.warningMessage,
          repeatedFile
            ? "Arquivo com mesmo conteúdo já foi enviado anteriormente."
            : null,
          !statementBalance
            ? "Informe o saldo atual do extrato na prévia para alinhar a abertura da conta."
            : null,
        ]
          .filter(Boolean)
          .join(" "),
        createdById: userId,
      },
    });

    if (rowCreates.length > 0) {
      await tx.importRow.createMany({
        data: rowCreates.map((r) => ({ ...r, batchId: created.id })),
      });
    }

    return created;
  });

  revalidateImports();
  return { batchId: batch.id };
}

export async function updateImportRowAction(formData: FormData) {
  const { householdId } = await requireHouseholdContext();
  const rowId = String(formData.get("rowId") || "");
  const row = await prisma.importRow.findFirst({
    where: { id: rowId, batch: { householdId, status: "PREVIEW" } },
  });
  if (!row) return { error: "Linha não encontrada." };

  const include = formData.get("include") !== "false";
  const userType = String(formData.get("userType") || "") || null;
  const userCategoryId = String(formData.get("userCategoryId") || "") || null;
  const userDescription = String(formData.get("userDescription") || "") || null;

  await prisma.importRow.update({
    where: { id: rowId },
    data: {
      include,
      userType: userType ? (userType as TxType) : null,
      userCategoryId,
      userDescription: userDescription || null,
      classificationState: userCategoryId
        ? ClassificationState.CONFIRMED
        : row.classificationState,
      status:
        row.status === ImportRowStatus.DUPLICATE
          ? row.status
          : ImportRowStatus.READY,
    },
  });

  let propagated = 0;
  if (userCategoryId) {
    const sourceText =
      userDescription || row.userDescription || row.description;
    const sourceKey = batchDescriptionMatchKey(sourceText);
    if (sourceKey) {
      const siblings = await prisma.importRow.findMany({
        where: {
          batchId: row.batchId,
          id: { not: rowId },
          status: { not: ImportRowStatus.DUPLICATE },
          userCategoryId: null,
        },
        select: {
          id: true,
          description: true,
          userDescription: true,
        },
      });
      const siblingIds = siblings
        .filter(
          (sibling) =>
            batchDescriptionMatchKey(
              sibling.userDescription || sibling.description,
            ) === sourceKey,
        )
        .map((sibling) => sibling.id);

      if (siblingIds.length > 0) {
        const result = await prisma.importRow.updateMany({
          where: { id: { in: siblingIds } },
          data: {
            userCategoryId,
            classificationState: ClassificationState.CONFIRMED,
            status: ImportRowStatus.READY,
            ...(userType ? { userType: userType as TxType } : {}),
          },
        });
        propagated = result.count;
      }
    }
  }

  revalidatePath(`/importar/${row.batchId}`);
  return { ok: true, propagated };
}

export async function categorizeImportGroupAction(formData: FormData) {
  const { householdId } = await requireHouseholdContext();
  const batchId = String(formData.get("batchId") || "");
  const matchKey = String(formData.get("matchKey") || "");
  const userCategoryId = String(formData.get("userCategoryId") || "") || null;
  const userType = String(formData.get("userType") || "") || null;

  if (!batchId || !matchKey) {
    return { error: "Grupo inválido." };
  }

  const batch = await prisma.importBatch.findFirst({
    where: { id: batchId, householdId, status: "PREVIEW" },
    select: { id: true },
  });
  if (!batch) return { error: "Lote não encontrado ou já confirmado." };

  const candidates = await prisma.importRow.findMany({
    where: {
      batchId,
      status: { not: ImportRowStatus.DUPLICATE },
      include: true,
    },
    select: {
      id: true,
      description: true,
      userDescription: true,
    },
  });

  const ids = candidates
    .filter((row) => {
      const text = row.userDescription || row.description || "(sem descrição)";
      const key = batchDescriptionMatchKey(text) || text.toUpperCase();
      return key === matchKey;
    })
    .map((row) => row.id);

  if (ids.length === 0) {
    return { error: "Nenhuma linha encontrada para este grupo." };
  }

  await prisma.importRow.updateMany({
    where: { id: { in: ids } },
    data: {
      userCategoryId,
      classificationState: userCategoryId
        ? ClassificationState.CONFIRMED
        : ClassificationState.UNKNOWN,
      status: ImportRowStatus.READY,
      ...(userType ? { userType: userType as TxType } : {}),
    },
  });

  revalidatePath(`/importar/${batchId}`);
  return { ok: true, updated: ids.length };
}

function resolveImportTxType(row: {
  userType: TxType | null;
  suggestedType: TxType | null;
  signedAmount: { toString(): string } | null;
}): TxType {
  let type = (row.userType || row.suggestedType || TxType.EXPENSE) as TxType;
  if (type === TxType.ADJUSTMENT) {
    const signed = row.signedAmount ? toDecimal(row.signedAmount.toString()) : null;
    type = signed && signed.isNegative() ? TxType.EXPENSE : TxType.INCOME;
  }
  return type;
}

export async function updateBatchStatementBalanceAction(formData: FormData) {
  const { householdId } = await requireHouseholdContext();
  const batchId = String(formData.get("batchId") || "");
  const statementBalanceRaw = String(
    formData.get("statementBalance") || "",
  ).trim();
  const statementBalanceAtRaw = String(
    formData.get("statementBalanceAt") || "",
  ).trim();

  if (!batchId) return { error: "Lote inválido." };
  if (!statementBalanceRaw) return { error: "Informe o saldo do extrato." };

  let statementBalance;
  try {
    statementBalance = parseBRLInput(statementBalanceRaw);
  } catch {
    return { error: "Saldo do extrato inválido." };
  }

  let statementBalanceAt: Date | null = null;
  if (statementBalanceAtRaw) {
    const iso = parseFlexibleDate(statementBalanceAtRaw);
    if (iso) statementBalanceAt = new Date(iso);
  }

  const updated = await prisma.importBatch.updateMany({
    where: { id: batchId, householdId, status: "PREVIEW" },
    data: {
      statementBalance,
      statementBalanceAt,
    },
  });
  if (updated.count === 0) {
    return { error: "Lote não encontrado ou já confirmado." };
  }

  revalidatePath(`/importar/${batchId}`);
  return { ok: true };
}

export async function confirmImportBatchAction(formData: FormData | string) {
  const { householdId, userId } = await requireHouseholdContext();

  const batchId =
    typeof formData === "string"
      ? formData
      : String(formData.get("batchId") || "");
  const statementOverride =
    typeof formData === "string"
      ? ""
      : String(formData.get("statementBalance") || "").trim();

  const batch = await prisma.importBatch.findFirst({
    where: { id: batchId, householdId, status: "PREVIEW" },
    include: { rows: true, account: true },
  });
  if (!batch) return { error: "Lote não encontrado ou já confirmado." };

  let statementBalance = batch.statementBalance
    ? toDecimal(batch.statementBalance.toString())
    : null;
  if (statementOverride) {
    try {
      statementBalance = parseBRLInput(statementOverride);
    } catch {
      return { error: "Saldo do extrato inválido." };
    }
  }
  if (!statementBalance) {
    return {
      error:
        "Informe o saldo atual do extrato para confirmar e alinhar a abertura da conta.",
    };
  }

  const statementBalanceAt =
    batch.statementBalanceAt ??
    (typeof formData !== "string" && formData.get("statementBalanceAt")
      ? (() => {
          const iso = parseFlexibleDate(
            String(formData.get("statementBalanceAt")),
          );
          return iso ? new Date(iso) : null;
        })()
      : null);

  const toImport = batch.rows.filter(
    (r) =>
      r.include &&
      r.status !== ImportRowStatus.DUPLICATE &&
      r.movementDate &&
      r.amount &&
      (r.userDescription || r.description),
  );

  const CHUNK = 200;
  const txCreates = toImport.map((row) => {
    const type = resolveImportTxType(row);
    const description =
      row.userDescription || row.description || "Importado";
    const categoryId = row.userCategoryId || row.suggestedCategoryId;
    return {
      householdId,
      type,
      amount: row.amount!,
      description,
      categoryId,
      accountId: batch.accountId,
      holderKind: "HOUSEHOLD" as const,
      movementDate: row.movementDate!,
      competenceDate: row.movementDate!,
      status: TxStatus.CLEARED,
      origin: TxOrigin.IMPORT,
      fingerprint: row.fingerprint,
      bankTxnId: row.bankTxnId,
      importBatchId: batch.id,
      createdById: userId,
      updatedById: userId,
    };
  });

  const ruleCandidates = new Map<
    string,
    { pattern: string; categoryId: string; txType: TxType }
  >();
  for (const row of toImport) {
    const categoryId = row.userCategoryId || row.suggestedCategoryId;
    const description =
      row.userDescription || row.description || "Importado";
    if (
      !categoryId ||
      row.classificationState !== ClassificationState.CONFIRMED
    ) {
      continue;
    }
    const pattern = description.split(/\s+/).slice(0, 3).join(" ");
    if (pattern.length < 3) continue;
    const key = pattern.toUpperCase();
    if (!ruleCandidates.has(key)) {
      ruleCandidates.set(key, {
        pattern,
        categoryId,
        txType: resolveImportTxType(row),
      });
    }
  }

  try {
    await prisma.$transaction(
      async (tx) => {
        for (let i = 0; i < txCreates.length; i += CHUNK) {
          await tx.transaction.createMany({
            data: txCreates.slice(i, i + CHUNK),
          });
        }

        if (toImport.length > 0) {
          await tx.importRow.updateMany({
            where: { id: { in: toImport.map((r) => r.id) } },
            data: { status: ImportRowStatus.IMPORTED },
          });
        }

        if (ruleCandidates.size > 0) {
          const existing = await tx.categorizationRule.findMany({
            where: {
              householdId,
              pattern: {
                in: [...ruleCandidates.values()].map((r) => r.pattern),
                mode: "insensitive",
              },
            },
            select: { pattern: true },
          });
          const existingKeys = new Set(
            existing.map((r) => r.pattern.toUpperCase()),
          );
          const toCreate = [...ruleCandidates.values()].filter(
            (r) => !existingKeys.has(r.pattern.toUpperCase()),
          );
          if (toCreate.length > 0) {
            await tx.categorizationRule.createMany({
              data: toCreate.map((r) => ({
                householdId,
                pattern: r.pattern,
                categoryId: r.categoryId,
                txType: r.txType,
                priority: 50,
              })),
            });
          }
        }

        const accountTxs = await tx.transaction.findMany({
          where: {
            householdId,
            accountId: batch.accountId,
            deletedAt: null,
            status: { in: [TxStatus.CLEARED, TxStatus.PENDING] },
          },
          select: {
            type: true,
            amount: true,
            movementDate: true,
            transferGroup: {
              select: { fromAccountId: true, toAccountId: true },
            },
          },
        });

        let sumEffects = toDecimal(0);
        let minDate: Date | null = null;
        for (const t of accountTxs) {
          let transferDirection: "OUT" | "IN" | undefined;
          if (t.type === TxType.TRANSFER && t.transferGroup) {
            transferDirection =
              t.transferGroup.fromAccountId === batch.accountId
                ? "OUT"
                : "IN";
          } else if (t.type === TxType.TRANSFER) {
            transferDirection = "OUT";
          }
          sumEffects = sumEffects.plus(
            cashEffect(t.type as MoneyTxType, t.amount, {
              transferDirection,
            }),
          );
          if (!minDate || t.movementDate < minDate) {
            minDate = t.movementDate;
          }
        }

        const initialBalance = statementBalance.minus(sumEffects);
        let initialBalanceDate: Date;
        if (minDate) {
          initialBalanceDate = new Date(
            Date.UTC(
              minDate.getUTCFullYear(),
              minDate.getUTCMonth(),
              minDate.getUTCDate() - 1,
            ),
          );
        } else {
          initialBalanceDate = statementBalanceAt ?? new Date();
        }

        await tx.financialAccount.update({
          where: { id: batch.accountId },
          data: {
            initialBalance,
            initialBalanceDate,
            statedBalance: statementBalance,
            statedBalanceAt: statementBalanceAt ?? new Date(),
            lastReconciledAt: new Date(),
          },
        });

        const skipped = batch.rows.filter((r) => !r.include).length;
        await tx.importBatch.update({
          where: { id: batch.id },
          data: {
            status: ImportBatchStatus.CONFIRMED,
            confirmedAt: new Date(),
            importedCount: toImport.length,
            rejectedCount: skipped,
            statementBalance,
            statementBalanceAt: statementBalanceAt ?? undefined,
          },
        });
      },
      { timeout: 60_000, maxWait: 10_000 },
    );
  } catch (error) {
    console.error("confirmImportBatchAction failed", error);
    return {
      error:
        "Não foi possível confirmar a importação. Tente novamente em instantes.",
    };
  }

  revalidateImports(batchId);
  return { ok: true };
}

export async function revertImportBatchAction(batchId: string) {
  const { householdId, userId } = await requireHouseholdContext();
  const batch = await prisma.importBatch.findFirst({
    where: { id: batchId, householdId, status: "CONFIRMED" },
  });
  if (!batch) return { error: "Lote não pode ser desfeito." };

  await prisma.$transaction(async (tx) => {
    await tx.transaction.updateMany({
      where: {
        householdId,
        importBatchId: batchId,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
        status: TxStatus.CANCELLED,
        updatedById: userId,
      },
    });
    await tx.importBatch.update({
      where: { id: batchId },
      data: {
        status: ImportBatchStatus.REVERTED,
        revertedAt: new Date(),
      },
    });
    await tx.importRow.updateMany({
      where: { batchId, status: ImportRowStatus.IMPORTED },
      data: { status: ImportRowStatus.SKIPPED },
    });
  });

  revalidateImports(batchId);
  return { ok: true };
}

export async function saveImportMappingAction(formData: FormData) {
  const { householdId } = await requireHouseholdContext();
  const schema = z.object({
    name: z.string().min(2),
    accountId: z.string().optional().nullable(),
    delimiter: z.string().default(";"),
    columnMap: z.string().min(2),
  });
  const parsed = schema.safeParse({
    name: formData.get("name"),
    accountId: formData.get("accountId") || null,
    delimiter: formData.get("delimiter") || ";",
    columnMap: formData.get("columnMap"),
  });
  if (!parsed.success) return { error: "Dados de mapeamento inválidos." };

  let columnMap: CsvColumnMap;
  try {
    columnMap = JSON.parse(parsed.data.columnMap) as CsvColumnMap;
  } catch {
    return { error: "JSON de colunas inválido." };
  }

  await prisma.importMapping.create({
    data: {
      householdId,
      accountId: parsed.data.accountId,
      name: parsed.data.name,
      delimiter: parsed.data.delimiter,
      columnMap,
    },
  });

  revalidatePath("/importar");
  return { ok: true };
}

export async function reconcileAccountAction(formData: FormData) {
  const { householdId } = await requireHouseholdContext();
  const accountId = String(formData.get("accountId") || "");
  const statedBalanceRaw = String(formData.get("statedBalance") || "");
  const statedBalanceAt = String(formData.get("statedBalanceAt") || "");
  if (!accountId || !statedBalanceRaw || !statedBalanceAt) {
    return { error: "Informe conta, saldo do extrato e data." };
  }

  await assertAccountInHousehold(accountId, householdId);
  const { parseBRLInput } = await import("@/lib/money");
  let balance;
  try {
    balance = parseBRLInput(statedBalanceRaw);
  } catch {
    return { error: "Saldo do extrato inválido." };
  }

  await prisma.financialAccount.update({
    where: { id: accountId },
    data: {
      statedBalance: balance,
      statedBalanceAt: new Date(statedBalanceAt),
      lastReconciledAt: new Date(),
    },
  });

  revalidatePath("/importar");
  revalidatePath("/contas");
  return { ok: true };
}
