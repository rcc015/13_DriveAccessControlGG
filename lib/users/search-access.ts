import { adminAndReadRoles, hasAnyRole } from "@/lib/auth/authorization";
import type { AppSession } from "@/lib/auth/session";

const allowedUserSearchRoles = [...new Set([...adminAndReadRoles])];

export function canSearchManagedUsers(session: AppSession | null) {
  if (!session) {
    return false;
  }

  return hasAnyRole(session, allowedUserSearchRoles);
}
