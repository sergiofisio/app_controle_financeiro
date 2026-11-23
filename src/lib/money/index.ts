import Decimal from "decimal.js";
import type { TxType } from "@/lib/money/tx-types";

export type { TxType } from "@/lib/money/tx-types";
export type DecimalLike = Decimal.Value;
export type MoneyDecimal = Decimal.Instance;
export { Decimal };

/** Arredonda para 2 casas (BRL) com HALF_UP. */
export function roundBRL(value: DecimalLike): MoneyDecimal {
  return new Decimal(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

export function toDecimal(value: DecimalLike): MoneyDecimal {
  return roundBRL(value);
}

export function decimalToNumber(value: DecimalLike): number {
  return roundBRL(value).toNumber();
}

export function addMoney(...values: DecimalLike[]): MoneyDecimal {
  let acc = new Decimal(0);
  for (const v of values) {
    acc = acc.plus(toDecimal(v));
  }
  return roundBRL(acc);
}

export function subMoney(a: DecimalLike, b: DecimalLike): MoneyDecimal {
  return roundBRL(toDecimal(a).minus(toDecimal(b)));
}

/**
 * Efeito no saldo da conta bancária.
 * Valor do lançamento é sempre positivo; o sinal depende do tipo e da direção.
 */
export function cashEffect(
  type: TxType,
  amount: DecimalLike,
  options?: { transferDirection?: "OUT" | "IN" },
): MoneyDecimal {
  const value = toDecimal(amount);
  switch (type) {
    case "INCOME":
    case "YIELD":
    case "CONTRIBUTION":
      return value;
    case "EXPENSE":
    case "WITHDRAWAL":
      return value.negated();
    case "TRANSFER":
      if (options?.transferDirection === "IN") return value;
      return value.negated();
    case "ADJUSTMENT":
      return value;
    default:
      return new Decimal(0);
  }
}

export function isOperationalIncome(type: TxType): boolean {
  return type === "INCOME" || type === "YIELD";
}

export function isOperationalExpense(type: TxType): boolean {
  return type === "EXPENSE";
}

export function affectsIncomeExpense(type: TxType): boolean {
  return isOperationalIncome(type) || isOperationalExpense(type);
}

export function calculateBalance(
  initialBalance: DecimalLike,
  movements: Array<{
    type: TxType;
    amount: DecimalLike;
    transferDirection?: "OUT" | "IN";
  }>,
): MoneyDecimal {
  let balance = toDecimal(initialBalance);
  for (const m of movements) {
    balance = balance.plus(
      cashEffect(m.type, m.amount, {
        transferDirection: m.transferDirection,
      }),
    );
  }
  return roundBRL(balance);
}

/** Divide valor em N parcelas BRL sem perder centavos. */
export function splitInstallments(
  total: DecimalLike,
  parts: number,
): MoneyDecimal[] {
  if (parts < 1) throw new Error("Parcelas inválidas");
  const totalDec = toDecimal(total);
  const base = totalDec.div(parts).toDecimalPlaces(2, Decimal.ROUND_DOWN);
  const result: MoneyDecimal[] = Array.from({ length: parts }, () => base);
  let remainder = totalDec.minus(base.mul(parts));
  let i = 0;
  while (remainder.greaterThan(0)) {
    result[i] = result[i]!.plus("0.01");
    remainder = remainder.minus("0.01");
    i = (i + 1) % parts;
  }
  return result.map(roundBRL);
}

export function parseBRLInput(raw: string): MoneyDecimal {
  const cleaned = raw
    .trim()
    .replace(/\s/g, "")
    .replace(/R\$\s?/i, "")
    .replace(/\./g, "")
    .replace(",", ".");
  if (!cleaned || Number.isNaN(Number(cleaned))) {
    throw new Error("Valor inválido");
  }
  return toDecimal(cleaned);
}
