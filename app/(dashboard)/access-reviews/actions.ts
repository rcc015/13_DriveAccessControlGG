"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireSession } from "@/lib/auth/session";
import { GroupMembershipService } from "@/lib/services/group-membership-service";

export async function markAccessReviewItem(formData: FormData) {
  const session = await requireSession();
  const itemId = String(formData.get("itemId") ?? "").trim();
  const decision = String(formData.get("decision") ?? "").trim().toUpperCase();

  if (!itemId || !["KEEP", "REMOVE", "NEEDS_REVIEW"].includes(decision)) {
    throw new Error("Valid review item and decision are required.");
  }

  const item = await prisma.accessReviewItem.findUnique({
    where: { id: itemId },
    include: {
      accessReview: true
    }
  });

  if (!item) {
    throw new Error("Access review item not found.");
  }

  if ((decision === "KEEP" || decision === "REMOVE") && item.groupMappingId) {
    const mapping = await prisma.groupMapping.findUnique({
      where: { id: item.groupMappingId },
      include: {
        sharedDrive: true,
        restrictedFolder: true
      }
    });

    if (mapping) {
      const membershipService = new GroupMembershipService();

      if (decision === "REMOVE") {
        await membershipService.removeUserFromGroup({
          actorEmail: session.email,
          userEmail: item.memberEmail,
          groupEmail: mapping.groupEmail,
          sharedDriveName: mapping.sharedDrive.name,
          restrictedFolderPath: mapping.restrictedFolder?.path,
          reason: `Quarterly access review removal from ${item.accessReview.quarterLabel}`
        });
      }

      if (decision === "KEEP") {
        await membershipService.addUserToGroup({
          actorEmail: session.email,
          userEmail: item.memberEmail,
          groupEmail: mapping.groupEmail,
          sharedDriveName: mapping.sharedDrive.name,
          restrictedFolderPath: mapping.restrictedFolder?.path,
          reason: `Quarterly access review keep decision for ${item.accessReview.quarterLabel}`
        });
      }
    }
  }

  await prisma.accessReviewItem.update({
    where: { id: itemId },
    data: {
      decision,
      accessJustified: decision === "KEEP" ? true : decision === "REMOVE" ? false : null,
      actionRequired: decision === "REMOVE" ? "Remove membership" : decision === "KEEP" ? "Maintain membership" : null,
      reviewedAt: new Date(),
      reviewedByEmail: session.email
    }
  });

  revalidatePath("/access-reviews");
}
