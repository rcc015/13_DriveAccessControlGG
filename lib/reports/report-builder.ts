import type { ReportType } from "@/types/domain";

export interface BuiltReport {
  fileName: string;
  mimeType: string;
  content: Buffer;
}

function timestampToken(date = new Date()) {
  const iso = date.toISOString().replace(/[-:]/g, "");
  return iso.slice(0, 13);
}

function escapeCsvCell(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  const stringValue = String(value);

  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replaceAll('"', '""')}"`;
  }

  return stringValue;
}

function toCsv(columns: string[], rows: Array<Record<string, unknown>>) {
  const header = columns.join(",");
  const body = rows.map((row) => columns.map((column) => escapeCsvCell(row[column])).join(","));
  return [header, ...body].join("\n");
}

function normalizeReportLabel(reportType: ReportType) {
  switch (reportType) {
    case "GROUP_MEMBERSHIP_SNAPSHOT":
      return "GroupMembershipSnapshot";
    case "QUARTERLY_ACCESS_REVIEW":
      return "QuarterlyAccessReview";
    case "RESTRICTED_ACCESS_EXCEPTIONS":
      return "RestrictedAccessExceptions";
    case "PERMISSION_MATRIX":
      return "PermissionMatrix";
    case "ACCESS_CHANGE_LOG":
      return "AccessChangeLog";
  }
}

function buildMembershipSnapshot(payload: any[]) {
  const rows = payload.map((membership) => ({
    user_email: membership.user?.email ?? "",
    user_name: membership.user?.displayName ?? "",
    source: membership.source,
    granted_at: membership.grantedAt?.toISOString?.() ?? "",
    revoked_at: membership.revokedAt?.toISOString?.() ?? "",
    group_email:
      membership.groupMapping?.groupEmail ?? membership.accessRoleMapping?.groupEmail ?? "",
    access_level:
      membership.groupMapping?.accessLevel ?? membership.accessRoleMapping?.accessLevel ?? "",
    shared_drive:
      membership.groupMapping?.sharedDrive?.name ?? membership.accessRoleMapping?.sharedDrive?.name ?? "",
    restricted_folder:
      membership.groupMapping?.restrictedFolder?.path ??
      membership.accessRoleMapping?.restrictedFolder?.path ??
      "",
    app_role: membership.groupMapping?.role?.name ?? "",
    business_role: membership.accessRoleMapping?.accessRole?.displayName ?? ""
  }));

  return toCsv(
    [
      "user_email",
      "user_name",
      "source",
      "granted_at",
      "revoked_at",
      "group_email",
      "access_level",
      "shared_drive",
      "restricted_folder",
      "app_role",
      "business_role"
    ],
    rows
  );
}

function buildQuarterlyAccessReview(payload: any[]) {
  const rows = payload.flatMap((review) =>
    review.items.map((item: any) => ({
      review_name: review.name,
      quarter_label: review.quarterLabel,
      review_status: review.status,
      review_started_at: review.startedAt?.toISOString?.() ?? "",
      review_due_at: review.dueAt?.toISOString?.() ?? "",
      reviewer_email: review.reviewerEmail,
      member_name: item.memberName ?? "",
      member_email: item.memberEmail,
      role_label: item.roleLabel ?? "",
      group_email: item.groupEmail ?? "",
      decision: item.decision ?? "",
      decision_notes: item.decisionNotes ?? "",
      access_justified: item.accessJustified ?? "",
      action_required: item.actionRequired ?? "",
      reviewed_at: item.reviewedAt?.toISOString?.() ?? "",
      reviewed_by_email: item.reviewedByEmail ?? ""
    }))
  );

  return toCsv(
    [
      "review_name",
      "quarter_label",
      "review_status",
      "review_started_at",
      "review_due_at",
      "reviewer_email",
      "member_name",
      "member_email",
      "role_label",
      "group_email",
      "decision",
      "decision_notes",
      "access_justified",
      "action_required",
      "reviewed_at",
      "reviewed_by_email"
    ],
    rows
  );
}

function buildRestrictedAccessExceptions(payload: any[]) {
  const rows = payload.map((request) => ({
    user_email: request.user?.email ?? "",
    user_name: request.user?.displayName ?? "",
    restricted_folder: request.restrictedFolder?.path ?? "",
    requested_by_email: request.requestedByEmail,
    approver_email: request.approverEmail ?? "",
    approval_reference: request.approvalReference ?? "",
    justification: request.justification,
    status: request.status,
    start_date: request.startDate?.toISOString?.() ?? "",
    end_date: request.endDate?.toISOString?.() ?? "",
    decided_at: request.decidedAt?.toISOString?.() ?? "",
    created_at: request.createdAt?.toISOString?.() ?? ""
  }));

  return toCsv(
    [
      "user_email",
      "user_name",
      "restricted_folder",
      "requested_by_email",
      "approver_email",
      "approval_reference",
      "justification",
      "status",
      "start_date",
      "end_date",
      "decided_at",
      "created_at"
    ],
    rows
  );
}

function buildPermissionMatrix(payload: any[]) {
  const rows = payload.map((mapping) => ({
    role_type: mapping.accessRole ? "BUSINESS_ACCESS_ROLE" : "APP_ROLE",
    role_code: mapping.accessRole?.code ?? "",
    role_name: mapping.accessRole?.displayName ?? mapping.role?.name ?? "",
    department: mapping.accessRole?.department ?? "",
    shared_drive: mapping.sharedDrive?.name ?? "",
    restricted_folder: mapping.restrictedFolder?.path ?? "",
    group_email: mapping.groupEmail,
    access_level: mapping.accessLevel
  }));

  return toCsv(
    [
      "role_type",
      "role_code",
      "role_name",
      "department",
      "shared_drive",
      "restricted_folder",
      "group_email",
      "access_level"
    ],
    rows
  );
}

function buildAccessChangeLog(payload: any[]) {
  const rows = payload.map((entry) => ({
    happened_at: entry.happenedAt?.toISOString?.() ?? "",
    actor_email: entry.actorEmail,
    action_type: entry.actionType,
    target_user_email: entry.targetUserEmail ?? "",
    target_group_email: entry.targetGroupEmail ?? "",
    target_drive_name: entry.targetDriveName ?? "",
    target_folder_path: entry.targetFolderPath ?? "",
    approval_reference: entry.approvalReference ?? "",
    result: entry.result,
    notes: entry.notes ?? "",
    metadata_json: entry.metadataJson ? JSON.stringify(entry.metadataJson) : ""
  }));

  return toCsv(
    [
      "happened_at",
      "actor_email",
      "action_type",
      "target_user_email",
      "target_group_email",
      "target_drive_name",
      "target_folder_path",
      "approval_reference",
      "result",
      "notes",
      "metadata_json"
    ],
    rows
  );
}

export function buildCsvReport(reportType: ReportType, payload: unknown): BuiltReport {
  const csv =
    reportType === "GROUP_MEMBERSHIP_SNAPSHOT"
      ? buildMembershipSnapshot(payload as any[])
      : reportType === "QUARTERLY_ACCESS_REVIEW"
        ? buildQuarterlyAccessReview(payload as any[])
        : reportType === "RESTRICTED_ACCESS_EXCEPTIONS"
          ? buildRestrictedAccessExceptions(payload as any[])
          : reportType === "PERMISSION_MATRIX"
            ? buildPermissionMatrix(payload as any[])
            : buildAccessChangeLog(payload as any[]);

  return {
    fileName: `${normalizeReportLabel(reportType)}_${timestampToken()}.csv`,
    mimeType: "text/csv",
    content: Buffer.from(csv, "utf8")
  };
}
