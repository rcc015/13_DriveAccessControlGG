import { prisma } from "@/lib/db/prisma";
import { getDriveProvider } from "@/lib/google/provider-factory";
import type { DriveProvider } from "@/lib/google/types";
import { buildJsonReport } from "@/lib/reports/report-builder";
import { AuditLogService } from "@/lib/services/audit-log-service";
import type { ReportType } from "@/types/domain";

export class ReportService {
  constructor(
    private drive: DriveProvider = getDriveProvider(),
    private auditLog = new AuditLogService()
  ) {}

  async generateAndArchive(reportType: ReportType, actorEmail: string) {
    const payload = await this.getPayload(reportType);
    const built = buildJsonReport(reportType, payload);
    const uploaded = await this.drive.uploadReport(built.fileName, built.mimeType, built.content);

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
        fileId: uploaded.fileId
      }
    });

    return report;
  }

  private async getPayload(reportType: ReportType) {
    switch (reportType) {
      case "GROUP_MEMBERSHIP_SNAPSHOT":
        return prisma.groupMembership.findMany({
          where: { revokedAt: null },
          include: { user: true, groupMapping: true }
        });
      case "QUARTERLY_ACCESS_REVIEW":
        return prisma.accessReview.findMany({
          include: { items: true }
        });
      case "RESTRICTED_ACCESS_EXCEPTIONS":
        return prisma.accessRequest.findMany({
          where: { restrictedFolderId: { not: null } },
          include: { user: true, restrictedFolder: true }
        });
      case "PERMISSION_MATRIX":
        return prisma.groupMapping.findMany({
          include: { role: true, sharedDrive: true, restrictedFolder: true }
        });
      case "ACCESS_CHANGE_LOG":
        return prisma.auditLog.findMany({
          orderBy: { happenedAt: "desc" },
          take: 500
        });
      default:
        return { message: `Unsupported report type ${reportType}` };
    }
  }
}
