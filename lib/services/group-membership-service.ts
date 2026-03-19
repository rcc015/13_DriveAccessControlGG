import { prisma } from "@/lib/db/prisma";
import { getDirectoryProvider } from "@/lib/google/provider-factory";
import { getDriveProvider } from "@/lib/google/provider-factory";
import type { DirectoryProvider, DriveProvider } from "@/lib/google/types";
import { AuditLogService } from "@/lib/services/audit-log-service";

interface MembershipChangeInput {
  actorEmail: string;
  userEmail: string;
  groupEmail: string;
  sharedDriveName: string;
  restrictedFolderPath?: string;
  reason: string;
}

export class GroupMembershipService {
  constructor(
    private directory: DirectoryProvider = getDirectoryProvider(),
    private drive: DriveProvider = getDriveProvider(),
    private auditLog = new AuditLogService()
  ) {}

  async addUserToGroup(input: MembershipChangeInput) {
    const userId = await this.resolveUserId(input.userEmail);
    const mapping = await this.resolveGroupMapping(input);

    await this.directory.addGroupMember(input.groupEmail, input.userEmail);
    await this.ensureRestrictedFolderGroupAccess(input.restrictedFolderPath, input.groupEmail, mapping.accessLevel);

    await this.auditLog.record({
      actorEmail: input.actorEmail,
      actionType: "GROUP_MEMBERSHIP_ADD",
      targetUserEmail: input.userEmail,
      targetGroupEmail: input.groupEmail,
      targetDriveName: input.sharedDriveName,
      targetFolderPath: input.restrictedFolderPath,
      result: "SUCCESS",
      notes: input.reason
    });

    return this.upsertAppRoleMembership(userId, mapping.id);
  }

  async removeUserFromGroup(input: MembershipChangeInput) {
    const mapping = await this.resolveGroupMapping(input);

    await this.directory.removeGroupMember(input.groupEmail, input.userEmail);

    await this.auditLog.record({
      actorEmail: input.actorEmail,
      actionType: "GROUP_MEMBERSHIP_REMOVE",
      targetUserEmail: input.userEmail,
      targetGroupEmail: input.groupEmail,
      targetDriveName: input.sharedDriveName,
      targetFolderPath: input.restrictedFolderPath,
      result: "SUCCESS",
      notes: input.reason
    });

    return prisma.groupMembership.updateMany({
      where: {
        user: { email: input.userEmail },
        groupMappingId: mapping.id,
        revokedAt: null
      },
      data: {
        revokedAt: new Date(),
        revokedReason: input.reason
      }
    });
  }

  async addUserToAccessRoleGroup(input: MembershipChangeInput) {
    const userId = await this.resolveUserId(input.userEmail);
    const mapping = await this.resolveAccessRoleMapping(input);

    await this.directory.addGroupMember(input.groupEmail, input.userEmail);
    await this.ensureRestrictedFolderGroupAccess(input.restrictedFolderPath, input.groupEmail, mapping.accessLevel);

    await this.auditLog.record({
      actorEmail: input.actorEmail,
      actionType: "ACCESS_ROLE_MEMBERSHIP_ADD",
      targetUserEmail: input.userEmail,
      targetGroupEmail: input.groupEmail,
      targetDriveName: input.sharedDriveName,
      targetFolderPath: input.restrictedFolderPath,
      result: "SUCCESS",
      notes: input.reason
    });

    return this.upsertAccessRoleMembership(userId, mapping.id);
  }

  async removeUserFromAccessRoleGroup(input: MembershipChangeInput) {
    const mapping = await this.resolveAccessRoleMapping(input);

    await this.directory.removeGroupMember(input.groupEmail, input.userEmail);

    await this.auditLog.record({
      actorEmail: input.actorEmail,
      actionType: "ACCESS_ROLE_MEMBERSHIP_REMOVE",
      targetUserEmail: input.userEmail,
      targetGroupEmail: input.groupEmail,
      targetDriveName: input.sharedDriveName,
      targetFolderPath: input.restrictedFolderPath,
      result: "SUCCESS",
      notes: input.reason
    });

    return prisma.groupMembership.updateMany({
      where: {
        user: { email: input.userEmail },
        accessRoleMappingId: mapping.id,
        revokedAt: null
      },
      data: {
        revokedAt: new Date(),
        revokedReason: input.reason
      }
    });
  }

  private async resolveUserId(email: string) {
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        displayName: email.split("@")[0]
      }
    });

    return user.id;
  }

  private async resolveGroupMapping(input: Pick<
    MembershipChangeInput,
    "groupEmail" | "sharedDriveName" | "restrictedFolderPath"
  >) {
    const mapping = await prisma.groupMapping.findFirst({
      where: {
        groupEmail: input.groupEmail,
        sharedDrive: { name: input.sharedDriveName },
        restrictedFolder: input.restrictedFolderPath
          ? { path: input.restrictedFolderPath }
          : null
      }
    });

    if (!mapping) {
      throw new Error(
        `Group mapping not found for ${input.groupEmail} on ${input.sharedDriveName}${
          input.restrictedFolderPath ? ` / ${input.restrictedFolderPath}` : ""
        }`
      );
    }

    return mapping;
  }

  private async resolveAccessRoleMapping(input: Pick<
    MembershipChangeInput,
    "groupEmail" | "sharedDriveName" | "restrictedFolderPath"
  >) {
    const mapping = await prisma.accessRoleMapping.findFirst({
      where: {
        groupEmail: input.groupEmail,
        sharedDrive: { name: input.sharedDriveName },
        restrictedFolder: input.restrictedFolderPath
          ? { path: input.restrictedFolderPath }
          : null
      }
    });

    if (!mapping) {
      throw new Error(
        `Access role mapping not found for ${input.groupEmail} on ${input.sharedDriveName}${
          input.restrictedFolderPath ? ` / ${input.restrictedFolderPath}` : ""
        }`
      );
    }

    return mapping;
  }

  private async ensureRestrictedFolderGroupAccess(restrictedFolderPath: string | undefined, groupEmail: string, accessLevel: string) {
    if (!restrictedFolderPath) {
      return;
    }

    await this.drive.ensureFolderGroupAccess(
      restrictedFolderPath,
      groupEmail,
      mapAccessLevelToDriveRole(accessLevel)
    );
  }

  private async upsertAppRoleMembership(userId: string, groupMappingId: string) {
    const existing = await prisma.groupMembership.findFirst({
      where: {
        userId,
        groupMappingId
      }
    });

    if (existing) {
      return prisma.groupMembership.update({
        where: { id: existing.id },
        data: {
          revokedAt: null,
          revokedReason: null,
          source: "APP_MANAGED"
        }
      });
    }

    return prisma.groupMembership.create({
      data: {
        userId,
        groupMappingId,
        source: "APP_MANAGED"
      }
    });
  }

  private async upsertAccessRoleMembership(userId: string, accessRoleMappingId: string) {
    const existing = await prisma.groupMembership.findFirst({
      where: {
        userId,
        accessRoleMappingId
      }
    });

    if (existing) {
      return prisma.groupMembership.update({
        where: { id: existing.id },
        data: {
          revokedAt: null,
          revokedReason: null,
          source: "APP_MANAGED"
        }
      });
    }

    return prisma.groupMembership.create({
      data: {
        userId,
        accessRoleMappingId,
        source: "APP_MANAGED"
      }
    });
  }
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
