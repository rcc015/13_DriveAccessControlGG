import { prisma } from "@/lib/db/prisma";
import type { EffectiveAccessSummary } from "@/types/domain";

export class AccessViewerService {
  async getUserAccess(email: string): Promise<{
    appRoles: string[];
    accessRoles: string[];
    groups: string[];
    inheritedSharedDrives: EffectiveAccessSummary[];
    restrictedFolderExceptions: string[];
  }> {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        roleAssignments: {
          include: {
            role: true
          }
        },
        accessRoleAssignments: {
          include: {
            accessRole: true
          }
        },
        memberships: {
          where: { revokedAt: null },
          include: {
            groupMapping: {
              include: {
                sharedDrive: true
              }
            },
            accessRoleMapping: {
              include: {
                sharedDrive: true
              }
            }
          }
        },
        accessRequests: {
          where: {
            status: "APPROVED",
            restrictedFolderId: { not: null }
          },
          include: {
            restrictedFolder: true
          }
        }
      }
    });

    if (!user) {
      return {
        appRoles: [],
        accessRoles: [],
        groups: [],
        inheritedSharedDrives: [],
        restrictedFolderExceptions: []
      };
    }

    const driveMap = new Map<string, EffectiveAccessSummary>();

    for (const membership of user.memberships) {
      const driveName =
        membership.groupMapping?.sharedDrive.name ?? membership.accessRoleMapping?.sharedDrive.name;

      if (!driveName) {
        continue;
      }

      const summary = driveMap.get(driveName) ?? {
        sharedDriveName: driveName,
        viaGroups: [],
        restrictedFolders: []
      };

      const groupEmail = membership.groupMapping?.groupEmail ?? membership.accessRoleMapping?.groupEmail;

      if (groupEmail) {
        summary.viaGroups.push(groupEmail);
      }
      driveMap.set(driveName, summary);
    }

    const exceptions = user.accessRequests
      .map((request) => request.restrictedFolder?.path)
      .filter((value): value is string => Boolean(value));

    return {
      appRoles: Array.from(new Set(user.roleAssignments.map((assignment) => assignment.role.name))),
      accessRoles: Array.from(new Set(user.accessRoleAssignments.map((assignment) => assignment.accessRole.displayName))),
      groups: Array.from(
        new Set(
          user.memberships
            .map((membership) => membership.groupMapping?.groupEmail ?? membership.accessRoleMapping?.groupEmail)
            .filter((value): value is string => Boolean(value))
        )
      ),
      inheritedSharedDrives: Array.from(driveMap.values()),
      restrictedFolderExceptions: Array.from(new Set(exceptions))
    };
  }
}
