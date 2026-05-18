import { prisma } from "@/lib/db/prisma";
import { getDriveProvider } from "@/lib/google/provider-factory";
import type { DriveProvider } from "@/lib/google/types";
import { buildCsvReport } from "@/lib/reports/report-builder";
import { normalizeQuarterFolderName } from "@/lib/reports/quarterly-access-review";
import { AuditLogService } from "@/lib/services/audit-log-service";
import { QuarterlyAccessReviewService } from "@/lib/services/quarterly-access-review-service";
import type { ReportType } from "@/types/domain";

export class ReportService {
  constructor(
    private drive: DriveProvider = getDriveProvider(),
    private auditLog = new AuditLogService(),
    private quarterlyAccessReview = new QuarterlyAccessReviewService()
  ) {}

  async generateAndArchive(reportType: ReportType, actorEmail: string) {
    const result = await this.getPayload(reportType, actorEmail);
    const payload = result.payload;
    const built = buildCsvReport(reportType, payload);
    const quarterLabel = result.quarterLabel;
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
        quarterLabel,
        rowCount: result.rowCount,
        itemsCreated: result.itemsCreated,
        itemsReused: result.itemsReused,
        reviewCreated: result.reviewCreated,
        warning: result.warning
      }
    });

    return {
      report,
      quarterLabel,
      rowCount: result.rowCount,
      itemsCreated: result.itemsCreated,
      itemsReused: result.itemsReused,
      reviewCreated: result.reviewCreated,
      warning: result.warning,
      googleDriveUrl: uploaded.webViewLink
    };
  }

  private async getPayload(reportType: ReportType, actorEmail: string) {
    switch (reportType) {
      case "GROUP_MEMBERSHIP_SNAPSHOT":
        return {
          payload: await prisma.groupMembership.findMany({
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
          }),
          quarterLabel: null,
          rowCount: 0,
          itemsCreated: 0,
          itemsReused: 0,
          reviewCreated: false,
          warning: null
        };
      case "QUARTERLY_ACCESS_REVIEW":
        return this.quarterlyAccessReview.ensureCurrentQuarterReview(actorEmail);
      case "RESTRICTED_ACCESS_EXCEPTIONS":
        return {
          payload: await prisma.accessRequest.findMany({
            include: {
              user: true,
              restrictedFolder: true,
              accessRole: true,
              sharedDrive: true
            }
          }),
          quarterLabel: null,
          rowCount: 0,
          itemsCreated: 0,
          itemsReused: 0,
          reviewCreated: false,
          warning: null
        };
      case "PERMISSION_MATRIX":
        return {
          payload: [
            ...(await prisma.groupMapping.findMany({
              include: { role: true, sharedDrive: true, restrictedFolder: true }
            })),
            ...(await prisma.accessRoleMapping.findMany({
              include: { accessRole: true, sharedDrive: true, restrictedFolder: true }
            }))
          ],
          quarterLabel: null,
          rowCount: 0,
          itemsCreated: 0,
          itemsReused: 0,
          reviewCreated: false,
          warning: null
        };
      case "ACCESS_CHANGE_LOG":
        return {
          payload: await prisma.auditLog.findMany({
            orderBy: { happenedAt: "desc" },
            take: 500
          }),
          quarterLabel: null,
          rowCount: 0,
          itemsCreated: 0,
          itemsReused: 0,
          reviewCreated: false,
          warning: null
        };
      default:
        return {
          payload: { message: `Unsupported report type ${reportType}` },
          quarterLabel: null,
          rowCount: 0,
          itemsCreated: 0,
          itemsReused: 0,
          reviewCreated: false,
          warning: null
        };
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
