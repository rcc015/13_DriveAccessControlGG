"use server";

import { revalidatePath } from "next/cache";
import { adminAssignmentRoles, hasAnyRole, requestPortalRoles } from "@/lib/auth/authorization";
import { requireSession } from "@/lib/auth/session";
import { AccessRequestService } from "@/lib/services/access-request-service";
import { resolveManagedUserSelection } from "@/lib/users/selection";

function parseOptionalDate(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim() === "") {
    return undefined;
  }

  return new Date(`${value}T00:00:00.000Z`);
}

export async function createRestrictedAccessRequest(formData: FormData) {
  const session = await requireSession();

  if (!hasAnyRole(session, requestPortalRoles)) {
    throw new Error("Your current app role cannot create access requests.");
  }

  const service = new AccessRequestService();
  const restrictedFolderId = String(formData.get("restrictedFolderId") ?? "").trim();
  const justification = String(formData.get("justification") ?? "").trim();
  const selection = await resolveManagedUserSelection(formData, {
    emailField: "targetUserEmail",
    displayNameField: "targetUserDisplayName",
    selectionIdField: "selectedUserId"
  });

  if (!restrictedFolderId || !justification) {
    throw new Error("Target user, restricted folder, and justification are required.");
  }

  await service.createRequest({
    requesterEmail: session.email,
    targetUserEmail: selection.email,
    targetUserDisplayName: selection.displayName,
    restrictedFolderId,
    justification,
    startDate: parseOptionalDate(formData.get("startDate")),
    endDate: parseOptionalDate(formData.get("endDate"))
  });

  revalidatePath("/access-requests");
  revalidatePath("/access-viewer");
}

export async function approveRestrictedAccessRequest(formData: FormData) {
  const session = await requireSession();

  if (!hasAnyRole(session, adminAssignmentRoles)) {
    throw new Error("Only administrative roles can approve access requests.");
  }

  const service = new AccessRequestService();
  const requestId = String(formData.get("requestId") ?? "").trim();

  if (!requestId) {
    throw new Error("Request id is required.");
  }

  await service.decideRequest({
    actorEmail: session.email,
    requestId,
    decision: "APPROVED",
    approvalReference: `APR-${new Date().toISOString().slice(0, 10)}-${requestId.slice(0, 6)}`
  });

  revalidatePath("/access-requests");
  revalidatePath("/access-viewer");
}

export async function rejectRestrictedAccessRequest(formData: FormData) {
  const session = await requireSession();

  if (!hasAnyRole(session, adminAssignmentRoles)) {
    throw new Error("Only administrative roles can reject access requests.");
  }

  const service = new AccessRequestService();
  const requestId = String(formData.get("requestId") ?? "").trim();

  if (!requestId) {
    throw new Error("Request id is required.");
  }

  await service.decideRequest({
    actorEmail: session.email,
    requestId,
    decision: "REJECTED"
  });

  revalidatePath("/access-requests");
}
