import { createHash } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import {
  buildQuarterlyAccessReviewRows,
  buildQuarterlyReviewBaseline,
  buildQuarterlyReviewItemKey,
  getQuarterInfo,
  type QuarterlyAccessReviewReportPayload,
  type QuarterlyReviewBaselineEntry,
  type QuarterlyReviewCampaignRecord,
  type QuarterlyReviewItemRecord
} from "@/lib/reports/quarterly-access-review";

interface QuarterlyReviewRecord extends QuarterlyReviewCampaignRecord {
  items: QuarterlyReviewItemRecord[];
}

interface QuarterlyReviewCreateInput {
  name: string;
  quarterLabel: string;
  startedAt: Date;
  dueAt: Date;
  reviewerEmail: string;
  status: string;
}

interface QuarterlyReviewItemCreateInput {
  id: string;
  accessReviewId: string;
  groupMappingId: string | null;
  groupEmail: string | null;
  memberName: string | null;
  memberEmail: string;
  roleLabel: string | null;
  actionRequired: string | null;
  decision: string | null;
  decisionNotes: string | null;
  accessJustified: boolean | null;
  reviewedAt: Date | null;
  reviewedByEmail: string | null;
}

export interface QuarterlyAccessReviewSnapshotResult {
  quarterLabel: string;
  reviewName: string;
  rowCount: number;
  reviewCreated: boolean;
  itemsCreated: number;
  itemsReused: number;
  warning: string | null;
  payload: QuarterlyAccessReviewReportPayload;
}

interface QuarterlyAccessReviewRepository {
  findCurrentQuarterReview(quarterLabels: string[]): Promise<QuarterlyReviewRecord | null>;
  createReview(input: QuarterlyReviewCreateInput): Promise<QuarterlyReviewRecord>;
  updateReview(reviewId: string, input: Partial<QuarterlyReviewCreateInput>): Promise<QuarterlyReviewRecord>;
  createReviewItems(items: QuarterlyReviewItemCreateInput[]): Promise<void>;
  listBaselineEntries(now: Date): Promise<QuarterlyReviewBaselineEntry[]>;
}

class PrismaQuarterlyAccessReviewRepository implements QuarterlyAccessReviewRepository {
  async findCurrentQuarterReview(quarterLabels: string[]) {
    return prisma.accessReview.findFirst({
      where: {
        quarterLabel: {
          in: quarterLabels
        }
      },
      include: {
        items: true
      },
      orderBy: [{ startedAt: "desc" }]
    });
  }

  async createReview(input: QuarterlyReviewCreateInput) {
    return prisma.accessReview.create({
      data: input,
      include: {
        items: true
      }
    });
  }

  async updateReview(reviewId: string, input: Partial<QuarterlyReviewCreateInput>) {
    return prisma.accessReview.update({
      where: { id: reviewId },
      data: input,
      include: {
        items: true
      }
    });
  }

  async createReviewItems(items: QuarterlyReviewItemCreateInput[]) {
    if (items.length === 0) {
      return;
    }

    await prisma.$transaction(items.map((item) => prisma.accessReviewItem.create({ data: item })));
  }

  async listBaselineEntries(now: Date) {
    const [memberships, appRoleAssignments, businessRoleAssignments, restrictedExceptions] =
      await Promise.all([
        prisma.groupMembership.findMany({
          where: {
            revokedAt: null,
            user: {
              isActive: true
            }
          },
          include: {
            user: true,
            groupMapping: {
              include: {
                role: true
              }
            },
            accessRoleMapping: {
              include: {
                accessRole: true
              }
            }
          }
        }),
        prisma.userRole.findMany({
          where: {
            user: {
              isActive: true
            }
          },
          include: {
            user: true,
            role: {
              include: {
                mappings: true
              }
            }
          }
        }),
        prisma.userAccessRole.findMany({
          where: {
            user: {
              isActive: true
            }
          },
          include: {
            user: true,
            accessRole: {
              include: {
                mappings: true
              }
            }
          }
        }),
        prisma.accessRequest.findMany({
          where: {
            status: "APPROVED",
            user: {
              isActive: true
            },
            OR: [{ startDate: null }, { startDate: { lte: now } }],
            AND: [{ OR: [{ endDate: null }, { endDate: { gte: now } }] }]
          },
          include: {
            user: true,
            restrictedFolder: true
          }
        })
      ]);

    const entries: QuarterlyReviewBaselineEntry[] = [];

    for (const membership of memberships) {
      const roleLabel =
        membership.groupMapping?.role.name ??
        membership.accessRoleMapping?.accessRole.displayName ??
        "Mapped membership";
      const groupEmail =
        membership.groupMapping?.groupEmail ??
        membership.accessRoleMapping?.groupEmail ??
        "";

      entries.push({
        sourceType: "GROUP_MEMBERSHIP",
        sourceId: membership.id,
        memberName: membership.user.displayName,
        memberEmail: membership.user.email,
        roleLabel,
        groupEmail,
        groupMappingId: membership.groupMappingId,
        actionRequired: membership.groupMappingId ? "Maintain membership" : "Review required"
      });
    }

    for (const assignment of appRoleAssignments) {
      if (assignment.role.mappings.length === 0) {
        entries.push({
          sourceType: "APP_ROLE_ASSIGNMENT",
          sourceId: assignment.id,
          memberName: assignment.user.displayName,
          memberEmail: assignment.user.email,
          roleLabel: assignment.role.name,
          groupEmail: "",
          actionRequired: "Review required"
        });
        continue;
      }

      for (const mapping of assignment.role.mappings) {
        entries.push({
          sourceType: "APP_ROLE_ASSIGNMENT",
          sourceId: `${assignment.id}:${mapping.id}`,
          memberName: assignment.user.displayName,
          memberEmail: assignment.user.email,
          roleLabel: assignment.role.name,
          groupEmail: mapping.groupEmail,
          groupMappingId: mapping.id,
          actionRequired: "Maintain membership"
        });
      }
    }

    for (const assignment of businessRoleAssignments) {
      if (assignment.accessRole.mappings.length === 0) {
        entries.push({
          sourceType: "BUSINESS_ROLE_ASSIGNMENT",
          sourceId: assignment.id,
          memberName: assignment.user.displayName,
          memberEmail: assignment.user.email,
          roleLabel: assignment.accessRole.displayName,
          groupEmail: "",
          actionRequired: "Review required"
        });
        continue;
      }

      for (const mapping of assignment.accessRole.mappings) {
        entries.push({
          sourceType: "BUSINESS_ROLE_ASSIGNMENT",
          sourceId: `${assignment.id}:${mapping.id}`,
          memberName: assignment.user.displayName,
          memberEmail: assignment.user.email,
          roleLabel: assignment.accessRole.displayName,
          groupEmail: mapping.groupEmail,
          actionRequired: "Review required"
        });
      }
    }

    for (const request of restrictedExceptions) {
      entries.push({
        sourceType: "RESTRICTED_ACCESS_EXCEPTION",
        sourceId: request.id,
        memberName: request.user.displayName,
        memberEmail: request.user.email,
        roleLabel: "Restricted Access Exception",
        groupEmail: "",
        actionRequired: request.restrictedFolder?.path
          ? `Review restricted access: ${request.restrictedFolder.path}`
          : "Review restricted access"
      });
    }

    return buildQuarterlyReviewBaseline(entries);
  }
}

