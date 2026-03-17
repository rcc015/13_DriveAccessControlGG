"use server";

import { revalidatePath } from "next/cache";
import { hasAnyRole } from "@/lib/auth/authorization";
import { requireSession } from "@/lib/auth/session";
import { getDirectoryProvider } from "@/lib/google/provider-factory";

export async function runDirectorySearchProbe(formData: FormData) {
  const session = await requireSession();

  if (!hasAnyRole(session, ["SUPER_ADMIN"])) {
    throw new Error("Only Super Admin can run Google integration probes.");
  }

  const query = String(formData.get("query") ?? "").trim();

  if (!query) {
    throw new Error("A search query is required for the Directory probe.");
  }

  const directory = getDirectoryProvider();
  await directory.searchUsers(query);

  revalidatePath("/google-integration");
}

export async function runGroupMembersProbe(formData: FormData) {
  const session = await requireSession();

  if (!hasAnyRole(session, ["SUPER_ADMIN"])) {
    throw new Error("Only Super Admin can run Google integration probes.");
  }

  const groupEmail = String(formData.get("groupEmail") ?? "").trim();

  if (!groupEmail) {
    throw new Error("A group email is required for the membership probe.");
  }

  const directory = getDirectoryProvider();
  await directory.listGroupMembers(groupEmail);

  revalidatePath("/google-integration");
}
