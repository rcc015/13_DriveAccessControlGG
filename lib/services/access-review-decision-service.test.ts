import test from "node:test";
import assert from "node:assert/strict";
import { AccessReviewDecisionService } from "@/lib/services/access-review-decision-service";

function createFakeDependencies() {
  const items = new Map<
    string,
    {
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
  >();
  const auditEntries: Array<Record<string, unknown>> = [];
  const updatedStatuses: Array<{ reviewId: string; status: string }> = [];

  return {
    repository: {
      async findItemsByIds(itemIds: string[]) {
        return itemIds.map((itemId) => {
          const item = items.get(itemId);
          if (!item) {
            throw new Error(`Missing item ${itemId}`);
          }

          return item;
        });
      },
      async updateItem(
        itemId: string,
        input: {
          decision: "APPROVED" | "REVOKE" | "NEEDS_UPDATE";
          decisionNotes: string | null;
          accessJustified: boolean | null;
          actionRequired: string;
          reviewedAt: Date;
          reviewedByEmail: string;
        }
      ) {
        const current = items.get(itemId);
        if (!current) {
          throw new Error(`Missing item ${itemId}`);
        }

        items.set(itemId, {
          ...current,
          ...input
        });
      },
      async listReviewItems(accessReviewId: string) {
        return Array.from(items.values())
          .filter((item) => item.accessReviewId === accessReviewId)
          .map((item) => ({ decision: item.decision }));
      },
      async updateReviewStatus(reviewId: string, status: string) {
        updatedStatuses.push({ reviewId, status });

        for (const item of items.values()) {
          if (item.accessReviewId === reviewId) {
            item.accessReview.status = status;
          }
        }
      }
    },
    auditLog: {
      async record(entry: Record<string, unknown>) {
        auditEntries.push(entry);
      }
    },
    seedItem(item: (typeof items extends Map<string, infer T> ? T : never)) {
      items.set(item.id, item);
    },
    getItem(itemId: string) {
      return items.get(itemId);
    },
    getAuditEntries() {
      return auditEntries;
    },
    getUpdatedStatuses() {
      return updatedStatuses;
    }
  };
}

test("reviewer can approve an item and save review metadata with audit log", async () => {
  const fake = createFakeDependencies();
  fake.seedItem({
    id: "item-1",
    accessReviewId: "review-1",
    groupEmail: "grp-finance@example.com",
    memberEmail: "alice@example.com",
    actionRequired: "Maintain membership",
    decision: null,
    decisionNotes: null,
    accessJustified: null,
    reviewedAt: null,
    reviewedByEmail: null,
    accessReview: {
      id: "review-1",
      quarterLabel: "2026_Q2",
      status: "PENDING"
    }
  });

  const service = new AccessReviewDecisionService(fake.repository as never, fake.auditLog as never);
  await service.reviewItem({
    itemId: "item-1",
    reviewerEmail: "reviewer@example.com",
    decision: "APPROVED",
    decisionNotes: "Access still needed for finance close.",
    accessJustified: "true"
  });

  const updated = fake.getItem("item-1");
  assert.equal(updated?.decision, "APPROVED");
  assert.equal(updated?.decisionNotes, "Access still needed for finance close.");
  assert.equal(updated?.accessJustified, true);
  assert.equal(updated?.reviewedByEmail, "reviewer@example.com");
  assert.ok(updated?.reviewedAt instanceof Date);
  assert.deepEqual(fake.getUpdatedStatuses(), [{ reviewId: "review-1", status: "COMPLETED" }]);
  assert.equal(fake.getAuditEntries().length, 1);
  assert.equal(fake.getAuditEntries()[0]?.actionType, "ACCESS_REVIEW_ITEM_REVIEWED");
});

test("reviewer can mark revoke without directly removing membership", async () => {
  const fake = createFakeDependencies();
  fake.seedItem({
    id: "item-2",
    accessReviewId: "review-2",
    groupEmail: "grp-ops@example.com",
    memberEmail: "bob@example.com",
    actionRequired: "Maintain membership",
    decision: null,
    decisionNotes: null,
    accessJustified: null,
    reviewedAt: null,
    reviewedByEmail: null,
    accessReview: {
      id: "review-2",
      quarterLabel: "2026_Q2",
      status: "PENDING"
    }
  });

  const service = new AccessReviewDecisionService(fake.repository as never, fake.auditLog as never);
  await service.reviewItem({
    itemId: "item-2",
    reviewerEmail: "reviewer@example.com",
    decision: "REVOKE",
    decisionNotes: "Contractor engagement ended.",
    accessJustified: "false"
  });

  const updated = fake.getItem("item-2");
  assert.equal(updated?.decision, "REVOKE");
  assert.equal(updated?.accessJustified, false);
  assert.equal(updated?.actionRequired, "Pending reconcile/apply before access removal");
  assert.equal(fake.getAuditEntries().length, 1);
  assert.equal(fake.getAuditEntries()[0]?.targetUserEmail, "bob@example.com");
});

test("reviewer can mark needs update and review status stays in progress while pending items remain", async () => {
  const fake = createFakeDependencies();
  fake.seedItem({
    id: "item-3",
    accessReviewId: "review-3",
    groupEmail: "grp-legal@example.com",
    memberEmail: "cara@example.com",
    actionRequired: null,
    decision: null,
    decisionNotes: null,
    accessJustified: null,
    reviewedAt: null,
    reviewedByEmail: null,
    accessReview: {
      id: "review-3",
      quarterLabel: "2026_Q2",
      status: "PENDING"
    }
  });
  fake.seedItem({
    id: "item-4",
    accessReviewId: "review-3",
    groupEmail: "grp-legal@example.com",
    memberEmail: "dina@example.com",
    actionRequired: null,
    decision: null,
    decisionNotes: null,
    accessJustified: null,
    reviewedAt: null,
    reviewedByEmail: null,
    accessReview: {
      id: "review-3",
      quarterLabel: "2026_Q2",
      status: "PENDING"
    }
  });

  const service = new AccessReviewDecisionService(fake.repository as never, fake.auditLog as never);
  await service.reviewItem({
    itemId: "item-3",
    reviewerEmail: "reviewer@example.com",
    decision: "NEEDS_UPDATE",
    decisionNotes: "Role label does not match current business function.",
    accessJustified: ""
  });

  const updated = fake.getItem("item-3");
  assert.equal(updated?.decision, "NEEDS_UPDATE");
  assert.equal(updated?.accessJustified, null);
  assert.equal(updated?.reviewedByEmail, "reviewer@example.com");
  assert.deepEqual(fake.getUpdatedStatuses(), [{ reviewId: "review-3", status: "IN_PROGRESS" }]);
});
