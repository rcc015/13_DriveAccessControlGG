import { prisma } from "@/lib/db/prisma";
import { getDriveProvider } from "@/lib/google/provider-factory";
import type { DrivePrincipalRef, DriveProvider } from "@/lib/google/types";

type MonitorStatus = "ALIGNED" | "MISSING" | "UNEXPECTED" | "ROLE_MISMATCH" | "LIMITED_ACCESS_DISABLED";
const ALLOWED_DIRECT_USER_EXCEPTIONS = new Set(["rbac@conceivable.life"]);

interface ExpectedAccessEntry {
  email: string;
  role: string;
}

interface AccessComparisonRow {
  resourceName: string;
  expectedGroups: ExpectedAccessEntry[];
  actualGroups: ExpectedAccessEntry[];
  directUsers: string[];
  missingGroups: string[];
  unexpectedGroups: string[];
  roleMismatches: string[];
  status: MonitorStatus;
  errorMessage?: string;
}

interface RestrictedFolderComparisonRow extends AccessComparisonRow {
  limitedAccess: boolean;
}

export class GoogleAccessMonitorService {
  constructor(private drive: DriveProvider = getDriveProvider()) {}

  async getMonitorSnapshot() {
    const [sharedDrives, restrictedFolders, groupMappings, accessRoleMappings] = await Promise.all([
      prisma.sharedDrive.findMany({
        orderBy: { name: "asc" }
      }),
      prisma.restrictedFolder.findMany({
        where: { isRestricted: true },
        orderBy: [{ sharedDrive: { name: "asc" } }, { path: "asc" }],
        include: { sharedDrive: true }
      }),
      prisma.groupMapping.findMany({
        include: { sharedDrive: true, restrictedFolder: true }
      }),
      prisma.accessRoleMapping.findMany({
        include: { sharedDrive: true, restrictedFolder: true }
      })
    ]);

    const sharedDriveRows = await Promise.all(
      sharedDrives.map(async (drive) => {
        const expectedGroups = collectExpectedGroups(
          [
            ...groupMappings.filter((mapping) => mapping.sharedDriveId === drive.id && mapping.restrictedFolderId === null),
            ...accessRoleMappings.filter((mapping) => mapping.sharedDriveId === drive.id && mapping.restrictedFolderId === null)
          ].map((mapping) => ({
            email: mapping.groupEmail,
            role: mapAccessLevelToDriveRole(mapping.accessLevel)
          }))
        );

        try {
          const actualPrincipals = await this.drive.listSharedDrivePrincipals(drive.name);
          return compareAccessState({
            resourceName: drive.name,
            expectedGroups,
            actualPrincipals,
            limitedAccess: true,
            includeInheritedGroups: true
          });
        } catch (error) {
          return failedAccessState(drive.name, expectedGroups, error);
        }
      })
    );

    const restrictedFolderRows = await Promise.all(
      restrictedFolders.map(async (folder) => {
        const expectedGroups = collectExpectedGroups(
          [
            ...groupMappings.filter((mapping) => mapping.restrictedFolderId === folder.id),
            ...accessRoleMappings.filter((mapping) => mapping.restrictedFolderId === folder.id)
          ].map((mapping) => ({
            email: mapping.groupEmail,
            role: mapAccessLevelToDriveRole(mapping.accessLevel)
          }))
        );

        try {
          const actual = await this.drive.getRestrictedFolderAccess(folder.path);
          return compareAccessState({
            resourceName: folder.path,
            expectedGroups,
            actualPrincipals: actual.principals,
            limitedAccess: actual.limitedAccess,
            includeInheritedGroups: false
          });
        } catch (error) {
          return {
            ...failedAccessState(folder.path, expectedGroups, error),
            limitedAccess: false
          };
        }
      })
    );

    const sharedDriveAlignedCount = sharedDriveRows.filter((row) => row.status === "ALIGNED").length;
    const restrictedFolderAlignedCount = restrictedFolderRows.filter((row) => row.status === "ALIGNED").length;
    const missingCount = [...sharedDriveRows, ...restrictedFolderRows].reduce(
      (sum, row) => sum + row.missingGroups.length,
      0
    );
    const unexpectedCount = [...sharedDriveRows, ...restrictedFolderRows].reduce(
      (sum, row) => sum + row.unexpectedGroups.length + row.directUsers.length,
      0
    );

    return {
      sharedDriveRows,
      restrictedFolderRows,
      summary: {
        sharedDriveAlignedCount,
        sharedDriveCount: sharedDriveRows.length,
        restrictedFolderAlignedCount,
        restrictedFolderCount: restrictedFolderRows.length,
        missingCount,
        unexpectedCount
      }
    };
  }
}

