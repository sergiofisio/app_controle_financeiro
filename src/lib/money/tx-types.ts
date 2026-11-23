/** Espelha o enum Prisma TxType sem importar o client (seguro no browser). */
export type TxType =
  | "INCOME"
  | "EXPENSE"
  | "TRANSFER"
  | "ADJUSTMENT"
  | "CONTRIBUTION"
  | "WITHDRAWAL"
  | "YIELD";
