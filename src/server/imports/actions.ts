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
  buildFingerprint,
  hashFileContent,
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

  const [existingTxs, rules] = await Promise.all([
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
    const suggestedType = (rule?.txType ||
      row.suggestedType ||
      TxType.EXPENSE) as TxType;

    let classificationState: ClassificationState = ClassificationState.UNKNOWN;
    if (rule?.categoryId) classificationState = ClassificationState.AUTO;
    else if (row.suggestedType) classificationState = ClassificationState.SUGGESTED;

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
      suggestedCategoryId: rule?.categoryId ?? null,
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
        warningMessage: [
          parsed.warningMessage,
          repeatedFile
            ? "Arquivo com mesmo conteúdo já foi enviado anteriormente."
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

  revalidatePath(`/importar/${row.batchId}`);
  return { ok: true };
}

export async function confirmImportBatchAction(batchId: string) {
  const { householdId, userId } = await requireHouseholdContext();
  const batch = await prisma.importBatch.findFirst({
    where: { id: batchId, householdId, status: "PREVIEW" },
    include: { rows: true, account: true },
  });
  if (!batch) return { error: "Lote não encontrado ou já confirmado." };

  const toImport = batch.rows.filter(
    (r) =>
      r.include &&
      r.status !== ImportRowStatus.DUPLICATE &&
      r.movementDate &&
      r.amount &&
      (r.userDescription || r.description),
  );

  await prisma.$transaction(async (tx) => {
    let imported = 0;
    for (const row of toImport) {
      const type = (row.userType || row.suggestedType || TxType.EXPENSE) as TxType;
      const description =
        row.userDescription || row.description || "Importado";
      const categoryId = row.userCategoryId || row.suggestedCategoryId;

      await tx.transaction.create({
        data: {
          householdId,
          type,
          amount: row.amount!,
          description,
          categoryId,
          accountId: batch.accountId,
          holderKind: "HOUSEHOLD",
          movementDate: row.movementDate!,
          competenceDate: row.movementDate!,
          status: TxStatus.CLEARED,
          origin: TxOrigin.IMPORT,
          fingerprint: row.fingerprint,
          bankTxnId: row.bankTxnId,
          importBatchId: batch.id,
          createdById: userId,
          updatedById: userId,
        },
      });

      await tx.importRow.update({
        where: { id: row.id },
        data: { status: ImportRowStatus.IMPORTED },
      });

      if (
        categoryId &&
        description &&
        row.classificationState === ClassificationState.CONFIRMED
      ) {
        const pattern = description.split(/\s+/).slice(0, 3).join(" ");
        if (pattern.length >= 3) {
          const exists = await tx.categorizationRule.findFirst({
            where: {
              householdId,
              pattern: { equals: pattern, mode: "insensitive" },
            },
          });
          if (!exists) {
            await tx.categorizationRule.create({
              data: {
                householdId,
                pattern,
                categoryId,
                txType: type,
                priority: 50,
              },
            });
          }
        }
      }

      imported += 1;
    }

    const skipped = batch.rows.filter((r) => !r.include).length;
    await tx.importBatch.update({
      where: { id: batch.id },
      data: {
        status: ImportBatchStatus.CONFIRMED,
        confirmedAt: new Date(),
        importedCount: imported,
        rejectedCount: skipped,
      },
    });
  });

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
