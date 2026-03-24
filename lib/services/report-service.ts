import { prisma } from "@/lib/db/prisma";
import { getDriveProvider } from "@/lib/google/provider-factory";
import type { DriveProvider } from "@/lib/google/types";
import { buildCsvReport } from "@/lib/reports/report-builder";
import { AuditLogService } from "@/lib/services/audit-log-service";
import type { ReportType } from "@/types/domain";

export class ReportService {
  constructor(
    private drive: DriveProvider = getDriveProvider(),
    private auditLog = new AuditLogService()
  ) {}

  async generateAndArchive(reportType: ReportType, actorEmail: string) {
    const payload = await this.getPayload(reportType);
    const built = buildCsvReport(reportType, payload);
    const quarterLabel = reportType === "QUARTERLY_ACCESS_REVIEW" ? getQuarterLabelFromPayload(payload) : null;
    const reportsFolderId = await this.resolveReportFolderId(reportType, quarterLabel);
    const uploaded = await this.drive.uploadReport(built.fileName, built.mimeType, built.content, reportsFolderId);

    const report = await prisma.generatedReport.create({
      data: {
        reportType,
        generatedByEmail: actorEmail,
        fileName: uploaded.name,
        googleDriveFileId: uploaded.fileId,
        googleDriveUrl: uploaded.webViewLink
      }
    });

    await this.auditLog.record({
      actorEmail,
      actionType: "REPORT_GENERATED",
      result: "SUCCESS",
      notes: `${reportType} uploaded to Google Drive`,
      metadata: {
        reportId: report.id,
        fileId: uploaded.fileId,
        quarterLabel
      }
    });

    return report;
  }

  private async getPayload(reportType: ReportType) {
    switch (reportType) {
      case "GROUP_MEMBERSHIP_SNAPSHOT":
        return prisma.groupMembership.findMany({
          where: { revokedAt: null },
          include: {
            user: true,
            groupMapping: {
              include: { role: true, sharedDrive: true, restrictedFolder: true }
            },
            accessRoleMapping: {
              include: { accessRole: true, sharedDrive: true, restrictedFolder: true }
            }
          }
        });
      case "QUARTERLY_ACCESS_REVIEW":
        return prisma.accessReview.findMany({
          where: { quarterLabel: getCurrentQuarterLabel() },
          include: { items: true }
        });
      case "RESTRICTED_ACCESS_EXCEPTIONS":
        return prisma.accessRequest.findMany({
          where: { restrictedFolderId: { not: null } },
          include: { user: true, restrictedFolder: true }
        });
      case "PERMISSION_MATRIX":
        return [
          ...(await prisma.groupMapping.findMany({
            include: { role: true, sharedDrive: true, restrictedFolder: true }
          })),
          ...(await prisma.accessRoleMapping.findMany({
            include: { accessRole: true, sharedDrive: true, restrictedFolder: true }
          }))
        ];
      case "ACCESS_CHANGE_LOG":
        return prisma.auditLog.findMany({
          orderBy: { happenedAt: "desc" },
          take: 500
        });
      default:
        return { message: `Unsupported report type ${reportType}` };
    }
  }

  private async resolveReportFolderId(reportType: ReportType, quarterLabel: string | null) {
    if (reportType !== "QUARTERLY_ACCESS_REVIEW" || !quarterLabel) {
      return undefined;
    }

    const rootFolderId = process.env.GOOGLE_REPORTS_FOLDER_ID;
    if (!rootFolderId) {
      return undefined;
    }

    const folder = await this.drive.ensureChildFolder(rootFolderId, normalizeQuarterFolderName(quarterLabel));
    return folder.id ?? undefined;
  }
}

function getCurrentQuarterLabel(date = new Date()) {
  const month = date.getUTCMonth();
  const quarter = Math.floor(month / 3) + 1;
  const year = date.getUTCFullYear();
  return `Q${quarter} ${year}`;
}

function getQuarterLabelFromPayload(payload: unknown) {
  if (!Array.isArray(payload) || payload.length === 0) {
    return getCurrentQuarterLabel();
  }

  const first = payload[0] as { quarterLabel?: string | null };
  return first.quarterLabel?.trim() || getCurrentQuarterLabel();
}

function normalizeQuarterFolderName(quarterLabel: string) {
  const match = quarterLabel.match(/^Q([1-4])\s+(\d{4})$/i);
  if (!match) {
    return quarterLabel.replace(/\s+/g, "_").replace(/^Q/i, "") + "_Reports";
  }

  const [, quarter, year] = match;
  return `${year}_Q${quarter}_Reports`;
}
