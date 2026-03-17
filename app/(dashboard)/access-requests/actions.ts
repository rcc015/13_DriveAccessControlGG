"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { AccessRequestService } from "@/lib/services/access-request-service";

function parseOptionalDate(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim() === "") {
    return undefined;
  }

  return new Date(`${value}T00:00:00.000Z`);
}

export async function createRestrictedAccessRequest(formData: FormData) {
  const session = await requireSession();
  const service = new AccessRequestService();

  const targetUserEmail = String(formData.get("targetUserEmail") ?? "").trim().toLowerCase();
  const restrictedFolderId = String(formData.get("restrictedFolderId") ?? "").trim();
  const justification = String(formData.get("justification") ?? "").trim();

  if (!targetUserEmail || !restrictedFolderId || !justification) {
    throw new Error("Target user, restricted folder, and justification are required.");
  }

  await service.createRequest({
    requesterEmail: session.email,
    targetUserEmail,
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
