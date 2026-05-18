import test from "node:test";
import assert from "node:assert/strict";
import {
  QuarterlyAccessReviewService,
  type QuarterlyAccessReviewSnapshotResult
} from "@/lib/services/quarterly-access-review-service";

function createFakeRepository() {
  let review:
    | {
        id: string;
        name: string;
        quarterLabel: string;
        startedAt: Date;
        dueAt: Date | null;
        reviewerEmail: string;
        status: string;
        items: Array<{
          id: string;
          accessReviewId: string;
          groupMappingId: string | null;
          groupEmail: string | null;
          memberName: string | null;
          memberEmail: string;
          roleLabel: string | null;
          accessJustified: boolean | null;
          actionRequired: string | null;
          decision: string | null;
          decisionNotes: string | null;
          reviewedAt: Date | null;
          reviewedByEmail: string | null;
        }>;
      }
    | null = null;
  let baselineEntries: Array<{
    sourceType: "APP_ROLE_ASSIGNMENT" | "BUSINESS_ROLE_ASSIGNMENT" | "GROUP_MEMBERSHIP" | "RESTRICTED_ACCESS_EXCEPTION";
    sourceId: string;
    memberName: string;
    memberEmail: string;
    roleLabel: string;
    groupEmail: string;
    groupMappingId?: string | null;
    actionRequired?: string | null;
  }> = [];
  const createdItems: Array<{ memberEmail: string; roleLabel: string | null; groupEmail: string | null }> = [];

  return {
    repository: {
      async findCurrentQuarterReview() {
        return review;
      },
      async createReview(input: {
        name: string;
        quarterLabel: string;
        startedAt: Date;
        dueAt: Date;
        reviewerEmail: string;
        status: string;
      }) {
        review = {
          id: "review-1",
          ...input,
          items: []
        };
        return review;
      },
      async updateReview(reviewId: string, input: Partial<{ name: string; quarterLabel: string; dueAt: Date }>) {
        if (!review || review.id !== reviewId) {
          throw new Error("Review not found");
        }

        review = {
          ...review,
          ...input
        };
        return review;
      },
      async createReviewItems(items: Array<{
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
      }>) {
        if (!review) {
          throw new Error("Review not initialized");
        }

        createdItems.push(...items.map((item) => ({
          memberEmail: item.memberEmail,
          roleLabel: item.roleLabel,
          groupEmail: item.groupEmail
        })));
        review.items.push(
          ...items.map((item) => ({
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
        );
      },
      async listBaselineEntries() {
        return baselineEntries;
      }
    },
    seedReview(nextReview: NonNullable<typeof review>) {
      review = nextReview;
    },
    seedBaseline(
      nextBaseline: Array<{
        sourceType: "APP_ROLE_ASSIGNMENT" | "BUSINESS_ROLE_ASSIGNMENT" | "GROUP_MEMBERSHIP" | "RESTRICTED_ACCESS_EXCEPTION";
        sourceId: string;
        memberName: string;
        memberEmail: string;
        roleLabel: string;
        groupEmail: string;
        groupMappingId?: string | null;
        actionRequired?: string | null;
      }>
    ) {
      baselineEntries = nextBaseline;
    },
    getCreatedItems() {
      return createdItems;
    }
  };
}

test("service creates a current-quarter snapshot when no review exists", async () => {
  const fake = createFakeRepository();
  fake.seedBaseline([
    {
      sourceType: "BUSINESS_ROLE_ASSIGNMENT",
      sourceId: "uar-1",
      memberName: "Alice Admin",
      memberEmail: "alice@example.com",
      roleLabel: "Finance Analyst",
      groupEmail: "grp-finance@example.com"
    },
    {
      sourceType: "RESTRICTED_ACCESS_EXCEPTION",
      sourceId: "req-1",
      memberName: "Cara Counsel",
      memberEmail: "cara@example.com",
      roleLabel: "Restricted Access Exception",
      groupEmail: ""
    }
  ]);

  const service = new QuarterlyAccessReviewService(fake.repository);
  const result = await service.ensureCurrentQuarterReview(
    "reviewer@example.com",
    new Date("2026-05-15T12:00:00.000Z")
  );

  assert.equal(result.quarterLabel, "2026_Q2");
  assert.equal(result.reviewCreated, true);
  assert.equal(result.rowCount, 2);
  assert.equal(result.itemsCreated, 2);
  assert.equal(result.warning, null);
  assert.deepEqual(
    fake.getCreatedItems().map((item) => [item.memberEmail, item.roleLabel, item.groupEmail]),
    [
      ["alice@example.com", "Finance Analyst", "grp-finance@example.com"],
      ["cara@example.com", "Restricted Access Exception", null]
    ]
  );
});

test("service reuses existing review items for the active quarter", async () => {
  const fake = createFakeRepository();
  fake.seedReview({
    id: "review-existing",
    name: "Q2 2026 Quarterly Access Review",
    quarterLabel: "Q2 2026",
    startedAt: new Date("2026-04-01T00:00:00.000Z"),
    dueAt: new Date("2026-06-30T23:59:59.000Z"),
    reviewerEmail: "reviewer@example.com",
    status: "OPEN",
    items: [
      {
        id: "item-existing",
        accessReviewId: "review-existing",
        groupMappingId: "gm-1",
        groupEmail: "grp-finance@example.com",
        memberName: "Alice Admin",
        memberEmail: "alice@example.com",
        roleLabel: "Finance Analyst",
        accessJustified: null,
        actionRequired: "Maintain membership",
        decision: null,
        decisionNotes: null,
        reviewedAt: null,
        reviewedByEmail: null
      }
    ]
  });
  fake.seedBaseline([
    {
      sourceType: "GROUP_MEMBERSHIP",
      sourceId: "gm-1",
      memberName: "Alice Admin",
      memberEmail: "alice@example.com",
      roleLabel: "Finance Analyst",
      groupEmail: "grp-finance@example.com"
    }
  ]);

  const service = new QuarterlyAccessReviewService(fake.repository);
  const result = await service.ensureCurrentQuarterReview(
    "reviewer@example.com",
    new Date("2026-05-15T12:00:00.000Z")
  );

  assert.equal(result.quarterLabel, "2026_Q2");
  assert.equal(result.reviewCreated, false);
  assert.equal(result.itemsCreated, 0);
  assert.equal(result.rowCount, 1);
  assert.equal(result.payload.rows[0]?.decision, "PENDING");
  assert.equal(fake.getCreatedItems().length, 0);
});

test("service returns a warning when no reviewable access exists", async () => {
  const fake = createFakeRepository();
  fake.seedBaseline([]);

  const service = new QuarterlyAccessReviewService(fake.repository);
  const result = await service.ensureCurrentQuarterReview(
    "reviewer@example.com",
    new Date("2026-05-15T12:00:00.000Z")
  );

  assert.equal(result.rowCount, 0);
  assert.match(
    result.warning ?? "",
    /no active RBAC assignments or reviewable access were found for 2026_Q2/i
  );
});
