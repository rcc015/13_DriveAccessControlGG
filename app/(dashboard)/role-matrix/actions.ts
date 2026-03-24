"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { adminAssignmentRoles } from "@/lib/auth/authorization";
import { requireSession } from "@/lib/auth/session";
import { AuditLogService } from "@/lib/services/audit-log-service";

const ALLOWED_ACCESS_LEVELS = new Set(["VIEWER", "CONTRIBUTOR"]);

export async function createAdminRoleMapping(formData: FormData) {
  const session = await requireSession();
  ensureCanManageMappings(session.appRole);

  const roleId = String(formData.get("roleId") ?? "").trim();
  const sharedDriveId = String(formData.get("sharedDriveId") ?? "").trim();
  const groupEmail = String(formData.get("groupEmail") ?? "").trim().toLowerCase();
  const accessLevel = String(formData.get("accessLevel") ?? "").trim().toUpperCase();

  if (!roleId || !sharedDriveId || !groupEmail || !accessLevel) {
    throw new Error("Role, drive, group, and access level are required.");
  }

  if (!ALLOWED_ACCESS_LEVELS.has(accessLevel)) {
    throw new Error("App role mappings only support VIEWER or CONTRIBUTOR in this workflow.");
  }

  const [role, drive] = await Promise.all([
    prisma.role.findUnique({ where: { id: roleId } }),
    prisma.sharedDrive.findUnique({ where: { id: sharedDriveId } })
  ]);

  if (!role || !drive) {
    throw new Error("Role or Shared Drive not found.");
  }

  const existing = await prisma.groupMapping.findFirst({
    where: {
      roleId,
      sharedDriveId,
      restrictedFolderId: null,
      groupEmail
    }
  });

  if (existing) {
    await prisma.groupMapping.update({
      where: { id: existing.id },
      data: { accessLevel }
    });

    await new AuditLogService().record({
      actorEmail: session.email,
      actionType: "ROLE_MATRIX_MAPPING_UPDATED",
      targetGroupEmail: groupEmail,
      targetDriveName: drive.name,
      result: "SUCCESS",
      notes: `Updated app-role mapping for ${role.name} on ${drive.name}`,
      metadata: {
        mappingId: existing.id,
        roleName: role.name,
        previousAccessLevel: existing.accessLevel,
        newAccessLevel: accessLevel
      }
    });
  } else {
    const created = await prisma.groupMapping.create({
      data: {
        roleId,
        sharedDriveId,
        restrictedFolderId: null,
        groupEmail,
        accessLevel
      }
    });

    await new AuditLogService().record({
      actorEmail: session.email,
      actionType: "ROLE_MATRIX_MAPPING_CREATED",
      targetGroupEmail: groupEmail,
      targetDriveName: drive.name,
      result: "SUCCESS",
      notes: `Created app-role mapping for ${role.name} on ${drive.name}`,
      metadata: {
        mappingId: created.id,
        roleName: role.name,
        accessLevel
      }
    });
  }

  revalidatePath("/role-matrix");
}

export async function updateAdminRoleMapping(formData: FormData) {
  const session = await requireSession();
  ensureCanManageMappings(session.appRole);

  const mappingId = String(formData.get("mappingId") ?? "").trim();
  const groupEmail = String(formData.get("groupEmail") ?? "").trim().toLowerCase();
  const accessLevel = String(formData.get("accessLevel") ?? "").trim().toUpperCase();

  if (!mappingId || !groupEmail || !accessLevel) {
    throw new Error("Mapping, group, and access level are required.");
  }

  if (!ALLOWED_ACCESS_LEVELS.has(accessLevel)) {
    throw new Error("App role mappings only support VIEWER or CONTRIBUTOR in this workflow.");
  }

  const mapping = await prisma.groupMapping.findUnique({
    where: { id: mappingId },
    include: {
      role: true,
      sharedDrive: true
    }
  });

  if (!mapping || mapping.restrictedFolderId) {
    throw new Error("Only non-restricted app role mappings can be edited here.");
  }

  const conflict = await prisma.groupMapping.findFirst({
    where: {
      id: { not: mappingId },
      roleId: mapping.roleId,
      sharedDriveId: mapping.sharedDriveId,
      restrictedFolderId: null,
      groupEmail
    }
  });

  if (conflict) {
    throw new Error("Another mapping already exists for this role, drive, and group.");
  }

  const updated = await prisma.groupMapping.update({
    where: { id: mappingId },
    data: {
      groupEmail,
      accessLevel
    }
  });

  await new AuditLogService().record({
    actorEmail: session.email,
    actionType: "ROLE_MATRIX_MAPPING_UPDATED",
    targetGroupEmail: updated.groupEmail,
    targetDriveName: mapping.sharedDrive.name,
    result: "SUCCESS",
    notes: `Updated app-role mapping for ${mapping.role.name} on ${mapping.sharedDrive.name}`,
    metadata: {
      mappingId: mapping.id,
      roleName: mapping.role.name,
      previousGroupEmail: mapping.groupEmail,
      newGroupEmail: updated.groupEmail,
      previousAccessLevel: mapping.accessLevel,
      newAccessLevel: updated.accessLevel
    }
  });

  revalidatePath("/role-matrix");
}

export async function deleteAdminRoleMapping(formData: FormData) {
  const session = await requireSession();
  ensureCanManageMappings(session.appRole);

  const mappingId = String(formData.get("mappingId") ?? "").trim();

  if (!mappingId) {
    throw new Error("Mapping id is required.");
  }

  const mapping = await prisma.groupMapping.findUnique({
    where: { id: mappingId },
    include: {
      role: true,
      sharedDrive: true
    }
  });

  if (!mapping || mapping.restrictedFolderId) {
    throw new Error("Only non-restricted app role mappings can be removed here.");
  }

  await prisma.groupMapping.delete({
    where: { id: mappingId }
  });

  await new AuditLogService().record({
    actorEmail: session.email,
    actionType: "ROLE_MATRIX_MAPPING_REMOVED",
    targetGroupEmail: mapping.groupEmail,
    targetDriveName: mapping.sharedDrive.name,
    result: "SUCCESS",
    notes: `Removed app-role mapping for ${mapping.role.name} on ${mapping.sharedDrive.name}`,
    metadata: {
      mappingId: mapping.id,
      roleName: mapping.role.name,
      accessLevel: mapping.accessLevel
    }
  });

  revalidatePath("/role-matrix");
}

function ensureCanManageMappings(appRole: string) {
  if (!adminAssignmentRoles.includes(appRole as (typeof adminAssignmentRoles)[number])) {
    throw new Error("You are not allowed to modify the role matrix.");
  }
}
