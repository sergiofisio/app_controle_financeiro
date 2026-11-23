import type { CsvColumnMap, ParseResult } from "@/features/imports/types";
import { decodeBuffer, detectImportFormat } from "@/lib/imports/detect";
import { parseCsvContent } from "@/lib/imports/parse-csv";
import { parseOfxContent } from "@/lib/imports/parse-ofx";
import { parsePdfTextContent } from "@/lib/imports/parse-pdf";

export async function parseStatementFile(input: {
  fileName: string;
  buffer: Buffer;
  csvColumnMap?: CsvColumnMap;
  csvDelimiter?: string;
}): Promise<ParseResult> {
  const format = detectImportFormat(
    input.fileName,
    input.buffer.slice(0, 2048).toString("utf8"),
  );

  if (!format) {
    return {
      format: "CSV",
      rows: [],
      warningMessage: "Formato de arquivo não suportado. Use CSV, OFX ou PDF textual.",
    };
  }

  if (format === "PDF") {
    try {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: input.buffer });
      try {
        const parsed = await parser.getText();
        return parsePdfTextContent(parsed.text || "");
      } finally {
        await parser.destroy().catch(() => undefined);
      }
    } catch {
      return {
        format: "PDF",
        rows: [],
        warningMessage:
          "Falha ao ler o PDF. Verifique se o arquivo possui texto selecionável.",
      };
    }
  }

  const content = decodeBuffer(input.buffer);
  if (format === "OFX") return parseOfxContent(content);
  return parseCsvContent(content, {
    columnMap: input.csvColumnMap,
    delimiter: input.csvDelimiter,
  });
}

export * from "@/lib/imports/normalize";
export * from "@/lib/imports/detect";
export * from "@/lib/imports/parse-csv";
export * from "@/lib/imports/parse-ofx";
export * from "@/lib/imports/parse-pdf";
