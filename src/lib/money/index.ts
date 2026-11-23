import { Prisma } from "@/generated/prisma/client";
import type { TxType } from "@/generated/prisma/client";

export type Decimal = Prisma.Decimal;
export type DecimalLike = Decimal | string | number;

const DecimalCtor = Prisma.Decimal;

/** Arredonda para 2 casas (BRL) com HALF_UP. */
export function roundBRL(value: DecimalLike): Decimal {
  return new DecimalCtor(value).toDecimalPlaces(2, DecimalCtor.ROUND_HALF_UP);
}

export function toDecimal(value: DecimalLike): Decimal {
  return roundBRL(value);
}

export function decimalToNumber(value: DecimalLike): number {
  return roundBRL(value).toNumber();
}

export function addMoney(...values: DecimalLike[]): Decimal {
  let acc = new DecimalCtor(0);
  for (const v of values) {
    acc = acc.plus(toDecimal(v));
  }
  return roundBRL(acc);
}

export function subMoney(a: DecimalLike, b: DecimalLike): Decimal {
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
): Decimal {
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
      return new DecimalCtor(0);
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
): Decimal {
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
export function splitInstallments(total: DecimalLike, parts: number): Decimal[] {
  if (parts < 1) throw new Error("Parcelas inválidas");
  const totalDec = toDecimal(total);
  const base = totalDec.div(parts).toDecimalPlaces(2, DecimalCtor.ROUND_DOWN);
  const result: Decimal[] = Array.from({ length: parts }, () => base);
  let remainder = totalDec.minus(base.mul(parts));
  let i = 0;
  while (remainder.greaterThan(0)) {
    result[i] = result[i]!.plus("0.01");
    remainder = remainder.minus("0.01");
    i = (i + 1) % parts;
  }
  return result.map(roundBRL);
}

export function parseBRLInput(raw: string): Decimal {
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
