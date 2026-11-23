import { describe, expect, it } from "vitest";
import { parseCsvContent } from "@/lib/imports/parse-csv";
import { parseOfxContent } from "@/lib/imports/parse-ofx";
import { parsePdfTextContent } from "@/lib/imports/parse-pdf";
import {
  batchDescriptionMatchKey,
  buildCategorySuggestionMap,
  buildFingerprint,
  descriptionMatchKey,
  parseFlexibleAmount,
  parseFlexibleDate,
} from "@/lib/imports/normalize";

describe("parseFlexibleDate", () => {
  it("aceita dd/MM/yyyy e OFX", () => {
    expect(parseFlexibleDate("23/11/2026")).toBe("2026-11-23");
    expect(parseFlexibleDate("20261123120000")).toBe("2026-11-23");
  });
});

describe("parseFlexibleAmount", () => {
  it("interpreta BRL e OFX", () => {
    expect(parseFlexibleAmount("1.234,56")?.absolute).toBe("1234.56");
    expect(parseFlexibleAmount("-50.00")?.signed).toBe("-50.00");
    expect(parseFlexibleAmount("(10,00)")?.signed).toBe("-10.00");
  });
});

describe("parseCsvContent", () => {
  it("detecta colunas brasileiras", () => {
    const csv = `Data;Histórico;Valor
01/10/2026;PIX RECEBIDO JOAO;150,00
02/10/2026;PIX ENVIADO MERCADO;-45,90`;
    const result = parseCsvContent(csv);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]?.suggestedType).toBe("INCOME");
    expect(result.rows[1]?.suggestedType).toBe("EXPENSE");
    expect(result.rows[1]?.amount).toBe("45.90");
  });
});

describe("parseOfxContent", () => {
  it("extrai STMTTRN com FITID", () => {
    const ofx = `
OFXHEADER:100
<OFX>
<BANKMSGSRSV1>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20261002
<TRNAMT>-45.90
<FITID>ABC123
<MEMO>PIX ENVIADO MERCADO
</STMTTRN>
</BANKMSGSRSV1>
</OFX>`;
    const result = parseOfxContent(ofx);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.bankTxnId).toBe("ABC123");
    expect(result.rows[0]?.amount).toBe("45.90");
    expect(result.rows[0]?.signedAmount).toBe("-45.90");
  });
});

describe("parsePdfTextContent", () => {
  it("não inventa linhas em PDF vazio", () => {
    const result = parsePdfTextContent("   ");
    expect(result.rows).toHaveLength(0);
    expect(result.warningMessage).toMatch(/sem camada de texto/i);
  });

  it("extrai linha textual simples", () => {
    const result = parsePdfTextContent(
      "02/10/2026 SUPERMERCADO XYZ 45,90\nSaldo do dia",
    );
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.description).toContain("SUPERMERCADO");
  });
});

describe("buildFingerprint", () => {
  it("é estável para mesmos dados", () => {
    const a = buildFingerprint({
      accountId: "acc1",
      movementDate: "2026-10-02",
      amount: "45.90",
      description: "PIX ENVIADO",
      bankTxnId: "ABC",
    });
    const b = buildFingerprint({
      accountId: "acc1",
      movementDate: "2026-10-02",
      amount: "45.90",
      description: "pix enviado",
      bankTxnId: "ABC",
    });
    expect(a).toBe(b);
  });
});

describe("descriptionMatchKey", () => {
  it("gera chave estável para merchant com sufixos diferentes", () => {
    const a = descriptionMatchKey(
      "PADARIA E CONFEITARIA SAO BERNARDO LOJA 01",
    );
    const b = descriptionMatchKey(
      "Padaria e Confeitaria Sao Bernardo Centro",
    );
    expect(a).toBe("PADARIA CONFEITARIA SAO BERNARDO");
    expect(a).toBe(b);
  });

  it("remove prefixos de PIX/TED e mantém beneficiário", () => {
    expect(descriptionMatchKey("PIX ENVIADO MERCADO LIVRE")).toBe(
      "MERCADO LIVRE",
    );
    expect(descriptionMatchKey("TRANSF ENVIADA PIX LIVANCE SERVICOS")).toBe(
      "LIVANCE SERVICOS",
    );
  });

  it("ignora descrições genéricas sem merchant", () => {
    expect(descriptionMatchKey("TRANSF ENVIADA PIX")).toBeNull();
    expect(descriptionMatchKey("PIX ENVIADO")).toBeNull();
    expect(descriptionMatchKey("PIX")).toBeNull();
    expect(descriptionMatchKey("   ")).toBeNull();
  });
});

describe("batchDescriptionMatchKey", () => {
  it("agrupa merchants parecidos como descriptionMatchKey", () => {
    expect(
      batchDescriptionMatchKey("PADARIA E CONFEITARIA SAO BERNARDO LOJA 01"),
    ).toBe(
      batchDescriptionMatchKey("Padaria e Confeitaria Sao Bernardo Centro"),
    );
  });

  it("agrupa textos genéricos idênticos no lote", () => {
    const a = batchDescriptionMatchKey("TRANSF ENVIADA PIX");
    const b = batchDescriptionMatchKey("transf enviada pix");
    expect(a).toBe("TRANSF ENVIADA PIX");
    expect(a).toBe(b);
  });
});

describe("buildCategorySuggestionMap", () => {
  it("escolhe a categoria mais frequente por chave", () => {
    const map = buildCategorySuggestionMap([
      {
        description: "PADARIA E CONFEITARIA SAO BERNARDO",
        categoryId: "cat-food",
        type: "EXPENSE",
      },
      {
        description: "PADARIA E CONFEITARIA SAO BERNARDO CENTRO",
        categoryId: "cat-other",
        type: "EXPENSE",
      },
      {
        description: "PADARIA E CONFEITARIA SAO BERNARDO LOJA 2",
        categoryId: "cat-food",
        type: "EXPENSE",
      },
      {
        description: "TRANSF ENVIADA PIX",
        categoryId: "cat-transfer",
        type: "EXPENSE",
      },
    ]);

    expect(map.get("PADARIA CONFEITARIA SAO BERNARDO")?.categoryId).toBe(
      "cat-food",
    );
    expect(map.has("TRANSF ENVIADA PIX")).toBe(false);
  });

  it("em empate usa a ocorrência mais recente", () => {
    const map = buildCategorySuggestionMap([
      {
        description: "LIVANCE SERVICOS DE APOIO ADM",
        categoryId: "cat-old",
        type: "EXPENSE",
      },
      {
        description: "LIVANCE SERVICOS DE APOIO ADM LTDA",
        categoryId: "cat-new",
        type: "EXPENSE",
      },
    ]);
    expect(map.get("LIVANCE SERVICOS APOIO ADM")?.categoryId).toBe("cat-new");
  });
});
