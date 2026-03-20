"use server";

import { revalidatePath } from "next/cache";
import { adminAssignmentRoles, hasAnyRole } from "@/lib/auth/authorization";
import { requireSession } from "@/lib/auth/session";
import { GoogleAccessMonitorService } from "@/lib/services/google-access-monitor-service";

export async function applyReconcile() {
  const session = await requireSession();

  if (!hasAnyRole(session, adminAssignmentRoles)) {
    throw new Error("Only administrative roles can apply reconcile actions.");
  }

  const service = new GoogleAccessMonitorService();
  await service.applyReconcilePreview(session.email);

  revalidatePath("/google-access-monitor");
  revalidatePath("/");
}
