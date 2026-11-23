import { createHash } from "crypto";
import { parseBRLInput, roundBRL, toDecimal } from "@/lib/money";

export function normalizeDescription(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

/** Remove acentos e normaliza para comparação de descrição. */
export function foldDescription(value: string | null | undefined): string {
  return normalizeDescription(value)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toUpperCase();
}

const DESCRIPTION_NOISE_PREFIXES = [
  /^PIX\s+(ENVIADO|RECEBIDO|DEBITADO|CREDITADO|ENVIADA|RECEBIDA)\b\s*/,
  /^TRANSF(?:ERENCIA)?\s+(ENVIADA|RECEBIDA|ENVIADO|RECEBIDO)\s+PIX\b\s*/,
  /^TRANSF(?:ERENCIA)?\s+(ENVIADA|RECEBIDA|ENVIADO|RECEBIDO)\b\s*/,
  /^TED\s+(ENVIADA|RECEBIDA)\b\s*/,
  /^DOC\s+(ENVIADO|RECEBIDO)\b\s*/,
  /^PAGAMENTO\s+(DE\s+)?/,
  /^COMPRA\s+(COM\s+CARTAO|NO\s+DEBITO|NO\s+CREDITO)?\s*/,
  /^DEBITO\s+AUTOMATICO\b\s*/,
  /^TARIFA\s+(BANCARIA\s*)?/,
];

const GENERIC_MATCH_KEYS = new Set([
  "",
  "PIX",
  "TED",
  "DOC",
  "TRANSF",
  "TRANSFER",
  "TRANSFERENCIA",
  "PAGAMENTO",
  "COMPRA",
  "DEBITO",
  "CREDITO",
  "TARIFA",
  "TRANSF ENVIADA",
  "TRANSF RECEBIDA",
  "TRANSF ENVIADA PIX",
  "TRANSF RECEBIDA PIX",
  "PIX ENVIADO",
  "PIX RECEBIDO",
  "TED ENVIADA",
  "TED RECEBIDA",
]);

const STOP_TOKENS = new Set([
  "DE",
  "DA",
  "DO",
  "DAS",
  "DOS",
  "E",
  "EM",
  "NO",
  "NA",
  "NOS",
  "NAS",
  "PARA",
  "COM",
  "A",
  "O",
  "AO",
  "À",
]);

/**
 * Chave estável para agrupar descrições parecidas de extrato.
 * Retorna null quando a descrição é genérica demais para categorizar com segurança.
 */
export function descriptionMatchKey(
  description: string | null | undefined,
): string | null {
  let text = foldDescription(description);
  if (!text) return null;

  // Remove códigos longos / números de documento no final
  text = text
    .replace(/\b\d{6,}\b/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  for (const prefix of DESCRIPTION_NOISE_PREFIXES) {
    text = text.replace(prefix, "").trim();
  }

  const tokens = text
    .split(" ")
    .filter((t) => t.length > 1 && !STOP_TOKENS.has(t));

  if (tokens.length === 0) return null;

  const key = tokens.slice(0, 4).join(" ");
  if (GENERIC_MATCH_KEYS.has(key)) return null;
  if (key.length < 4) return null;

  return key;
}

export type CategorySuggestion = {
  categoryId: string;
  txType: string | null;
};

/**
 * Constrói mapa chave → categoria mais frequente (empate: última ocorrência).
 */
export function buildCategorySuggestionMap(
  rows: Array<{
    description: string | null;
    categoryId: string | null;
    type?: string | null;
  }>,
): Map<string, CategorySuggestion> {
  const counts = new Map<
    string,
    Map<string, { count: number; txType: string | null; lastIndex: number }>
  >();

  rows.forEach((row, index) => {
    if (!row.categoryId) return;
    const key = descriptionMatchKey(row.description);
    if (!key) return;

    let byCategory = counts.get(key);
    if (!byCategory) {
      byCategory = new Map();
      counts.set(key, byCategory);
    }
    const prev = byCategory.get(row.categoryId);
    byCategory.set(row.categoryId, {
      count: (prev?.count ?? 0) + 1,
      txType: row.type ?? prev?.txType ?? null,
      lastIndex: index,
    });
  });

  const result = new Map<string, CategorySuggestion>();
  for (const [key, byCategory] of counts) {
    let best: {
      categoryId: string;
      count: number;
      txType: string | null;
      lastIndex: number;
    } | null = null;
    for (const [categoryId, stats] of byCategory) {
      if (
        !best ||
        stats.count > best.count ||
        (stats.count === best.count && stats.lastIndex > best.lastIndex)
      ) {
        best = { categoryId, ...stats };
      }
    }
    if (best) {
      result.set(key, {
        categoryId: best.categoryId,
        txType: best.txType,
      });
    }
  }
  return result;
}

export function parseFlexibleDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value) return null;

  // yyyy-MM-dd or yyyyMMdd
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  if (/^\d{8}$/.test(value)) {
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
  }

  // dd/MM/yyyy or dd-MM-yyyy
  const br = value.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (br) {
    const day = br[1]!.padStart(2, "0");
    const month = br[2]!.padStart(2, "0");
    let year = br[3]!;
    if (year.length === 2) year = `20${year}`;
    return `${year}-${month}-${day}`;
  }

  // OFX YYYYMMDDHHMMSS[.XXX][tz]
  const ofx = value.match(/^(\d{4})(\d{2})(\d{2})/);
  if (ofx) return `${ofx[1]}-${ofx[2]}-${ofx[3]}`;

  return null;
}

