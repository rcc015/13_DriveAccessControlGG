"use server";

import { revalidatePath } from "next/cache";
import { adminAssignmentRoles, hasAnyRole } from "@/lib/auth/authorization";
import { prisma } from "@/lib/db/prisma";
import { requireSession } from "@/lib/auth/session";
import { getDirectoryProvider } from "@/lib/google/provider-factory";
import { GroupMembershipService } from "@/lib/services/group-membership-service";
import { AuditLogService } from "@/lib/services/audit-log-service";

export interface CleanupOrphanedMembershipState {
  ok: boolean;
  message: string;
  removed: number;
  failed: number;
}

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

export async function cleanupOrphanedMemberships(
  _previousState: CleanupOrphanedMembershipState,
  formData: FormData
): Promise<CleanupOrphanedMembershipState> {
  try {
    const session = await requireSession();

    if (!hasAnyRole(session, adminAssignmentRoles)) {
      return {
        ok: false,
        message: "Only administrative roles can clean orphaned memberships.",
        removed: 0,
        failed: 0
      };
    }

    const userEmail = String(formData.get("userEmail") ?? "").trim().toLowerCase();

    if (!userEmail) {
      return {
        ok: false,
        message: "User email is required.",
        removed: 0,
        failed: 0
      };
    }

    const [userRoles, userAccessRoles, activeMemberships] = await Promise.all([
      prisma.userRole.findMany({
        where: {
          user: { email: userEmail }
        }
      }),
      prisma.userAccessRole.findMany({
        where: {
          user: { email: userEmail }
        }
      }),
      prisma.groupMembership.findMany({
        where: {
          user: { email: userEmail },
          revokedAt: null
        },
        include: {
          groupMapping: {
            include: {
              sharedDrive: true,
              restrictedFolder: true
            }
          },
          accessRoleMapping: {
            include: {
              accessRole: true,
              sharedDrive: true,
              restrictedFolder: true
            }
          }
        },
        orderBy: [{ grantedAt: "desc" }]
      })
    ]);

    if (userRoles.length > 0 || userAccessRoles.length > 0) {
      return {
        ok: false,
        message: "This user still has local role assignments. Remove those first before cleaning memberships.",
        removed: 0,
        failed: 0
      };
    }

    if (activeMemberships.length === 0) {
      return {
        ok: true,
        message: "No orphaned memberships were found for this user.",
        removed: 0,
        failed: 0
      };
    }

    const directory = getDirectoryProvider();
    const auditLog = new AuditLogService();
    let removed = 0;
    let failed = 0;

    for (const membership of activeMemberships) {
      try {
        const groupEmail = membership.groupMapping?.groupEmail ?? membership.accessRoleMapping?.groupEmail ?? null;
        const sharedDriveName =
          membership.groupMapping?.sharedDrive.name ?? membership.accessRoleMapping?.sharedDrive.name ?? null;
        const restrictedFolderPath =
          membership.groupMapping?.restrictedFolder?.path ?? membership.accessRoleMapping?.restrictedFolder?.path ?? null;

        if (groupEmail) {
          await directory.removeGroupMember(groupEmail, userEmail);
        }

        await prisma.groupMembership.update({
          where: { id: membership.id },
          data: {
            revokedAt: new Date(),
            revokedReason: "Orphaned membership cleaned up through Users module"
          }
        });

        await auditLog.record({
          actorEmail: session.email,
          actionType: membership.accessRoleMapping ? "ACCESS_ROLE_MEMBERSHIP_REMOVE" : "GROUP_MEMBERSHIP_REMOVE",
          targetUserEmail: userEmail,
          targetGroupEmail: groupEmail ?? undefined,
          targetDriveName: sharedDriveName ?? undefined,
          targetFolderPath: restrictedFolderPath ?? undefined,
          result: "SUCCESS",
          notes: "Orphaned membership cleaned up through Users module"
        });

        removed += 1;
      } catch (error) {
        failed += 1;

        await auditLog.record({
          actorEmail: session.email,
          actionType: "ORPHANED_MEMBERSHIP_CLEANUP",
          targetUserEmail: userEmail,
          targetGroupEmail: membership.groupMapping?.groupEmail ?? membership.accessRoleMapping?.groupEmail ?? undefined,
          targetDriveName:
            membership.groupMapping?.sharedDrive.name ?? membership.accessRoleMapping?.sharedDrive.name ?? undefined,
          targetFolderPath:
            membership.groupMapping?.restrictedFolder?.path ??
            membership.accessRoleMapping?.restrictedFolder?.path ??
            undefined,
          result: "FAILED",
          notes: error instanceof Error ? error.message : "Unknown cleanup error"
        });
      }
    }

    await auditLog.record({
      actorEmail: session.email,
      actionType: "ORPHANED_MEMBERSHIP_CLEANUP",
      targetUserEmail: userEmail,
      result: failed > 0 ? "FAILED" : "SUCCESS",
      notes: `Removed ${removed} orphaned membership(s); ${failed} failed.`
    });

    revalidatePath("/users");
    revalidatePath("/access-viewer");
    revalidatePath("/google-access-monitor");

    return {
      ok: failed === 0,
      message:
        failed === 0
          ? `Removed ${removed} orphaned membership(s) for ${userEmail}.`
          : `Removed ${removed} orphaned membership(s), but ${failed} failed. Check Audit Pulse or Reports for details.`,
      removed,
      failed
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Cleanup failed unexpectedly.",
      removed: 0,
      failed: 0
    };
  }
}
