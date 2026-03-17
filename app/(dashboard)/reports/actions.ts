"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { ReportService } from "@/lib/services/report-service";
import type { ReportType } from "@/types/domain";

const reportTypes: ReportType[] = [
  "GROUP_MEMBERSHIP_SNAPSHOT",
  "QUARTERLY_ACCESS_REVIEW",
  "RESTRICTED_ACCESS_EXCEPTIONS",
  "PERMISSION_MATRIX",
  "ACCESS_CHANGE_LOG"
];

export async function generateReport(formData: FormData) {
  const session = await requireSession();
  const reportType = String(formData.get("reportType") ?? "").trim() as ReportType;

  if (!reportTypes.includes(reportType)) {
    throw new Error("Unsupported report type.");
  }

  const service = new ReportService();
  await service.generateAndArchive(reportType, session.email);

  revalidatePath("/reports");
}
