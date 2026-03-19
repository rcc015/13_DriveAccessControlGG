"use server";

import { revalidatePath } from "next/cache";
import { adminAssignmentRoles, hasAnyRole } from "@/lib/auth/authorization";
import { prisma } from "@/lib/db/prisma";
import { requireSession } from "@/lib/auth/session";
import { GroupMembershipService } from "@/lib/services/group-membership-service";

export async function assignUserRole(formData: FormData) {
  const session = await requireSession();

  if (!hasAnyRole(session, adminAssignmentRoles)) {
    throw new Error("Only administrative roles can assign app roles.");
  }

  const userEmail = String(formData.get("userEmail") ?? "").trim().toLowerCase();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const roleId = String(formData.get("roleId") ?? "").trim();

  if (!userEmail || !roleId) {
    throw new Error("User email and role are required.");
  }

  const role = await prisma.role.findUnique({
    where: { id: roleId },
    include: {
      mappings: {
        include: {
          sharedDrive: true,
          restrictedFolder: true
        }
      }
    }
  });

  if (!role) {
    throw new Error("Selected role was not found.");
  }

  if (role.name === "ACCESS_ADMIN") {
    throw new Error("ACCESS_ADMIN is a legacy broad role. Use a drive-specific admin role instead.");
  }

  const user = await prisma.user.upsert({
    where: { email: userEmail },
    update: {
      displayName: displayName || userEmail.split("@")[0]
    },
    create: {
      email: userEmail,
      displayName: displayName || userEmail.split("@")[0]
    }
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: user.id,
        roleId: role.id
      }
    },
    update: {
      assignedBy: session.email
    },
    create: {
      userId: user.id,
      roleId: role.id,
      assignedBy: session.email
    }
  });

  const membershipService = new GroupMembershipService();

  for (const mapping of role.mappings) {
    await membershipService.addUserToGroup({
      actorEmail: session.email,
      userEmail,
      groupEmail: mapping.groupEmail,
      sharedDriveName: mapping.sharedDrive.name,
      restrictedFolderPath: mapping.restrictedFolder?.path,
      reason: `Role ${role.name} assigned through Drive Access Console`
    });
  }

  revalidatePath("/users");
  revalidatePath("/access-viewer");
  revalidatePath("/role-matrix");
}

export async function removeUserRole(formData: FormData) {
  const session = await requireSession();

  if (!hasAnyRole(session, adminAssignmentRoles)) {
    throw new Error("Only administrative roles can remove app roles.");
  }

  const userRoleId = String(formData.get("userRoleId") ?? "").trim();

  if (!userRoleId) {
    throw new Error("User role id is required.");
  }

  const userRole = await prisma.userRole.findUnique({
    where: { id: userRoleId },
    include: {
      user: true,
      role: {
        include: {
          mappings: {
            include: {
              sharedDrive: true,
              restrictedFolder: true
            }
          }
        }
      }
    }
  });

  if (!userRole) {
    throw new Error("User role assignment was not found.");
  }

  const otherRoles = await prisma.userRole.findMany({
    where: {
      userId: userRole.userId,
      id: { not: userRole.id }
    },
    include: {
      role: {
        include: {
          mappings: {
            include: {
              sharedDrive: true,
              restrictedFolder: true
            }
          }
        }
      }
    }
  });

  const membershipService = new GroupMembershipService();

  for (const mapping of userRole.role.mappings) {
    const stillCoveredByAnotherRole = otherRoles.some((otherRole) =>
      otherRole.role.mappings.some(
        (otherMapping) =>
          otherMapping.groupEmail === mapping.groupEmail &&
          otherMapping.sharedDrive.name === mapping.sharedDrive.name &&
          (otherMapping.restrictedFolder?.path ?? null) === (mapping.restrictedFolder?.path ?? null)
      )
    );

    if (stillCoveredByAnotherRole) {
      continue;
    }

    await membershipService.removeUserFromGroup({
      actorEmail: session.email,
      userEmail: userRole.user.email,
      groupEmail: mapping.groupEmail,
      sharedDriveName: mapping.sharedDrive.name,
      restrictedFolderPath: mapping.restrictedFolder?.path,
      reason: `Role ${userRole.role.name} removed through Drive Access Console`
    });
  }

  await prisma.userRole.delete({
    where: { id: userRole.id }
  });

  revalidatePath("/users");
  revalidatePath("/access-viewer");
  revalidatePath("/role-matrix");
}