function compareAccessState(input: {
  resourceName: string;
  expectedGroups: ExpectedAccessEntry[];
  actualPrincipals: DrivePrincipalRef[];
  limitedAccess: boolean;
  includeInheritedGroups?: boolean;
}): RestrictedFolderComparisonRow {
  const includeInheritedGroups = input.includeInheritedGroups ?? true;
  const actualGroups = collectExpectedGroups(
    input.actualPrincipals
      .filter(
        (principal) =>
          principal.type === "group" &&
          principal.emailAddress &&
          (includeInheritedGroups || !principal.inherited)
      )
      .map((principal) => ({
        email: principal.emailAddress ?? "",
        role: principal.role
      }))
  );

  const directUsers = input.actualPrincipals
    .filter((principal) => principal.type === "user" && principal.emailAddress && !principal.inherited)
    .map((principal) => principal.emailAddress ?? "")
    .filter((email) => !ALLOWED_DIRECT_USER_EXCEPTIONS.has(email))
    .sort();

  const actualGroupMap = new Map(actualGroups.map((group) => [group.email, group.role]));
  const expectedGroupMap = new Map(input.expectedGroups.map((group) => [group.email, group.role]));

  const missingGroups = input.expectedGroups
    .filter((group) => !actualGroupMap.has(group.email))
    .map((group) => formatGroupRole(group.email, group.role));

  const unexpectedGroups = actualGroups
    .filter((group) => !expectedGroupMap.has(group.email))
    .map((group) => formatGroupRole(group.email, group.role));

  const roleMismatches = input.expectedGroups
    .filter((group) => {
      const actualRole = actualGroupMap.get(group.email);
      return actualRole && actualRole !== group.role;
    })
    .map((group) => `${group.email}: expected ${group.role}, actual ${actualGroupMap.get(group.email)}`);

  const status = !input.limitedAccess
    ? "LIMITED_ACCESS_DISABLED"
    : missingGroups.length > 0
      ? "MISSING"
      : unexpectedGroups.length > 0
        ? "UNEXPECTED"
        : roleMismatches.length > 0
          ? "ROLE_MISMATCH"
          : "ALIGNED";

  return {
    resourceName: input.resourceName,
    expectedGroups: input.expectedGroups,
    actualGroups,
    directUsers,
    missingGroups,
    unexpectedGroups,
    roleMismatches,
    status,
    limitedAccess: input.limitedAccess
  };
}

function failedAccessState(resourceName: string, expectedGroups: ExpectedAccessEntry[], error: unknown): AccessComparisonRow {
  return {
    resourceName,
    expectedGroups,
    actualGroups: [],
    directUsers: [],
    missingGroups: [],
    unexpectedGroups: [],
    roleMismatches: [],
    status: "UNEXPECTED",
    errorMessage: error instanceof Error ? error.message : "Unknown Google Drive lookup error."
  };
}

function collectExpectedGroups(entries: ExpectedAccessEntry[]) {
  const strongestByEmail = new Map<string, ExpectedAccessEntry>();

  for (const entry of entries) {
    const existing = strongestByEmail.get(entry.email);
    if (!existing || compareDriveRoles(entry.role, existing.role) > 0) {
      strongestByEmail.set(entry.email, entry);
    }
  }

  return Array.from(strongestByEmail.values()).sort((left, right) => left.email.localeCompare(right.email));
}

function compareDriveRoles(left: string, right: string) {
  const order = ["reader", "writer", "fileOrganizer", "organizer"];
  return order.indexOf(left) - order.indexOf(right);
}

function mapAccessLevelToDriveRole(accessLevel: string) {
  switch (accessLevel) {
    case "MANAGER":
      return "organizer";
    case "CONTENT_MANAGER":
    case "RESTRICTED":
      return "fileOrganizer";
    case "VIEWER":
      return "reader";
    case "CONTRIBUTOR":
    default:
      return "writer";
  }
}

function formatGroupRole(email: string, role: string) {
  return `${email} (${role})`;
}
