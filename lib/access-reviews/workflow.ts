export const accessReviewDecisionValues = ["PENDING", "APPROVED", "REVOKE", "NEEDS_UPDATE"] as const;

export const actionableAccessReviewDecisionValues = ["APPROVED", "REVOKE", "NEEDS_UPDATE"] as const;

export const accessReviewStatusValues = ["PENDING", "IN_PROGRESS", "COMPLETED"] as const;

export type AccessReviewDecision = (typeof accessReviewDecisionValues)[number];
export type ActionableAccessReviewDecision = (typeof actionableAccessReviewDecisionValues)[number];
export type AccessReviewStatus = (typeof accessReviewStatusValues)[number];

export function normalizeAccessReviewDecision(value: string | null | undefined): AccessReviewDecision {
  const normalized = (value ?? "").trim().toUpperCase();

  if (!normalized || normalized === "PENDING") {
    return "PENDING";
  }

  if (normalized === "KEEP") {
    return "APPROVED";
  }

  if (normalized === "REMOVE") {
    return "REVOKE";
  }

  if (normalized === "NEEDS_REVIEW") {
    return "NEEDS_UPDATE";
  }

  if ((accessReviewDecisionValues as readonly string[]).includes(normalized)) {
    return normalized as AccessReviewDecision;
  }

  return "PENDING";
}

export function isPendingAccessReviewDecision(value: string | null | undefined) {
  return normalizeAccessReviewDecision(value) === "PENDING";
}

export function deriveAccessReviewStatus(items: Array<{ decision: string | null }>): AccessReviewStatus {
  if (items.length === 0) {
    return "PENDING";
  }

  const pendingCount = items.filter((item) => isPendingAccessReviewDecision(item.decision)).length;

  if (pendingCount === items.length) {
    return "PENDING";
  }

  if (pendingCount === 0) {
    return "COMPLETED";
  }

  return "IN_PROGRESS";
}

export function normalizeAccessReviewStatus(
  value: string | null | undefined,
  items: Array<{ decision: string | null }>
): AccessReviewStatus {
  const normalized = (value ?? "").trim().toUpperCase();

  if ((accessReviewStatusValues as readonly string[]).includes(normalized)) {
    return normalized as AccessReviewStatus;
  }

  return deriveAccessReviewStatus(items);
}

export function buildAccessReviewActionRequired(
  decision: ActionableAccessReviewDecision,
  existingActionRequired: string | null | undefined
) {
  if (decision === "APPROVED") {
    return existingActionRequired?.trim() || "Maintain membership";
  }

  if (decision === "REVOKE") {
    return "Pending reconcile/apply before access removal";
  }

  return "Review mapping, approver, or membership data";
}

export function buildAccessReviewSummary(items: Array<{ decision: string | null }>) {
  const totalItems = items.length;
  const pendingItems = items.filter((item) => isPendingAccessReviewDecision(item.decision)).length;
  const approvedItems = items.filter((item) => normalizeAccessReviewDecision(item.decision) === "APPROVED").length;
  const revokeItems = items.filter((item) => normalizeAccessReviewDecision(item.decision) === "REVOKE").length;
  const needsUpdateItems = items.filter((item) => normalizeAccessReviewDecision(item.decision) === "NEEDS_UPDATE").length;

  return {
    totalItems,
    pendingItems,
    approvedItems,
    revokeItems,
    needsUpdateItems,
    reviewedItems: totalItems - pendingItems
  };
}
