"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
  try {
    const result = await service.generateAndArchive(reportType, session.email);
    revalidatePath("/reports");
    revalidatePath("/access-reviews");

    const params = new URLSearchParams({
      reportType,
      status: result.warning ? "warning" : "success",
      rows: String(result.rowCount),
      itemsCreated: String(result.itemsCreated),
      itemsReused: String(result.itemsReused),
      reviewCreated: String(result.reviewCreated),
      driveUrl: result.googleDriveUrl
    });

    if (result.quarterLabel) {
      params.set("quarter", result.quarterLabel);
    }

    if (result.warning) {
      params.set("message", result.warning);
    } else if (reportType === "QUARTERLY_ACCESS_REVIEW") {
      params.set(
        "message",
        `Quarterly Access Review generated for ${result.quarterLabel} with ${result.rowCount} review rows.`
      );
    } else {
      params.set("message", `${reportType.replaceAll("_", " ")} generated successfully.`);
    }

    redirect(`/reports?${params.toString()}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown report generation error.";
    redirect(`/reports?status=error&reportType=${encodeURIComponent(reportType)}&message=${encodeURIComponent(message)}`);
  }
}
