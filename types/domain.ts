export type AppRoleName =
  | "REQUESTER"
  | "SUPER_ADMIN"
  | "ACCESS_ADMIN"
  | "QMS_ACCESS_ADMIN"
  | "STRATEGIC_ACCESS_ADMIN"
  | "OPERATIONAL_ACCESS_ADMIN"
  | "SUPPORT_ACCESS_ADMIN"
  | "REVIEWER"
  | "READ_ONLY_AUDITOR";

export type AccessRequestStatus =
  | "REQUESTED"
  | "IN_REVIEW"
  | "APPROVED"
  | "NEEDS_INFO"
  | "REJECTED"
  | "FULFILLED"
  | "CANCELLED"
  | "EXPIRED"
  | "REVOKED";

export type AccessRequestType = "BUSINESS_ROLE" | "SHARED_DRIVE" | "RESTRICTED_FOLDER" | "OTHER";

export type ReportType =
  | "GROUP_MEMBERSHIP_SNAPSHOT"
  | "QUARTERLY_ACCESS_REVIEW"
  | "RESTRICTED_ACCESS_EXCEPTIONS"
  | "PERMISSION_MATRIX"
  | "ACCESS_CHANGE_LOG";

export type AccessReviewDecision = "PENDING" | "APPROVED" | "REVOKE" | "NEEDS_UPDATE";

export type AccessReviewStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED";

export type FolderTemplateKind = "EXPLORATION" | "ENGINEERING";

export interface EffectiveAccessSummary {
  sharedDriveName: string;
  viaGroups: string[];
  restrictedFolders: string[];
}

export interface GeneratedFileRef {
  fileId: string;
  webViewLink: string;
  name: string;
}
