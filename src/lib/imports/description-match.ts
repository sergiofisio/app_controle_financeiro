/** Helpers de matching de descrição — seguros para client e server. */

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

/**
 * Chave para propagação explícita dentro do mesmo lote de importação.
 */
export function batchDescriptionMatchKey(
  description: string | null | undefined,
): string | null {
  const merchantKey = descriptionMatchKey(description);
  if (merchantKey) return merchantKey;
  const folded = foldDescription(description);
  return folded || null;
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
