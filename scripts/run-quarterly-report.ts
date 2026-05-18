import { prisma } from "@/lib/db/prisma";
import { env } from "@/lib/config/env";
import { getQuarterInfo } from "@/lib/reports/quarterly-access-review";
import { ReportService } from "@/lib/services/report-service";

function getNumericMetadataField(metadata: unknown, key: string) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

async function main() {
  const force = process.argv.includes("--force");
  const quarter = getQuarterInfo();
  const quarterLabel = quarter.label;
  const quarterStart = quarter.startAt;

  const existing = await prisma.generatedReport.findFirst({
    where: {
      reportType: "QUARTERLY_ACCESS_REVIEW",
      generatedAt: { gte: quarterStart }
    },
    orderBy: { generatedAt: "desc" }
  });

  let latestExistingRowCount: number | null = null;

  if (existing) {
    const latestGenerationAudit = await prisma.auditLog.findFirst({
      where: {
        actionType: "REPORT_GENERATED",
        metadataJson: {
          path: ["reportId"],
          equals: existing.id
        }
      },
      orderBy: { happenedAt: "desc" }
    });

    latestExistingRowCount = getNumericMetadataField(latestGenerationAudit?.metadataJson, "rowCount");
  }

  if (existing && !force && latestExistingRowCount !== 0) {
    console.log(
      JSON.stringify(
        {
          status: "skipped",
          reason: `Quarterly report already exists for ${quarterLabel}.`,
          reportId: existing.id,
          fileName: existing.fileName,
          generatedAt: existing.generatedAt.toISOString(),
          googleDriveUrl: existing.googleDriveUrl,
          rowCount: latestExistingRowCount
        },
        null,
        2
      )
    );
    return;
  }

  const actorEmail = env.GOOGLE_IMPERSONATED_ADMIN ?? "rbac@conceivable.life";
  const service = new ReportService();
  const report = await service.generateAndArchive("QUARTERLY_ACCESS_REVIEW", actorEmail);

  console.log(
    JSON.stringify(
      {
        status: "generated",
        quarterLabel,
        reportId: report.report.id,
        fileName: report.report.fileName,
        googleDriveUrl: report.report.googleDriveUrl,
        rowCount: report.rowCount,
        itemsCreated: report.itemsCreated,
        itemsReused: report.itemsReused,
        warning: report.warning,
        regeneratedFromEmptyArtifact: existing && !force && latestExistingRowCount === 0
      },
      null,
      2
    )
  );
}

main()
  .catch(async (error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
