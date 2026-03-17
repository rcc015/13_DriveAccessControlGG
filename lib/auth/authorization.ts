import type { AppSession } from "@/lib/auth/session";
import type { AppRoleName } from "@/types/domain";

export const adminAssignmentRoles: AppRoleName[] = [
  "SUPER_ADMIN",
  "ACCESS_ADMIN",
  "QMS_ACCESS_ADMIN",
  "STRATEGIC_ACCESS_ADMIN",
  "OPERATIONAL_ACCESS_ADMIN",
  "SUPPORT_ACCESS_ADMIN"
];

export const adminAndReadRoles: AppRoleName[] = [
  ...adminAssignmentRoles,
  "REVIEWER",
  "READ_ONLY_AUDITOR"
];

export function hasAnyRole(session: AppSession, allowedRoles: AppRoleName[]) {
  return allowedRoles.includes(session.appRole);
}
