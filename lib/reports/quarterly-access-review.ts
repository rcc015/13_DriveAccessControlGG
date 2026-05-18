import {
  normalizeAccessReviewDecision,
  normalizeAccessReviewStatus
} from "@/lib/access-reviews/workflow";

export interface QuarterlyReviewCampaignRecord {
  id: string;
  name: string;
  quarterLabel: string;
  startedAt: Date;
  dueAt: Date | null;
  reviewerEmail: string;
  status: string;
}

export interface QuarterlyReviewItemRecord {
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
}

export interface QuarterlyReviewBaselineEntry {
  sourceType: "APP_ROLE_ASSIGNMENT" | "BUSINESS_ROLE_ASSIGNMENT" | "GROUP_MEMBERSHIP" | "RESTRICTED_ACCESS_EXCEPTION";
  sourceId: string;
  memberName: string;
  memberEmail: string;
  roleLabel: string;
  groupEmail: string;
  groupMappingId?: string | null;
  actionRequired?: string | null;
}

export interface QuarterlyAccessReviewExportRow {
  review_name: string;
  quarter_label: string;
  review_status: string;
  review_started_at: string;
  review_due_at: string;
  reviewer_email: string;
  member_name: string;
  member_email: string;
  role_label: string;
  group_email: string;
  decision: string;
  decision_notes: string;
  access_justified: string;
  action_required: string;
  reviewed_at: string;
  reviewed_by_email: string;
}

export interface QuarterlyAccessReviewReportPayload {
  quarterLabel: string;
  reviewName: string;
  reviewStatus: string;
  reviewStartedAt: Date;
  reviewDueAt: Date | null;
  reviewerEmail: string;
  rows: QuarterlyAccessReviewExportRow[];
}

export interface QuarterInfo {
  label: string;
  legacyLabel: string;
  reviewName: string;
  startAt: Date;
  dueAt: Date;
}

function normalizeEmail(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "").trim();
}

function quarterNumberFromMonth(monthIndex: number) {
  return Math.floor(monthIndex / 3) + 1;
}

export function getQuarterInfo(date = new Date()): QuarterInfo {
  const year = date.getUTCFullYear();
  const monthIndex = date.getUTCMonth();
  const quarter = quarterNumberFromMonth(monthIndex);
  const quarterStartMonth = (quarter - 1) * 3;
  const quarterEndMonth = quarterStartMonth + 3;

  return {
    label: `${year}_Q${quarter}`,
    legacyLabel: `Q${quarter} ${year}`,
    reviewName: `Quarterly Access Review - ${year}_Q${quarter}`,
    startAt: new Date(Date.UTC(year, quarterStartMonth, 1, 0, 0, 0, 0)),
    dueAt: new Date(Date.UTC(year, quarterEndMonth, 0, 23, 59, 59, 999))
  };
}

export function normalizeQuarterFolderName(quarterLabel: string) {
  const trimmed = quarterLabel.trim();
  const canonical = trimmed.match(/^(\d{4})_Q([1-4])$/i);

  if (canonical) {
    const [, year, quarter] = canonical;
    return `${year}_Q${quarter}_Reports`;
  }

  const legacy = trimmed.match(/^Q([1-4])\s+(\d{4})$/i);

  if (legacy) {
    const [, quarter, year] = legacy;
    return `${year}_Q${quarter}_Reports`;
  }

  return trimmed.replace(/\s+/g, "_") + "_Reports";
}

export function buildQuarterlyReviewItemKey(input: {
  memberEmail: string;
  roleLabel: string;
  groupEmail: string;
}) {
  return [
    normalizeEmail(input.memberEmail),
    normalizeText(input.roleLabel).toLowerCase(),
    normalizeEmail(input.groupEmail)
  ].join("::");
}

function stringifyBoolean(value: boolean | null | undefined) {
  if (value === true) {
    return "true";
  }

  if (value === false) {
    return "false";
  }

  return "";
}

function toIso(value: Date | null | undefined) {
  return value?.toISOString() ?? "";
}

function sourcePriority(sourceType: QuarterlyReviewBaselineEntry["sourceType"]) {
  switch (sourceType) {
    case "GROUP_MEMBERSHIP":
      return 4;
    case "BUSINESS_ROLE_ASSIGNMENT":
      return 3;
    case "APP_ROLE_ASSIGNMENT":
      return 2;
    case "RESTRICTED_ACCESS_EXCEPTION":
      return 1;
  }
}

function mergeBaselineEntry(
  current: QuarterlyReviewBaselineEntry,
  next: QuarterlyReviewBaselineEntry
): QuarterlyReviewBaselineEntry {
  if (sourcePriority(next.sourceType) < sourcePriority(current.sourceType)) {
    return current;
  }

  return {
    ...current,
    ...next,
    memberName: normalizeText(next.memberName) || normalizeText(current.memberName),
    groupEmail: normalizeEmail(next.groupEmail) || normalizeEmail(current.groupEmail),
    roleLabel: normalizeText(next.roleLabel) || normalizeText(current.roleLabel),
    groupMappingId: next.groupMappingId ?? current.groupMappingId ?? null,
    actionRequired: normalizeText(next.actionRequired) || normalizeText(current.actionRequired) || null
  };
}

