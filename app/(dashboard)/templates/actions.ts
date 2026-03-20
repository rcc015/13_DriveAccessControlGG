"use server";

import { revalidatePath } from "next/cache";
import { adminAssignmentRoles, hasAnyRole } from "@/lib/auth/authorization";
import { requireSession } from "@/lib/auth/session";
import { FolderTemplateService } from "@/lib/services/folder-template-service";
import type { FolderTemplateKind } from "@/types/domain";

export interface TemplateActionState {
  status: "idle" | "success" | "error";
  message?: string;
  folderUrl?: string;
}

export async function createFolderTemplate(
  _prevState: TemplateActionState,
  formData: FormData
): Promise<TemplateActionState> {
  const session = await requireSession();

  if (!hasAnyRole(session, adminAssignmentRoles)) {
    return {
      status: "error",
      message: "Only administrative roles can create folder templates."
    };
  }

  const template = String(formData.get("template") ?? "").trim() as FolderTemplateKind;
  const rootFolderName = String(formData.get("rootFolderName") ?? "").trim();
  const parentFolderPath = String(formData.get("parentFolderPath") ?? "").trim();

  if (!template || !rootFolderName || !parentFolderPath) {
    return {
      status: "error",
      message: "Template, root folder name, and base path are required."
    };
  }

  try {
    const service = new FolderTemplateService();
    const created = await service.createTemplate({
      actorEmail: session.email,
      template,
      rootFolderName,
      parentFolderPath
    });

    revalidatePath("/templates");
    revalidatePath("/reports");

    return {
      status: "success",
      message: `Created ${rootFolderName} with the ${template} template.`,
      folderUrl: created.webViewLink ?? undefined
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unknown folder template error."
    };
  }
}
