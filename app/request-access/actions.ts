"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { AccessRequestService } from "@/lib/services/access-request-service";
import type { AccessRequestType } from "@/types/domain";

function parseOptionalDate(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim() === "") {
    return undefined;
  }

  return new Date(`${value}T00:00:00.000Z`);
}

export async function submitAccessRequest(formData: FormData) {
  const session = await requireSession();

  if (session.appRole !== "REQUESTER") {
    throw new Error("Only requester users can submit requests from this portal.");
  }

  const requestType = String(formData.get("requestType") ?? "").trim() as AccessRequestType;
  const service = new AccessRequestService();

  await service.createRequest({
    requesterEmail: session.email,
    requesterName: session.displayName,
    requestType,
    accessRoleId: String(formData.get("accessRoleId") ?? "").trim() || undefined,
    sharedDriveId: String(formData.get("sharedDriveId") ?? "").trim() || undefined,
    restrictedFolderId: String(formData.get("restrictedFolderId") ?? "").trim() || undefined,
    otherTargetText: String(formData.get("otherTargetText") ?? "").trim() || undefined,
    requestedAccessLevel: String(formData.get("requestedAccessLevel") ?? "").trim() || undefined,
    justification: String(formData.get("justification") ?? ""),
    neededByDate: parseOptionalDate(formData.get("neededByDate")),
    requestedExpirationDate: parseOptionalDate(formData.get("requestedExpirationDate"))
  });

  revalidatePath("/request-access");
  revalidatePath("/access-requests");
}

export async function cancelMyAccessRequest(formData: FormData) {
  const session = await requireSession();

  if (session.appRole !== "REQUESTER") {
    throw new Error("Only requester users can cancel requests from this portal.");
  }

  const requestId = String(formData.get("requestId") ?? "").trim();
  if (!requestId) {
    throw new Error("Request id is required.");
  }

  const service = new AccessRequestService();
  await service.cancelRequest({
    actorEmail: session.email,
    requestId
  });

  revalidatePath("/request-access");
  revalidatePath("/access-requests");
}
