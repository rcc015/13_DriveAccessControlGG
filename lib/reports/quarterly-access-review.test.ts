import test from "node:test";
import assert from "node:assert/strict";
import { buildCsvReport } from "@/lib/reports/report-builder";
import {
  buildQuarterlyAccessReviewRows,
  buildQuarterlyReviewBaseline,
  getQuarterInfo,
  normalizeQuarterFolderName,
  type QuarterlyReviewBaselineEntry
} from "@/lib/reports/quarterly-access-review";

test("quarter info uses the active calendar quarter for May 2026", () => {
  const quarter = getQuarterInfo(new Date("2026-05-15T12:00:00.000Z"));

  assert.equal(quarter.label, "2026_Q2");
  assert.equal(quarter.legacyLabel, "Q2 2026");
  assert.equal(quarter.reviewName, "Quarterly Access Review - 2026_Q2");
  assert.equal(normalizeQuarterFolderName(quarter.label), "2026_Q2_Reports");
});

test("quarterly review baseline includes pending rows, lowercases emails, and removes duplicates", () => {
  const baseline = buildQuarterlyReviewBaseline([
    {
      sourceType: "BUSINESS_ROLE_ASSIGNMENT",
      sourceId: "uar-1",
      memberName: "Alice Admin",
      memberEmail: "Alice@Example.com",
      roleLabel: "Finance Analyst",
      groupEmail: "GRP-Finance@Example.com"
    },
    {
      sourceType: "GROUP_MEMBERSHIP",
      sourceId: "gm-1",
      memberName: "Alice Admin",
      memberEmail: "alice@example.com",
      roleLabel: "Finance Analyst",
      groupEmail: "grp-finance@example.com",
      actionRequired: "Maintain membership"
    },
    {
      sourceType: "APP_ROLE_ASSIGNMENT",
      sourceId: "ur-1",
      memberName: "Bob Reviewer",
      memberEmail: "BOB@EXAMPLE.COM",
      roleLabel: "REVIEWER",
      groupEmail: "grp-reviewers@example.com"
    },
    {
      sourceType: "RESTRICTED_ACCESS_EXCEPTION",
      sourceId: "req-1",
      memberName: "Cara Counsel",
      memberEmail: "cara@example.com",
      roleLabel: "Restricted Access Exception",
      groupEmail: "",
      actionRequired: "Review restricted access: 04_Support_Working / 06_Legal"
    }
  ] satisfies QuarterlyReviewBaselineEntry[]);

  assert.deepEqual(
    baseline.map((row) => [row.memberEmail, row.roleLabel, row.groupEmail, row.actionRequired]),
    [
      ["alice@example.com", "Finance Analyst", "grp-finance@example.com", "Maintain membership"],
      ["bob@example.com", "REVIEWER", "grp-reviewers@example.com", null],
      [
        "cara@example.com",
        "Restricted Access Exception",
        "",
        "Review restricted access: 04_Support_Working / 06_Legal"
      ]
    ]
  );
});

test("quarterly review rows keep reviewed decisions and add pending rows for baseline items", () => {
  const rows = buildQuarterlyAccessReviewRows({
    review: {
      id: "review-q2",
      name: "Quarterly Access Review - 2026_Q2",
      quarterLabel: "2026_Q2",
      startedAt: new Date("2026-04-01T00:00:00.000Z"),
      dueAt: new Date("2026-06-30T23:59:59.000Z"),
      reviewerEmail: "reviewer@example.com",
      status: "PENDING"
    },
    existingItems: [
      {
        id: "item-keep",
        accessReviewId: "review-q2",
        groupMappingId: "gm-1",
        groupEmail: "grp-finance@example.com",
        memberName: "Alice Admin",
        memberEmail: "alice@example.com",
        roleLabel: "Finance Analyst",
        accessJustified: true,
        actionRequired: "Maintain membership",
        decision: "APPROVED",
        decisionNotes: "Still needed",
        reviewedAt: new Date("2026-04-03T12:00:00.000Z"),
        reviewedByEmail: "reviewer@example.com"
      }
    ],
    baseline: [
      {
        sourceType: "GROUP_MEMBERSHIP",
        sourceId: "gm-1",
        memberName: "Alice Admin",
        memberEmail: "alice@example.com",
        roleLabel: "Finance Analyst",
        groupEmail: "grp-finance@example.com"
      },
      {
        sourceType: "BUSINESS_ROLE_ASSIGNMENT",
        sourceId: "uar-2",
        memberName: "Bob Builder",
        memberEmail: "bob@example.com",
        roleLabel: "Operations Engineer",
        groupEmail: "grp-ops@example.com"
      }
    ]
  });

  assert.equal(rows.length, 2);
  assert.deepEqual(
    rows.map((row) => [row.member_email, row.role_label, row.group_email, row.decision, row.access_justified]),
    [
      ["alice@example.com", "Finance Analyst", "grp-finance@example.com", "APPROVED", "true"],
      ["bob@example.com", "Operations Engineer", "grp-ops@example.com", "PENDING", ""]
    ]
  );

  const built = buildCsvReport("QUARTERLY_ACCESS_REVIEW", {
    quarterLabel: "2026_Q2",
    reviewName: "Quarterly Access Review - 2026_Q2",
    reviewStatus: "PENDING",
    reviewStartedAt: new Date("2026-04-01T00:00:00.000Z"),
    reviewDueAt: new Date("2026-06-30T23:59:59.000Z"),
    reviewerEmail: "reviewer@example.com",
    rows
  });

  const csv = built.content.toString("utf8");
  assert.match(built.fileName, /^QuarterlyAccessReview_2026_Q2_/);
  assert.match(csv, /review_name,quarter_label,review_status/);
  assert.match(csv, /alice@example\.com/);
  assert.match(csv, /bob@example\.com/);
  assert.match(csv, /APPROVED/);
  assert.match(csv, /PENDING/);
});

test("quarterly review rows normalize legacy remove decisions into revoke for regenerated csv output", () => {
  const rows = buildQuarterlyAccessReviewRows({
    review: {
      id: "review-q2",
      name: "Quarterly Access Review - 2026_Q2",
      quarterLabel: "2026_Q2",
      startedAt: new Date("2026-04-01T00:00:00.000Z"),
      dueAt: new Date("2026-06-30T23:59:59.000Z"),
      reviewerEmail: "reviewer@example.com",
      status: "OPEN"
    },
    existingItems: [
      {
        id: "item-remove",
        accessReviewId: "review-q2",
        groupMappingId: "gm-2",
        groupEmail: "grp-ops@example.com",
        memberName: "Bob Builder",
        memberEmail: "bob@example.com",
        roleLabel: "Operations Engineer",
        accessJustified: false,
        actionRequired: "Pending reconcile/apply before access removal",
        decision: "REMOVE",
        decisionNotes: "Legacy decision value",
        reviewedAt: new Date("2026-04-04T12:00:00.000Z"),
        reviewedByEmail: "reviewer@example.com"
      }
    ],
    baseline: []
  });

  assert.equal(rows[0]?.decision, "REVOKE");
  assert.equal(rows[0]?.review_status, "COMPLETED");
});
