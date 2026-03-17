import { prisma } from "@/lib/db/prisma";
import type { EffectiveAccessSummary } from "@/types/domain";

export class AccessViewerService {
  async getUserAccess(email: string): Promise<{
    groups: string[];
    inheritedSharedDrives: EffectiveAccessSummary[];
    restrictedFolderExceptions: string[];
  }> {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          where: { revokedAt: null },
          include: {
            groupMapping: {
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
        groups: [],
        inheritedSharedDrives: [],
        restrictedFolderExceptions: []
      };
    }

    const driveMap = new Map<string, EffectiveAccessSummary>();

    for (const membership of user.memberships) {
      const driveName = membership.groupMapping.sharedDrive.name;
      const summary = driveMap.get(driveName) ?? {
        sharedDriveName: driveName,
        viaGroups: [],
        restrictedFolders: []
      };

      summary.viaGroups.push(membership.groupMapping.groupEmail);
      driveMap.set(driveName, summary);
    }

    const exceptions = user.accessRequests
      .map((request) => request.restrictedFolder?.path)
      .filter((value): value is string => Boolean(value));

    return {
      groups: Array.from(new Set(user.memberships.map((membership) => membership.groupMapping.groupEmail))),
      inheritedSharedDrives: Array.from(driveMap.values()),
      restrictedFolderExceptions: Array.from(new Set(exceptions))
    };
  }
}
