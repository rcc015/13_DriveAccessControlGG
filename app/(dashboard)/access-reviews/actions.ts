"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { AccessReviewDecisionService } from "@/lib/services/access-review-decision-service";

function buildReturnUrl(returnTo: string | null | undefined, message: string, status = "success") {
  const fallbackPath = "/access-reviews";
  const trimmed = (returnTo ?? "").trim();
  const base = trimmed.startsWith("/access-reviews") ? trimmed : fallbackPath;
  const [pathname, queryString = ""] = base.split("?");
  const params = new URLSearchParams(queryString);
  params.set("status", status);
  params.set("message", message);
  return `${pathname}?${params.toString()}`;
}

function redirectToAccessReviews(returnTo: string | null | undefined, message: string, status = "success") {
  redirect(buildReturnUrl(returnTo, message, status) as never);
}

export async function reviewAccessReviewItem(formData: FormData) {
  const session = await requireSession();
  const itemId = String(formData.get("itemId") ?? "").trim();
  const decision = String(formData.get("decision") ?? "").trim();
  const decisionNotes = String(formData.get("decisionNotes") ?? "").trim();
  const accessJustified = String(formData.get("accessJustified") ?? "").trim();
  const returnTo = String(formData.get("returnTo") ?? "").trim();

  if (!itemId) {
    throw new Error("Access review item is required.");
  }

  const service = new AccessReviewDecisionService();
  await service.reviewItem({
    itemId,
    reviewerEmail: session.email,
    decision,
    decisionNotes,
    accessJustified
  });

  revalidatePath("/access-reviews");
  revalidatePath("/reports");
  redirectToAccessReviews(returnTo, `Review item saved as ${decision.trim().toUpperCase()}.`);
}

export async function bulkReviewAccessReviewItems(formData: FormData) {
  const session = await requireSession();
  const itemIds = formData
    .getAll("selectedItemIds")
    .map((value) => String(value).trim())
    .filter(Boolean);
  const decision = String(formData.get("decision") ?? "").trim();
  const decisionNotes = String(formData.get("decisionNotes") ?? "").trim();
  const accessJustified = String(formData.get("accessJustified") ?? "").trim();
  const returnTo = String(formData.get("returnTo") ?? "").trim();

  const service = new AccessReviewDecisionService();
  const result = await service.reviewItems({
    itemIds,
    reviewerEmail: session.email,
    decision,
    decisionNotes,
    accessJustified,
    bulk: true
  });

  revalidatePath("/access-reviews");
  revalidatePath("/reports");
  redirectToAccessReviews(returnTo, `${result.itemCount} review item(s) saved as ${result.decision}.`);
}
