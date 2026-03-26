"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  cleanupOrphanedMemberships,
  type CleanupOrphanedMembershipState
} from "@/app/(dashboard)/users/actions";

const initialCleanupOrphanedMembershipState: CleanupOrphanedMembershipState = {
  ok: true,
  message: "",
  removed: 0,
  failed: 0
};

function CleanupButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className="button-ghost" disabled={pending}>
      {pending ? "Cleaning..." : "Clean up orphaned memberships"}
    </button>
  );
}

export function OrphanedMembershipCleanupForm({ userEmail }: { userEmail: string }) {
  const [state, formAction] = useActionState(cleanupOrphanedMemberships, initialCleanupOrphanedMembershipState);

  return (
    <div className="stack-tight">
      <form action={formAction}>
        <input type="hidden" name="userEmail" value={userEmail} />
        <CleanupButton />
      </form>
      {state.message ? (
        <div className={`callout ${state.ok ? "success" : "error"}`}>
          <strong>{state.ok ? "Cleanup result" : "Cleanup needs review"}</strong>
          <p>{state.message}</p>
        </div>
      ) : null}
    </div>
  );
}
