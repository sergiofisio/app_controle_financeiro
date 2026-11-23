import { parse } from "csv-parse/sync";
import type { CsvColumnMap, NormalizedImportRow, ParseResult } from "@/features/imports/types";
import { detectCsvDelimiter } from "@/lib/imports/detect";
import {
  classifyByDescription,
  inferTypeFromSignedAmount,
  normalizeDescription,
  parseFlexibleAmount,
  parseFlexibleDate,
} from "@/lib/imports/normalize";

function guessColumnMap(headers: string[]): CsvColumnMap | null {
  const normalized = headers.map((h) => ({
    raw: h,
    key: h
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim(),
  }));

  const find = (...patterns: RegExp[]) =>
    normalized.find((h) => patterns.some((p) => p.test(h.key)))?.raw;

  const date = find(/^data$/, /data\s*(mov|lanc|lanç|trans)/, /dt_/);
  const description = find(
    /historico|histórico|descricao|descrição|memo|lancamento|lançamento|detalhe/,
  );
  const amount = find(/^valor$/, /amount|vlr|value/);
  const credit = find(/credito|crédito|entrada/);
  const debit = find(/debito|débito|saida|saída/);
  const bankTxnId = find(/id|fitid|documento|nro|número|identificador/);
  const balance = find(/saldo/);

  if (!date || !description) return null;
  if (!amount && !credit && !debit) return null;

  return {
    date,
    description,
    amount,
    credit,
    debit,
    bankTxnId,
    balance,
  };
}

export function parseCsvContent(
  content: string,
  options?: {
    delimiter?: string;
    columnMap?: CsvColumnMap;
  },
): ParseResult {
  const delimiter = options?.delimiter || detectCsvDelimiter(content);
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    delimiter,
    relax_column_count: true,
    trim: true,
    bom: true,
  }) as Record<string, string>[];

  if (records.length === 0) {
    return {
      format: "CSV",
      rows: [],
      detectedDelimiter: delimiter,
      warningMessage: "Nenhuma linha encontrada no CSV.",
    };
  }

  const headers = Object.keys(records[0] ?? {});
  const columnMap = options?.columnMap || guessColumnMap(headers);
  if (!columnMap) {
    return {
      format: "CSV",
      rows: [],
      detectedDelimiter: delimiter,
      detectedHeaders: headers,
      warningMessage:
        "Não foi possível mapear automaticamente as colunas. Informe o mapeamento.",
    };
  }

  const rows: NormalizedImportRow[] = records.map((raw, index) => {
    const dateRaw = raw[columnMap.date] ?? "";
    const description = normalizeDescription(raw[columnMap.description]);
    let amountParsed = columnMap.amount
      ? parseFlexibleAmount(raw[columnMap.amount])
      : null;

    if (!amountParsed && (columnMap.credit || columnMap.debit)) {
      const credit = columnMap.credit
        ? parseFlexibleAmount(raw[columnMap.credit])
        : null;
      const debit = columnMap.debit
        ? parseFlexibleAmount(raw[columnMap.debit])
        : null;
      if (credit && Number(credit.absolute) > 0) {
        amountParsed = { absolute: credit.absolute, signed: credit.absolute };
      } else if (debit && Number(debit.absolute) > 0) {
        amountParsed = {
          absolute: debit.absolute,
          signed: `-${debit.absolute}`,
        };
      }
    }

    const classified = classifyByDescription(description);
    const suggestedType = inferTypeFromSignedAmount(
      amountParsed?.signed ?? null,
      classified.type,
    );

    return {
      lineNumber: index + 1,
      raw,
      movementDate: parseFlexibleDate(dateRaw),
      description,
      amount: amountParsed?.absolute ?? null,
      signedAmount: amountParsed?.signed ?? null,
      bankTxnId: columnMap.bankTxnId
        ? normalizeDescription(raw[columnMap.bankTxnId]) || null
        : null,
      balanceAfter: columnMap.balance
        ? parseFlexibleAmount(raw[columnMap.balance])?.signed ?? null
        : null,
      suggestedType,
      needsReview:
        !amountParsed ||
        !parseFlexibleDate(dateRaw) ||
        !description ||
        classified.state === "UNKNOWN",
      reviewNote:
        !amountParsed || !parseFlexibleDate(dateRaw)
          ? "Linha incompleta — revise data/valor."
          : undefined,
    };
  });

  return {
    format: "CSV",
    rows,
    detectedDelimiter: delimiter,
    detectedHeaders: headers,
  };
}
