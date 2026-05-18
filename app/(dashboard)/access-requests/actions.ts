"use server";

import { revalidatePath } from "next/cache";
import { adminAndReadRoles, adminAssignmentRoles, hasAnyRole } from "@/lib/auth/authorization";
import { requireSession } from "@/lib/auth/session";
import { AccessRequestService } from "@/lib/services/access-request-service";

function buildApprovalReference(requestId: string) {
  return `APR-${new Date().toISOString().slice(0, 10)}-${requestId.slice(0, 6)}`;
}

async function reviewAccessRequest(
  formData: FormData,
  decision: "APPROVED" | "REJECTED" | "NEEDS_INFO" | "IN_REVIEW"
) {
  const session = await requireSession();

  if (!hasAnyRole(session, adminAndReadRoles) || session.appRole === "READ_ONLY_AUDITOR") {
    throw new Error("Only review-capable roles can update access requests.");
  }

  const requestId = String(formData.get("requestId") ?? "").trim();
  const reviewerNotes = String(formData.get("reviewerNotes") ?? "").trim();

  if (!requestId) {
    throw new Error("Request id is required.");
  }

  const service = new AccessRequestService();
  await service.reviewRequest({
    actorEmail: session.email,
    requestId,
    decision,
    reviewerNotes,
    approvalReference: decision === "APPROVED" ? buildApprovalReference(requestId) : undefined
  });

  revalidatePath("/access-requests");
  revalidatePath("/request-access");
}

export async function approveAccessRequest(formData: FormData) {
  return reviewAccessRequest(formData, "APPROVED");
}

export async function rejectAccessRequest(formData: FormData) {
  return reviewAccessRequest(formData, "REJECTED");
}

export async function requestMoreInfoForAccessRequest(formData: FormData) {
  return reviewAccessRequest(formData, "NEEDS_INFO");
}

export async function markAccessRequestInReview(formData: FormData) {
  return reviewAccessRequest(formData, "IN_REVIEW");
}

export async function createRestrictedAccessRequest(formData: FormData) {
  const session = await requireSession();

  if (!hasAnyRole(session, adminAssignmentRoles)) {
    throw new Error("Only administrative roles can create managed access requests on behalf of a user.");
  }

  const service = new AccessRequestService();
  await service.createRequest({
    requesterEmail: session.email,
    requesterName: session.displayName,
    requestType: "RESTRICTED_FOLDER",
    restrictedFolderId: String(formData.get("restrictedFolderId") ?? "").trim(),
    justification: String(formData.get("justification") ?? ""),
    requestedExpirationDate: (() => {
      const value = String(formData.get("requestedExpirationDate") ?? "").trim();
      return value ? new Date(`${value}T00:00:00.000Z`) : undefined;
    })()
  });

  revalidatePath("/access-requests");
  revalidatePath("/request-access");
}
