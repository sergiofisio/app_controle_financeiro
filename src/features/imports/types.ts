export type NormalizedImportRow = {
  lineNumber: number;
  raw: Record<string, string>;
  movementDate: string | null; // yyyy-MM-dd
  description: string | null;
  amount: string | null; // absolute positive
  signedAmount: string | null; // +entrada / -saída
  bankTxnId: string | null;
  balanceAfter: string | null;
  suggestedType: "INCOME" | "EXPENSE" | "TRANSFER" | "YIELD" | "ADJUSTMENT" | null;
  needsReview: boolean;
  reviewNote?: string;
};

export type CsvColumnMap = {
  date: string;
  description: string;
  amount?: string;
  credit?: string;
  debit?: string;
  bankTxnId?: string;
  balance?: string;
};

export type ParseResult = {
  format: "CSV" | "OFX" | "PDF";
  rows: NormalizedImportRow[];
  warningMessage?: string;
  detectedDelimiter?: string;
  detectedHeaders?: string[];
  /** Saldo do extrato no dia da exportação / LEDGERBAL, se disponível. */
  statementBalance?: string | null;
  statementBalanceAt?: string | null; // yyyy-MM-dd
};