export async function assignUserAccessRole(formData: FormData) {
  const session = await requireSession();

  if (!hasAnyRole(session, adminAssignmentRoles)) {
    throw new Error("Only administrative roles can assign business access roles.");
  }

  const userEmail = String(formData.get("userEmail") ?? "").trim().toLowerCase();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const accessRoleId = String(formData.get("accessRoleId") ?? "").trim();

  if (!userEmail || !accessRoleId) {
    throw new Error("User email and access role are required.");
  }

  const accessRole = await prisma.accessRole.findUnique({
    where: { id: accessRoleId },
    include: {
      mappings: {
        include: {
          sharedDrive: true,
          restrictedFolder: true
        }
      }
    }
  });

  if (!accessRole) {
    throw new Error("Selected access role was not found.");
  }

  const user = await prisma.user.upsert({
    where: { email: userEmail },
    update: {
      displayName: displayName || userEmail.split("@")[0]
    },
    create: {
      email: userEmail,
      displayName: displayName || userEmail.split("@")[0]
    }
  });

  await prisma.userAccessRole.upsert({
    where: {
      userId_accessRoleId: {
        userId: user.id,
        accessRoleId: accessRole.id
      }
    },
    update: {
      assignedBy: session.email
    },
    create: {
      userId: user.id,
      accessRoleId: accessRole.id,
      assignedBy: session.email
    }
  });

  const membershipService = new GroupMembershipService();

  for (const mapping of accessRole.mappings) {
    await membershipService.addUserToAccessRoleGroup({
      actorEmail: session.email,
      userEmail,
      groupEmail: mapping.groupEmail,
      sharedDriveName: mapping.sharedDrive.name,
      restrictedFolderPath: mapping.restrictedFolder?.path,
      reason: `Access role ${accessRole.code} assigned through Drive Access Console`
    });
  }

  revalidatePath("/users");
  revalidatePath("/access-viewer");
  revalidatePath("/role-matrix");
}

export async function removeUserAccessRole(formData: FormData) {
  const session = await requireSession();

  if (!hasAnyRole(session, adminAssignmentRoles)) {
    throw new Error("Only administrative roles can remove business access roles.");
  }

  const userAccessRoleId = String(formData.get("userAccessRoleId") ?? "").trim();

  if (!userAccessRoleId) {
    throw new Error("User access role id is required.");
  }

  const userAccessRole = await prisma.userAccessRole.findUnique({
    where: { id: userAccessRoleId },
    include: {
      user: true,
      accessRole: {
        include: {
          mappings: {
            include: {
              sharedDrive: true,
              restrictedFolder: true
            }
          }
        }
      }
    }
  });

  if (!userAccessRole) {
    throw new Error("User access role assignment was not found.");
  }

  const [otherAccessRoles, appRoles] = await Promise.all([
    prisma.userAccessRole.findMany({
      where: {
        userId: userAccessRole.userId,
        id: { not: userAccessRole.id }
      },
      include: {
        accessRole: {
          include: {
            mappings: {
              include: {
                sharedDrive: true,
                restrictedFolder: true
              }
            }
          }
        }
      }
    }),
    prisma.userRole.findMany({
      where: {
        userId: userAccessRole.userId
      },
      include: {
        role: {
          include: {
            mappings: {
              include: {
                sharedDrive: true,
                restrictedFolder: true
              }
            }
          }
        }
      }
    })
  ]);

  const membershipService = new GroupMembershipService();

  for (const mapping of userAccessRole.accessRole.mappings) {
    const stillCoveredByAnotherAccessRole = otherAccessRoles.some((otherRole) =>
      otherRole.accessRole.mappings.some(
        (otherMapping) =>
          otherMapping.groupEmail === mapping.groupEmail &&
          otherMapping.sharedDrive.name === mapping.sharedDrive.name &&
          (otherMapping.restrictedFolder?.path ?? null) === (mapping.restrictedFolder?.path ?? null)
      )
    );

    const stillCoveredByAppRole = appRoles.some((appRole) =>
      appRole.role.mappings.some(
        (otherMapping) =>
          otherMapping.groupEmail === mapping.groupEmail &&
          otherMapping.sharedDrive.name === mapping.sharedDrive.name &&
          (otherMapping.restrictedFolder?.path ?? null) === (mapping.restrictedFolder?.path ?? null)
      )
    );

    if (stillCoveredByAnotherAccessRole || stillCoveredByAppRole) {
      continue;
    }

    await membershipService.removeUserFromAccessRoleGroup({
      actorEmail: session.email,
      userEmail: userAccessRole.user.email,
      groupEmail: mapping.groupEmail,
      sharedDriveName: mapping.sharedDrive.name,
      restrictedFolderPath: mapping.restrictedFolder?.path,
      reason: `Access role ${userAccessRole.accessRole.code} removed through Drive Access Console`
    });
  }

  await prisma.userAccessRole.delete({
    where: { id: userAccessRole.id }
  });

  revalidatePath("/users");
  revalidatePath("/access-viewer");
  revalidatePath("/role-matrix");
}
