import type { AppRoleName } from "@/types/domain";

export const adminRolePriority: AppRoleName[] = [
  "SUPER_ADMIN",
  "ACCESS_ADMIN",
  "QMS_ACCESS_ADMIN",
  "STRATEGIC_ACCESS_ADMIN",
  "OPERATIONAL_ACCESS_ADMIN",
  "SUPPORT_ACCESS_ADMIN",
  "REVIEWER",
  "READ_ONLY_AUDITOR"
];

export type AccessResolutionReason =
  | "AUTHORIZED_ADMIN"
  | "AUTHORIZED_REQUESTER"
  | "NOT_IN_ALLOWED_DOMAIN"
  | "NOT_SYNCED_ACTIVE_EMPLOYEE"
  | "DIRECTORY_INACTIVE";

export interface AccessResolverInput {
  email: string;
  hostedDomain?: string;
  explicitRole?: AppRoleName | null;
  assignedRoles?: AppRoleName[];
  directoryUser?: {
    isActive: boolean;
    directoryStatus?: "ACTIVE" | "INACTIVE" | "SUSPENDED" | null;
  } | null;
}

export interface AccessResolution {
  authorized: boolean;
  appRole: AppRoleName | null;
  reason: AccessResolutionReason;
}

export function getHighestPriorityRole(roles: AppRoleName[]) {
  for (const role of adminRolePriority) {
    if (roles.includes(role)) {
      return role;
    }
  }

  return null;
}

export function isAdminRole(role: AppRoleName) {
  return role !== "REQUESTER";
}

export function resolveAccessForIdentity(input: AccessResolverInput): AccessResolution {
  const normalizedEmail = input.email.trim().toLowerCase();
  const hostedDomain = input.hostedDomain?.trim().toLowerCase();

  if (hostedDomain && !normalizedEmail.endsWith(`@${hostedDomain}`)) {
    return {
      authorized: false,
      appRole: null,
      reason: "NOT_IN_ALLOWED_DOMAIN"
    };
  }

  const directoryUser = input.directoryUser ?? null;
  const assignedRole = getHighestPriorityRole(input.assignedRoles ?? []);
  const resolvedRole = input.explicitRole ?? assignedRole;

  if (directoryUser && (!directoryUser.isActive || directoryUser.directoryStatus === "INACTIVE" || directoryUser.directoryStatus === "SUSPENDED")) {
    return {
      authorized: false,
      appRole: null,
      reason: "DIRECTORY_INACTIVE"
    };
  }

  if (resolvedRole) {
    return {
      authorized: true,
      appRole: resolvedRole,
      reason: "AUTHORIZED_ADMIN"
    };
  }

  if (!directoryUser || !directoryUser.isActive || directoryUser.directoryStatus !== "ACTIVE") {
    return {
      authorized: false,
      appRole: null,
      reason: "NOT_SYNCED_ACTIVE_EMPLOYEE"
    };
  }

  return {
    authorized: true,
    appRole: "REQUESTER",
    reason: "AUTHORIZED_REQUESTER"
  };
}

export function getHomeRouteForRole(role: AppRoleName) {
  return role === "REQUESTER" ? "/request-access" : "/";
}
