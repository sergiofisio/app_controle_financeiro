import { describe, expect, it } from "vitest";
import {
  calculateBalance,
  cashEffect,
  isOperationalExpense,
  isOperationalIncome,
  parseBRLInput,
  roundBRL,
  splitInstallments,
} from "./index";

describe("roundBRL", () => {
  it("arredonda half-up", () => {
    expect(roundBRL("10.005").toFixed(2)).toBe("10.01");
    expect(roundBRL("10.004").toFixed(2)).toBe("10.00");
  });
});

describe("cashEffect", () => {
  it("receita aumenta caixa", () => {
    expect(cashEffect("INCOME", "100").toString()).toBe("100");
  });
  it("despesa diminui caixa", () => {
    expect(cashEffect("EXPENSE", "40").toString()).toBe("-40");
  });
  it("transferência saída/entrada", () => {
    expect(cashEffect("TRANSFER", "50", { transferDirection: "OUT" }).toString()).toBe(
      "-50",
    );
    expect(cashEffect("TRANSFER", "50", { transferDirection: "IN" }).toString()).toBe(
      "50",
    );
  });
});

describe("operational classification", () => {
  it("não trata transferência como receita/despesa", () => {
    expect(isOperationalIncome("TRANSFER")).toBe(false);
    expect(isOperationalExpense("TRANSFER")).toBe(false);
    expect(isOperationalIncome("CONTRIBUTION")).toBe(false);
    expect(isOperationalExpense("WITHDRAWAL")).toBe(false);
  });
});

describe("calculateBalance", () => {
  it("aplica saldo inicial e movimentos", () => {
    const balance = calculateBalance("1000", [
      { type: "INCOME", amount: "500" },
      { type: "EXPENSE", amount: "200" },
      { type: "TRANSFER", amount: "100", transferDirection: "OUT" },
      { type: "TRANSFER", amount: "100", transferDirection: "IN" },
    ]);
    expect(balance.toString()).toBe("1300");
  });

  it("transferência entre contas não muda patrimônio conjunto", () => {
    const a = calculateBalance("1000", [
      { type: "TRANSFER", amount: "300", transferDirection: "OUT" },
    ]);
    const b = calculateBalance("200", [
      { type: "TRANSFER", amount: "300", transferDirection: "IN" },
    ]);
    expect(a.plus(b).toString()).toBe("1200");
  });
});

describe("splitInstallments", () => {
  it("preserva total em centavos", () => {
    const parts = splitInstallments("100.00", 3);
    expect(parts.map((p) => p.toString())).toEqual(["33.34", "33.33", "33.33"]);
    const sum = parts.reduce((acc, p) => acc.plus(p), roundBRL(0));
    expect(sum.toString()).toBe("100");
  });
});

describe("parseBRLInput", () => {
  it("interpreta formato brasileiro", () => {
    expect(parseBRLInput("R$ 1.234,56").toString()).toBe("1234.56");
  });
});
