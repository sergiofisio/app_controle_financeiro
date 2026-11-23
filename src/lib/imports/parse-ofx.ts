import type { NormalizedImportRow, ParseResult } from "@/features/imports/types";
import {
  classifyByDescription,
  inferTypeFromSignedAmount,
  normalizeDescription,
  parseFlexibleAmount,
  parseFlexibleDate,
} from "@/lib/imports/normalize";

function extractTag(block: string, tag: string): string | null {
  const re = new RegExp(`<${tag}>([^\\r\\n<]*)`, "i");
  const match = block.match(re);
  return match?.[1]?.trim() || null;
}

export function parseOfxContent(content: string): ParseResult {
  const normalized = content.replace(/\r\n/g, "\n");
  if (!/<OFX>/i.test(normalized) && !/OFXHEADER/i.test(normalized)) {
    return {
      format: "OFX",
      rows: [],
      warningMessage: "Arquivo OFX inválido ou sem cabeçalho reconhecível.",
    };
  }

  const stmtBlocks = normalized.split(/<STMTTRN>/i).slice(1);
  const rows: NormalizedImportRow[] = [];

  stmtBlocks.forEach((chunk, index) => {
    const block = chunk.split(/<\/STMTTRN>/i)[0] ?? chunk;
    const trnamt = extractTag(block, "TRNAMT");
    const dtposted = extractTag(block, "DTPOSTED");
    const memo =
      extractTag(block, "MEMO") ||
      extractTag(block, "NAME") ||
      extractTag(block, "PAYEE");
    const fitid = extractTag(block, "FITID");
    const trntype = extractTag(block, "TRNTYPE");

    const amountParsed = parseFlexibleAmount(trnamt);
    const description = normalizeDescription(memo);
    const classified = classifyByDescription(
      [description, trntype].filter(Boolean).join(" "),
    );
    const suggestedType = inferTypeFromSignedAmount(
      amountParsed?.signed ?? null,
      classified.type,
    );

    rows.push({
      lineNumber: index + 1,
      raw: {
        TRNAMT: trnamt ?? "",
        DTPOSTED: dtposted ?? "",
        MEMO: memo ?? "",
        FITID: fitid ?? "",
        TRNTYPE: trntype ?? "",
      },
      movementDate: parseFlexibleDate(dtposted),
      description,
      amount: amountParsed?.absolute ?? null,
      signedAmount: amountParsed?.signed ?? null,
      bankTxnId: fitid,
      balanceAfter: null,
      suggestedType,
      needsReview: !amountParsed || !dtposted || !description,
      reviewNote: !fitid ? "Sem FITID — duplicação por fingerprint." : undefined,
    });
  });

  return {
    format: "OFX",
    rows,
    warningMessage:
      rows.length === 0
        ? "Nenhuma transação STMTTRN encontrada no OFX."
        : undefined,
  };
}
