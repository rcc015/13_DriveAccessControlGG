import { prisma } from "@/lib/db/prisma";

export async function getRequestAccessCatalog() {
  const [accessRoles, restrictedFolders, roleMappedDrives, accessRoleMappedDrives] = await Promise.all([
    prisma.accessRole.findMany({
      orderBy: [{ displayName: "asc" }],
      select: {
        id: true,
        code: true,
        displayName: true,
        description: true
      }
    }),
    prisma.restrictedFolder.findMany({
      where: { isRestricted: true },
      orderBy: [{ path: "asc" }],
      select: {
        id: true,
        path: true
      }
    }),
    prisma.groupMapping.findMany({
      where: { restrictedFolderId: null },
      distinct: ["sharedDriveId"],
      select: {
        sharedDrive: {
          select: {
            id: true,
            name: true
          }
        }
      }
    }),
    prisma.accessRoleMapping.findMany({
      where: { restrictedFolderId: null },
      distinct: ["sharedDriveId"],
      select: {
        sharedDrive: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })
  ]);

  const driveById = new Map<string, { id: string; name: string }>();

  for (const mapping of [...roleMappedDrives, ...accessRoleMappedDrives]) {
    driveById.set(mapping.sharedDrive.id, mapping.sharedDrive);
  }

  return {
    accessRoles,
    restrictedFolders,
    sharedDrives: Array.from(driveById.values()).sort((left, right) => left.name.localeCompare(right.name))
  };
}
