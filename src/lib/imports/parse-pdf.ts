import type { NormalizedImportRow, ParseResult } from "@/features/imports/types";
import {
  classifyByDescription,
  inferTypeFromSignedAmount,
  normalizeDescription,
  parseFlexibleAmount,
  parseFlexibleDate,
} from "@/lib/imports/normalize";

/**
 * Extrai linhas financeiras de PDF textual.
 * PDFs escaneados (sem camada de texto) retornam aviso, sem inventar dados.
 */
export function parsePdfTextContent(text: string): ParseResult {
  const cleaned = text.replace(/\r/g, "");
  if (!cleaned.trim()) {
    return {
      format: "PDF",
      rows: [],
      warningMessage:
        "PDF sem camada de texto legível (possivelmente digitalizado). Importe CSV/OFX ou um PDF textual.",
    };
  }

  const lines = cleaned
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const rowRegex =
    /^(\d{2}[\/\-]\d{2}[\/\-]\d{2,4})\s+(.+?)\s+(-?\(?R\$\s*)?(-?\d{1,3}(?:\.\d{3})*,\d{2}|\d+[.,]\d{2})\)?\s*$/i;

  let statementBalance: string | null = null;
  let statementBalanceAt: string | null = null;
  const exportBalanceRe =
    /Saldo\s+no\s+dia\s+da\s+exporta[cç][aã]o[^R$]*R\$\s*(-?\d{1,3}(?:\.\d{3})*,\d{2}|-?\d+[.,]\d{2})/i;
  const exportMatch = cleaned.match(exportBalanceRe);
  if (exportMatch?.[1]) {
    const parsedBal = parseFlexibleAmount(exportMatch[1]);
    if (parsedBal) statementBalance = parsedBal.signed;
  }
  const exportDateRe =
    /exporta[cç][aã]o[^\d]*(\d{2}[\/\-]\d{2}[\/\-]\d{2,4})/i;
  const exportDateMatch = cleaned.match(exportDateRe);
  if (exportDateMatch?.[1]) {
    statementBalanceAt = parseFlexibleDate(exportDateMatch[1]);
  }

  const rows: NormalizedImportRow[] = [];
  let lineNumber = 0;

  for (const line of lines) {
    const match = line.match(rowRegex);
    if (!match) continue;
    lineNumber += 1;
    const dateRaw = match[1]!;
    const description = normalizeDescription(match[2]);
    const amountParsed = parseFlexibleAmount(match[4]);
    const classified = classifyByDescription(description);
    const suggestedType = inferTypeFromSignedAmount(
      amountParsed?.signed ?? null,
      classified.type,
    );

    rows.push({
      lineNumber,
      raw: { line },
      movementDate: parseFlexibleDate(dateRaw),
      description,
      amount: amountParsed?.absolute ?? null,
      signedAmount: amountParsed?.signed ?? null,
      bankTxnId: null,
      balanceAfter: null,
      suggestedType,
      needsReview: classified.state === "UNKNOWN" || !amountParsed,
      reviewNote: "Extraído de PDF textual — confira a interpretação.",
    });
  }

  return {
    format: "PDF",
    rows,
    statementBalance,
    statementBalanceAt,
    warningMessage:
      rows.length === 0
        ? "Não foi possível identificar linhas financeiras confiáveis no PDF. Revise o arquivo ou use CSV/OFX."
        : `Foram interpretadas ${rows.length} linha(s). Confirme a prévia antes de gravar.`,
  };
}
