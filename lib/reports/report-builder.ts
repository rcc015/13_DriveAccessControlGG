import type { ReportType } from "@/types/domain";

export interface BuiltReport {
  fileName: string;
  mimeType: string;
  content: Buffer;
}

function timestampToken(date = new Date()) {
  const iso = date.toISOString().replace(/[-:]/g, "");
  return iso.slice(0, 13);
}

export function buildJsonReport(reportType: ReportType, payload: unknown): BuiltReport {
  const content = Buffer.from(JSON.stringify(payload, null, 2), "utf8");

  return {
    fileName: `${reportType}_${timestampToken()}.json`,
    mimeType: "application/json",
    content
  };
}
