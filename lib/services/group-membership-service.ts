import { prisma } from "@/lib/db/prisma";
import { getDirectoryProvider } from "@/lib/google/provider-factory";
import type { DirectoryProvider } from "@/lib/google/types";
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
    private auditLog = new AuditLogService()
  ) {}

  async addUserToGroup(input: MembershipChangeInput) {
    const userId = await this.resolveUserId(input.userEmail);
    const groupMappingId = await this.resolveGroupMappingId(input);

    await this.directory.addGroupMember(input.groupEmail, input.userEmail);

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

    return this.upsertAppRoleMembership(userId, groupMappingId);
  }

  async removeUserFromGroup(input: MembershipChangeInput) {
    const groupMappingId = await this.resolveGroupMappingId(input);

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
        groupMappingId,
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
    const accessRoleMappingId = await this.resolveAccessRoleMappingId(input);

    await this.directory.addGroupMember(input.groupEmail, input.userEmail);

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

    return this.upsertAccessRoleMembership(userId, accessRoleMappingId);
  }

  async removeUserFromAccessRoleGroup(input: MembershipChangeInput) {
    const accessRoleMappingId = await this.resolveAccessRoleMappingId(input);

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
        accessRoleMappingId,
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

  private async resolveGroupMappingId(input: Pick<
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

    return mapping.id;
  }

  private async resolveAccessRoleMappingId(input: Pick<
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

    return mapping.id;
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