export function buildQuarterlyReviewBaseline(entries: QuarterlyReviewBaselineEntry[]) {
  const byKey = new Map<string, QuarterlyReviewBaselineEntry>();

  for (const entry of entries) {
    const normalized: QuarterlyReviewBaselineEntry = {
      ...entry,
      memberName: normalizeText(entry.memberName) || normalizeEmail(entry.memberEmail),
      memberEmail: normalizeEmail(entry.memberEmail),
      roleLabel: normalizeText(entry.roleLabel),
      groupEmail: normalizeEmail(entry.groupEmail),
      groupMappingId: entry.groupMappingId ?? null,
      actionRequired: normalizeText(entry.actionRequired) || null
    };

    if (!normalized.memberEmail || !normalized.roleLabel) {
      continue;
    }

    const key = buildQuarterlyReviewItemKey(normalized);
    const existing = byKey.get(key);
    byKey.set(key, existing ? mergeBaselineEntry(existing, normalized) : normalized);
  }

  return Array.from(byKey.values()).sort((left, right) => {
    return (
      left.memberEmail.localeCompare(right.memberEmail) ||
      left.roleLabel.localeCompare(right.roleLabel) ||
      left.groupEmail.localeCompare(right.groupEmail)
    );
  });
}

export function buildQuarterlyAccessReviewRows(input: {
  review: QuarterlyReviewCampaignRecord;
  existingItems: QuarterlyReviewItemRecord[];
  baseline: QuarterlyReviewBaselineEntry[];
}) {
  const reviewName = normalizeText(input.review.name) || `Quarterly Access Review - ${input.review.quarterLabel}`;
  const reviewStatus = normalizeAccessReviewStatus(input.review.status, input.existingItems);
  const reviewStartedAt = toIso(input.review.startedAt);
  const reviewDueAt = toIso(input.review.dueAt);
  const reviewerEmail = normalizeEmail(input.review.reviewerEmail);

  const rowsByKey = new Map<string, QuarterlyAccessReviewExportRow>();
  const seenExistingIds = new Set<string>();

  for (const item of input.existingItems) {
    const key = buildQuarterlyReviewItemKey({
      memberEmail: item.memberEmail,
      roleLabel: item.roleLabel ?? "",
      groupEmail: item.groupEmail ?? ""
    });

    rowsByKey.set(key, {
      review_name: reviewName,
      quarter_label: input.review.quarterLabel,
      review_status: reviewStatus,
      review_started_at: reviewStartedAt,
      review_due_at: reviewDueAt,
      reviewer_email: reviewerEmail,
      member_name: normalizeText(item.memberName) || normalizeEmail(item.memberEmail),
      member_email: normalizeEmail(item.memberEmail),
      role_label: normalizeText(item.roleLabel),
      group_email: normalizeEmail(item.groupEmail),
      decision: normalizeAccessReviewDecision(item.decision),
      decision_notes: normalizeText(item.decisionNotes),
      access_justified: stringifyBoolean(item.accessJustified),
      action_required: normalizeText(item.actionRequired),
      reviewed_at: toIso(item.reviewedAt),
      reviewed_by_email: normalizeEmail(item.reviewedByEmail)
    });
    seenExistingIds.add(item.id);
  }

  for (const entry of buildQuarterlyReviewBaseline(input.baseline)) {
    const key = buildQuarterlyReviewItemKey(entry);
    const existing = rowsByKey.get(key);

    if (existing) {
      rowsByKey.set(key, {
        ...existing,
        member_name: existing.member_name || entry.memberName,
        member_email: existing.member_email || entry.memberEmail,
        role_label: existing.role_label || entry.roleLabel,
        group_email: existing.group_email || entry.groupEmail,
        action_required: existing.action_required || normalizeText(entry.actionRequired)
      });
      continue;
    }

    rowsByKey.set(key, {
      review_name: reviewName,
      quarter_label: input.review.quarterLabel,
      review_status: reviewStatus,
      review_started_at: reviewStartedAt,
      review_due_at: reviewDueAt,
      reviewer_email: reviewerEmail,
      member_name: entry.memberName,
      member_email: entry.memberEmail,
      role_label: entry.roleLabel,
      group_email: entry.groupEmail,
      decision: "PENDING",
      decision_notes: "",
      access_justified: "",
      action_required: normalizeText(entry.actionRequired),
      reviewed_at: "",
      reviewed_by_email: ""
    });
  }

  return Array.from(rowsByKey.values()).sort((left, right) => {
    return (
      left.member_email.localeCompare(right.member_email) ||
      left.role_label.localeCompare(right.role_label) ||
      left.group_email.localeCompare(right.group_email)
    );
  });
}
