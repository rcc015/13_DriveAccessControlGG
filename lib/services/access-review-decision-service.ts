import { prisma } from "@/lib/db/prisma";
import {
  actionableAccessReviewDecisionValues,
  buildAccessReviewActionRequired,
  deriveAccessReviewStatus,
  type ActionableAccessReviewDecision
} from "@/lib/access-reviews/workflow";
import { AuditLogService } from "@/lib/services/audit-log-service";

interface AccessReviewItemRecord {
  id: string;
  accessReviewId: string;
  groupEmail: string | null;
  memberEmail: string;
  actionRequired: string | null;
  decision: string | null;
  decisionNotes: string | null;
  accessJustified: boolean | null;
  reviewedAt: Date | null;
  reviewedByEmail: string | null;
  accessReview: {
    id: string;
    quarterLabel: string;
    status: string;
  };
}

interface AccessReviewDecisionRepository {
  findItemsByIds(itemIds: string[]): Promise<AccessReviewItemRecord[]>;
  updateItem(
    itemId: string,
    input: {
      decision: ActionableAccessReviewDecision;
      decisionNotes: string | null;
      accessJustified: boolean | null;
      actionRequired: string;
      reviewedAt: Date;
      reviewedByEmail: string;
    }
  ): Promise<void>;
  listReviewItems(accessReviewId: string): Promise<Array<{ decision: string | null }>>;
  updateReviewStatus(accessReviewId: string, status: string): Promise<void>;
}

class PrismaAccessReviewDecisionRepository implements AccessReviewDecisionRepository {
  async findItemsByIds(itemIds: string[]) {
    return prisma.accessReviewItem.findMany({
      where: {
        id: {
          in: itemIds
        }
      },
      include: {
        accessReview: true
      }
    });
  }

  async updateItem(
    itemId: string,
    input: {
      decision: ActionableAccessReviewDecision;
      decisionNotes: string | null;
      accessJustified: boolean | null;
      actionRequired: string;
      reviewedAt: Date;
      reviewedByEmail: string;
    }
  ) {
    await prisma.accessReviewItem.update({
      where: { id: itemId },
      data: input
    });
  }

  async listReviewItems(accessReviewId: string) {
    return prisma.accessReviewItem.findMany({
      where: { accessReviewId },
      select: {
        decision: true
      }
    });
  }

  async updateReviewStatus(accessReviewId: string, status: string) {
    await prisma.accessReview.update({
      where: { id: accessReviewId },
      data: { status }
    });
  }
}

function parseAccessJustified(value: string | null | undefined) {
  const normalized = (value ?? "").trim().toLowerCase();

  if (normalized === "true") {
    return true;
  }

  if (normalized === "false") {
    return false;
  }

  return null;
}

function normalizeDecisionNotes(value: string | null | undefined) {
  const normalized = (value ?? "").trim();
  return normalized || null;
}

export class AccessReviewDecisionService {
  constructor(
    private repository: AccessReviewDecisionRepository = new PrismaAccessReviewDecisionRepository(),
    private auditLog = new AuditLogService()
  ) {}

  async reviewItem(input: {
    itemId: string;
    reviewerEmail: string;
    decision: string;
    decisionNotes?: string | null;
    accessJustified?: string | null;
  }) {
    return this.reviewItems({
      itemIds: [input.itemId],
      reviewerEmail: input.reviewerEmail,
      decision: input.decision,
      decisionNotes: input.decisionNotes,
      accessJustified: input.accessJustified,
      bulk: false
    });
  }

  async reviewItems(input: {
    itemIds: string[];
    reviewerEmail: string;
    decision: string;
    decisionNotes?: string | null;
    accessJustified?: string | null;
    bulk?: boolean;
  }) {
    const decision = input.decision.trim().toUpperCase();

    if (!(actionableAccessReviewDecisionValues as readonly string[]).includes(decision)) {
      throw new Error("Valid review decision is required.");
    }

    if (input.itemIds.length === 0) {
      throw new Error("At least one review item must be selected.");
    }

    const items = await this.repository.findItemsByIds(input.itemIds);

    if (items.length !== input.itemIds.length) {
      throw new Error("One or more access review items were not found.");
    }

    const reviewedAt = new Date();
    const decisionNotes = normalizeDecisionNotes(input.decisionNotes);
    const accessJustified = parseAccessJustified(input.accessJustified);
    const affectedReviewIds = new Set<string>();

    for (const item of items) {
      const nextDecision = decision as ActionableAccessReviewDecision;
      const actionRequired = buildAccessReviewActionRequired(nextDecision, item.actionRequired);

      await this.repository.updateItem(item.id, {
        decision: nextDecision,
        decisionNotes,
        accessJustified,
        actionRequired,
        reviewedAt,
        reviewedByEmail: input.reviewerEmail
      });

      await this.auditLog.record({
        actorEmail: input.reviewerEmail,
        actionType: "ACCESS_REVIEW_ITEM_REVIEWED",
        targetUserEmail: item.memberEmail,
        targetGroupEmail: item.groupEmail ?? undefined,
        result: "SUCCESS",
        notes: decisionNotes ?? undefined,
        metadata: {
          itemId: item.id,
          accessReviewId: item.accessReviewId,
          quarterLabel: item.accessReview.quarterLabel,
          oldDecision: item.decision,
          newDecision: nextDecision,
          reviewedAt: reviewedAt.toISOString(),
          reviewedByEmail: input.reviewerEmail,
          accessJustified,
          actionRequired,
          bulk: Boolean(input.bulk)
        }
      });

      affectedReviewIds.add(item.accessReviewId);
    }

    for (const accessReviewId of affectedReviewIds) {
      const reviewItems = await this.repository.listReviewItems(accessReviewId);
      const status = deriveAccessReviewStatus(reviewItems);
      await this.repository.updateReviewStatus(accessReviewId, status);
    }

    return {
      itemCount: items.length,
      decision,
      reviewedAt,
      reviewedByEmail: input.reviewerEmail
    };
  }
}