function buildReviewItemId(reviewId: string, key: string) {
  const hash = createHash("sha1").update(key).digest("hex").slice(0, 24);
  return `${reviewId}-${hash}`;
}

export class QuarterlyAccessReviewService {
  constructor(private repository: QuarterlyAccessReviewRepository = new PrismaQuarterlyAccessReviewRepository()) {}

  async ensureCurrentQuarterReview(actorEmail: string, date = new Date()): Promise<QuarterlyAccessReviewSnapshotResult> {
    const quarter = getQuarterInfo(date);
    const normalizedActorEmail = actorEmail.trim().toLowerCase();

    let review = await this.repository.findCurrentQuarterReview([quarter.label, quarter.legacyLabel]);
    let reviewCreated = false;

    if (!review) {
      review = await this.repository.createReview({
        name: quarter.reviewName,
        quarterLabel: quarter.label,
        startedAt: quarter.startAt,
        dueAt: quarter.dueAt,
        reviewerEmail: normalizedActorEmail,
        status: "PENDING"
      });
      reviewCreated = true;
    } else if (review.quarterLabel !== quarter.label || review.name !== quarter.reviewName) {
      review = await this.repository.updateReview(review.id, {
        quarterLabel: quarter.label,
        name: quarter.reviewName,
        dueAt: review.dueAt ?? quarter.dueAt
      });
    }

    const baseline = await this.repository.listBaselineEntries(date);
    const existingByKey = new Map(
      review.items.map((item) => [
        buildQuarterlyReviewItemKey({
          memberEmail: item.memberEmail,
          roleLabel: item.roleLabel ?? "",
          groupEmail: item.groupEmail ?? ""
        }),
        item
      ])
    );

    const missingItems: QuarterlyReviewItemCreateInput[] = [];

    for (const entry of baseline) {
      const key = buildQuarterlyReviewItemKey(entry);

      if (existingByKey.has(key)) {
        continue;
      }

      missingItems.push({
        id: buildReviewItemId(review.id, key),
        accessReviewId: review.id,
        groupMappingId: entry.groupMappingId ?? null,
        groupEmail: entry.groupEmail || null,
        memberName: entry.memberName || null,
        memberEmail: entry.memberEmail,
        roleLabel: entry.roleLabel || null,
        actionRequired: entry.actionRequired ?? null,
        decision: null,
        decisionNotes: null,
        accessJustified: null,
        reviewedAt: null,
        reviewedByEmail: null
      });
    }

    await this.repository.createReviewItems(missingItems);

    const allItems: QuarterlyReviewItemRecord[] = [
      ...review.items,
      ...missingItems.map((item) => ({
        id: item.id,
        accessReviewId: item.accessReviewId,
        groupMappingId: item.groupMappingId,
        groupEmail: item.groupEmail,
        memberName: item.memberName,
        memberEmail: item.memberEmail,
        roleLabel: item.roleLabel,
        accessJustified: item.accessJustified,
        actionRequired: item.actionRequired,
        decision: item.decision,
        decisionNotes: item.decisionNotes,
        reviewedAt: item.reviewedAt,
        reviewedByEmail: item.reviewedByEmail
      }))
    ];

    const rows = buildQuarterlyAccessReviewRows({
      review,
      existingItems: allItems,
      baseline
    });

    return {
      quarterLabel: quarter.label,
      reviewName: quarter.reviewName,
      rowCount: rows.length,
      reviewCreated,
      itemsCreated: missingItems.length,
      itemsReused: rows.length - missingItems.length,
      warning:
        rows.length === 0
          ? `Quarterly Access Review generated with 0 rows because no active RBAC assignments or reviewable access were found for ${quarter.label}.`
          : null,
      payload: {
        quarterLabel: quarter.label,
        reviewName: quarter.reviewName,
        reviewStatus: review.status,
        reviewStartedAt: review.startedAt,
        reviewDueAt: review.dueAt,
        reviewerEmail: review.reviewerEmail,
        rows
      }
    };
  }
}
