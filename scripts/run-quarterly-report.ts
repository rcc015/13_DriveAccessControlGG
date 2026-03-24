import { prisma } from "@/lib/db/prisma";
import { env } from "@/lib/config/env";
import { ReportService } from "@/lib/services/report-service";

async function main() {
  const force = process.argv.includes("--force");
  const quarterLabel = getCurrentQuarterLabel();
  const quarterStart = getQuarterStartUtc();

  const existing = await prisma.generatedReport.findFirst({
    where: {
      reportType: "QUARTERLY_ACCESS_REVIEW",
      generatedAt: { gte: quarterStart }
    },
    orderBy: { generatedAt: "desc" }
  });

  if (existing && !force) {
    console.log(
      JSON.stringify(
        {
          status: "skipped",
          reason: `Quarterly report already exists for ${quarterLabel}.`,
          reportId: existing.id,
          fileName: existing.fileName,
          generatedAt: existing.generatedAt.toISOString(),
          googleDriveUrl: existing.googleDriveUrl
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
        reportId: report.id,
        fileName: report.fileName,
        googleDriveUrl: report.googleDriveUrl
      },
      null,
      2
    )
  );
}

function getCurrentQuarterLabel(date = new Date()) {
  const month = date.getUTCMonth();
  const quarter = Math.floor(month / 3) + 1;
  const year = date.getUTCFullYear();
  return `Q${quarter} ${year}`;
}

function getQuarterStartUtc(date = new Date()) {
  const year = date.getUTCFullYear();
  const quarter = Math.floor(date.getUTCMonth() / 3);
  const startMonth = quarter * 3;
  return new Date(Date.UTC(year, startMonth, 1, 0, 0, 0, 0));
}

main()
  .catch(async (error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