export function parseFlexibleAmount(raw: string | null | undefined): {
  absolute: string;
  signed: string;
} | null {
  if (raw == null) return null;
  const trimmed = String(raw).trim();
  if (!trimmed || trimmed === "-" || trimmed === "+") return null;

  try {
    // OFX usa ponto decimal e sinal prefixado
    if (/^[+-]?\d+(\.\d+)?$/.test(trimmed.replace(/\s/g, ""))) {
      const signed = roundBRL(trimmed.replace(/\s/g, ""));
      return {
        absolute: signed.abs().toFixed(2),
        signed: signed.toFixed(2),
      };
    }

    const negative =
      trimmed.includes("(") ||
      trimmed.trim().startsWith("-") ||
      /-$/.test(trimmed.trim());
    const cleaned = trimmed.replace(/[()]/g, "").replace(/^\+/, "");
    const value = parseBRLInput(cleaned.replace(/^-/, "").replace(/-$/, ""));
    const signed = negative ? value.negated() : value;
    return {
      absolute: value.toFixed(2),
      signed: signed.toFixed(2),
    };
  } catch {
    return null;
  }
}

export function buildFingerprint(input: {
  accountId: string;
  movementDate: string | null;
  amount: string | null;
  description: string | null;
  bankTxnId: string | null;
}): string {
  const base = [
    input.accountId,
    input.bankTxnId || "",
    input.movementDate || "",
    input.amount || "",
    normalizeDescription(input.description).toUpperCase(),
  ].join("|");
  return createHash("sha256").update(base).digest("hex");
}

export function hashFileContent(content: string | Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}

export function classifyByDescription(
  description: string | null,
): {
  type: "INCOME" | "EXPENSE" | "TRANSFER" | "YIELD" | "ADJUSTMENT" | null;
  state: "AUTO" | "SUGGESTED" | "UNKNOWN";
} {
  const text = normalizeDescription(description).toUpperCase();
  if (!text) return { type: null, state: "UNKNOWN" };

  if (
    /ESTORNO|DEVOLUCAO|DEVOLUÇÃO|REEMBOLSO/.test(text)
  ) {
    return { type: "ADJUSTMENT", state: "SUGGESTED" };
  }
  if (/RENDIMENTO|JUROS CREDIT|REMUNERACAO|REMUNERAÇÃO/.test(text)) {
    return { type: "YIELD", state: "SUGGESTED" };
  }
  if (
    /TED|DOC|PIX|TRANSF|TRANSFER/.test(text) &&
    /(ENTRE CONTAS|OWN|MESMA TITULARIDADE|RESGATE|APLICACAO|APLICAÇÃO)/.test(
      text,
    )
  ) {
    return { type: "TRANSFER", state: "SUGGESTED" };
  }
  if (/PIX\s+(RECEBIDO|CREDITADO)|TED\s+RECEBIDA|CREDITO PIX|CR[EÉ]DITO/.test(text)) {
    return { type: "INCOME", state: "SUGGESTED" };
  }
  if (/PIX\s+(ENVIADO|DEBITADO)|TED\s+ENVIADA|PAGAMENTO|DEBITO|D[EÉ]BITO|COMPRA|TARIFA/.test(text)) {
    return { type: "EXPENSE", state: "SUGGESTED" };
  }

  return { type: null, state: "UNKNOWN" };
}

export function inferTypeFromSignedAmount(
  signedAmount: string | null,
  suggested: "INCOME" | "EXPENSE" | "TRANSFER" | "YIELD" | "ADJUSTMENT" | null,
): "INCOME" | "EXPENSE" | "TRANSFER" | "YIELD" | "ADJUSTMENT" {
  if (suggested === "TRANSFER" || suggested === "YIELD" || suggested === "ADJUSTMENT") {
    return suggested;
  }
  if (!signedAmount) return suggested === "INCOME" ? "INCOME" : "EXPENSE";
  const n = toDecimal(signedAmount);
  if (n.isNegative()) return "EXPENSE";
  return "INCOME";
}
