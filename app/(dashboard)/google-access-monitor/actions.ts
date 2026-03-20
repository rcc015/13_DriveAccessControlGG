"use server";

import { revalidatePath } from "next/cache";
import { adminAssignmentRoles, hasAnyRole } from "@/lib/auth/authorization";
import { requireSession } from "@/lib/auth/session";
import { GoogleAccessMonitorService, type ReconcileApplyResult } from "@/lib/services/google-access-monitor-service";

export interface ApplyReconcileState {
  ok: boolean;
  message: string;
  summary?: {
    applied: number;
    skipped: number;
    failed: number;
  };
  results?: ReconcileApplyResult[];
}

export async function applyReconcile(
  _previousState: ApplyReconcileState,
  _formData: FormData
): Promise<ApplyReconcileState> {
  const session = await requireSession();

  if (!hasAnyRole(session, adminAssignmentRoles)) {
    return {
      ok: false,
      message: "Only administrative roles can apply reconcile actions."
    };
  }

  const service = new GoogleAccessMonitorService();
  const result = await service.applyReconcilePreview(session.email);

  revalidatePath("/google-access-monitor");
  revalidatePath("/");

  return {
    ok: result.summary.failed === 0,
    message:
      result.summary.failed === 0
        ? "Reconcile applied successfully. Refreshing monitor data is recommended."
        : "Reconcile finished with some failures. Review the per-action results below.",
    summary: result.summary,
    results: result.results
  };
}
