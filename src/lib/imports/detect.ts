export function detectImportFormat(
  fileName: string,
  content: string,
): "CSV" | "OFX" | "PDF" | null {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".ofx") || lower.endsWith(".qfx")) return "OFX";
  if (lower.endsWith(".pdf")) return "PDF";
  if (lower.endsWith(".csv") || lower.endsWith(".txt")) {
    if (content.includes("<OFX>") || content.includes("OFXHEADER")) return "OFX";
    return "CSV";
  }
  if (content.includes("<OFX>") || content.includes("OFXHEADER")) return "OFX";
  if (content.startsWith("%PDF")) return "PDF";
  if (content.includes(";") || content.includes(",")) return "CSV";
  return null;
}

export function detectCsvDelimiter(sample: string): ";" | "," | "\t" {
  const firstLines = sample.split(/\r?\n/).slice(0, 5).join("\n");
  const counts = {
    ";": (firstLines.match(/;/g) || []).length,
    ",": (firstLines.match(/,/g) || []).length,
    "\t": (firstLines.match(/\t/g) || []).length,
  };
  if (counts[";"] >= counts[","] && counts[";"] >= counts["\t"]) return ";";
  if (counts["\t"] >= counts[","]) return "\t";
  return ",";
}

export function decodeBuffer(buffer: Buffer): string {
  const utf8 = buffer.toString("utf8");
  // Heurística simples para Latin1 comum em extratos BR
  if (utf8.includes("�") || /[\x80-\xff]/.test(buffer.toString("binary"))) {
    const latin1 = buffer.toString("latin1");
    const badUtf8 = (utf8.match(/�/g) || []).length;
    if (badUtf8 > 0) return latin1;
  }
  return utf8;
}
