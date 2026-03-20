import { prisma } from "@/lib/db/prisma";
import { getDirectoryProvider, getDriveProvider } from "@/lib/google/provider-factory";
import type { DirectoryProvider, DriveProvider } from "@/lib/google/types";
import { AuditLogService } from "@/lib/services/audit-log-service";
import { GroupMembershipService } from "@/lib/services/group-membership-service";

const MANAGED_DOMAIN = "@conceivable.life";

export interface OffboardingUserPreview {
  userEmail: string;
  displayName: string;
  appRoleCount: number;
  accessRoleCount: number;
  membershipCount: number;
  exceptionCount: number;
  directFolderRemovalCount: number;
}

export interface OffboardingPreview {
  inactiveUserCount: number;
  appRoleAssignmentCount: number;
  accessRoleAssignmentCount: number;
  membershipRemovalCount: number;
  exceptionRevokeCount: number;
  directFolderRemovalCount: number;
  users: OffboardingUserPreview[];
}

export interface OffboardingApplyResult extends OffboardingPreview {
  processedUsers: string[];
}

type CandidateUser = Awaited<ReturnType<OffboardingHygieneService["loadInactiveCandidates"]>>[number];

export class OffboardingHygieneService {
  constructor(
    private directory: DirectoryProvider = getDirectoryProvider(),
    private drive: DriveProvider = getDriveProvider(),
    private memberships = new GroupMembershipService(),
    private auditLog = new AuditLogService()
  ) {}

  async previewOffboarding(): Promise<OffboardingPreview> {
    const candidates = await this.loadInactiveCandidates();

    const users = candidates.map((user) => {
      const activeMemberships = user.memberships.filter((membership) => membership.revokedAt === null);
      const activeRequests = user.accessRequests.filter((request) =>
        request.status === "REQUESTED" || request.status === "APPROVED"
      );
      const directFolderRemovalCount = new Set(
        activeRequests
          .filter((request) => request.status === "APPROVED" && request.restrictedFolder?.path)
          .map((request) => request.restrictedFolder!.path)
      ).size;

      return {
        userEmail: user.email,
        displayName: user.displayName,
        appRoleCount: user.roleAssignments.length,
        accessRoleCount: user.accessRoleAssignments.length,
        membershipCount: activeMemberships.length,
        exceptionCount: activeRequests.length,
        directFolderRemovalCount
      };
    });

    return {
      inactiveUserCount: users.length,
      appRoleAssignmentCount: users.reduce((sum, user) => sum + user.appRoleCount, 0),
      accessRoleAssignmentCount: users.reduce((sum, user) => sum + user.accessRoleCount, 0),
      membershipRemovalCount: users.reduce((sum, user) => sum + user.membershipCount, 0),
      exceptionRevokeCount: users.reduce((sum, user) => sum + user.exceptionCount, 0),
      directFolderRemovalCount: users.reduce((sum, user) => sum + user.directFolderRemovalCount, 0),
      users
    };
  }

  async applyOffboarding(actorEmail: string): Promise<OffboardingApplyResult> {
    const candidates = await this.loadInactiveCandidates();
    const preview = await this.previewOffboarding();
    const processedUsers: string[] = [];

    for (const user of candidates) {
      await this.auditLog.record({
        actorEmail,
        actionType: "OFFBOARD_DETECTED",
        targetUserEmail: user.email,
        result: "SUCCESS",
        notes: "Inactive user detected in Directory-backed offboarding hygiene.",
        metadata: {
          appRoleCount: user.roleAssignments.length,
          accessRoleCount: user.accessRoleAssignments.length,
          membershipCount: user.memberships.filter((membership) => membership.revokedAt === null).length,
          exceptionCount: user.accessRequests.filter(
            (request) => request.status === "REQUESTED" || request.status === "APPROVED"
          ).length
        }
      });

      try {
        await this.removeManagedMemberships(actorEmail, user);
        await this.revokeActiveExceptions(actorEmail, user);

        const appRoleCount = await prisma.userRole.count({ where: { userId: user.id } });
        const accessRoleCount = await prisma.userAccessRole.count({ where: { userId: user.id } });

        await prisma.userRole.deleteMany({ where: { userId: user.id } });
        await prisma.userAccessRole.deleteMany({ where: { userId: user.id } });
        await prisma.user.update({
          where: { id: user.id },
          data: { isActive: false }
        });

        await this.auditLog.record({
          actorEmail,
          actionType: "OFFBOARD_ASSIGNMENT_CLEARED",
          targetUserEmail: user.email,
          result: "SUCCESS",
          notes: "Cleared RBAC-managed assignments and marked local user inactive.",
          metadata: {
            appRoleAssignmentsRemoved: appRoleCount,
            accessRoleAssignmentsRemoved: accessRoleCount
          }
        });

        await this.auditLog.record({
          actorEmail,
          actionType: "OFFBOARD_COMPLETED",
          targetUserEmail: user.email,
          result: "SUCCESS",
          notes: "Completed offboarding hygiene cleanup."
        });

        processedUsers.push(user.email);
      } catch (error) {
        await this.auditLog.record({
          actorEmail,
          actionType: "OFFBOARD_FAILED",
          targetUserEmail: user.email,
          result: "FAILED",
          notes: error instanceof Error ? error.message : "Unknown offboarding hygiene error."
        });
        throw error;
      }
    }

    return {
      ...preview,
      processedUsers
    };
  }

  private async loadInactiveCandidates() {
    const activeUsers = await this.directory.listActiveUsers();
    const activeEmails = new Set(activeUsers.map((user) => user.primaryEmail.toLowerCase()));

    const candidates = await prisma.user.findMany({
      where: {
        isActive: true,
        OR: [
          { roleAssignments: { some: {} } },
          { accessRoleAssignments: { some: {} } },
          { memberships: { some: { revokedAt: null, source: "APP_MANAGED" } } },
          {
            accessRequests: {
              some: {
                status: { in: ["REQUESTED", "APPROVED"] }
              }
            }
          }
        ]
      },
      include: {
        roleAssignments: true,
        accessRoleAssignments: true,
        memberships: {
          where: {
            revokedAt: null,
            source: "APP_MANAGED"
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
                sharedDrive: true,
                restrictedFolder: true
              }
            }
          }
        },
        accessRequests: {
          where: {
            status: {
              in: ["REQUESTED", "APPROVED"]
            }
          },
          include: {
            restrictedFolder: true
          }
        }
      },
      orderBy: {
        email: "asc"
      }
    });

    return candidates.filter(
      (user) =>
        user.email.toLowerCase().endsWith(MANAGED_DOMAIN) && !activeEmails.has(user.email.toLowerCase())
    );
  }

  private async removeManagedMemberships(actorEmail: string, user: CandidateUser) {
    for (const membership of user.memberships) {
      if (membership.groupMapping) {
        await this.memberships.removeUserFromGroup({
          actorEmail,
          userEmail: user.email,
          groupEmail: membership.groupMapping.groupEmail,
          sharedDriveName: membership.groupMapping.sharedDrive.name,
          restrictedFolderPath: membership.groupMapping.restrictedFolder?.path,
          reason: "Removed during Directory offboarding hygiene."
        });

        await this.auditLog.record({
          actorEmail,
          actionType: "OFFBOARD_GROUP_REMOVAL",
          targetUserEmail: user.email,
          targetGroupEmail: membership.groupMapping.groupEmail,
          targetDriveName: membership.groupMapping.sharedDrive.name,
          targetFolderPath: membership.groupMapping.restrictedFolder?.path,
          result: "SUCCESS",
          notes: "Removed app-role managed group membership during offboarding hygiene."
        });
        continue;
      }

      if (membership.accessRoleMapping) {
        await this.memberships.removeUserFromAccessRoleGroup({
          actorEmail,
          userEmail: user.email,
          groupEmail: membership.accessRoleMapping.groupEmail,
          sharedDriveName: membership.accessRoleMapping.sharedDrive.name,
          restrictedFolderPath: membership.accessRoleMapping.restrictedFolder?.path,
          reason: "Removed during Directory offboarding hygiene."
        });

        await this.auditLog.record({
          actorEmail,
          actionType: "OFFBOARD_GROUP_REMOVAL",
          targetUserEmail: user.email,
          targetGroupEmail: membership.accessRoleMapping.groupEmail,
          targetDriveName: membership.accessRoleMapping.sharedDrive.name,
          targetFolderPath: membership.accessRoleMapping.restrictedFolder?.path,
          result: "SUCCESS",
          notes: "Removed business-role managed group membership during offboarding hygiene."
        });
      }
    }
  }

  private async revokeActiveExceptions(actorEmail: string, user: CandidateUser) {
    for (const request of user.accessRequests) {
      if (request.status === "APPROVED" && request.restrictedFolder?.path) {
        await this.drive.removeFolderPrincipal(request.restrictedFolder.path, user.email);

        await this.auditLog.record({
          actorEmail,
          actionType: "OFFBOARD_DIRECT_ACCESS_REMOVED",
          targetUserEmail: user.email,
          targetFolderPath: request.restrictedFolder.path,
          result: "SUCCESS",
          notes: "Removed direct restricted-folder access during offboarding hygiene."
        });
      }

      await prisma.accessRequest.update({
        where: { id: request.id },
        data: {
          status: "REVOKED",
          approverEmail: actorEmail,
          decidedAt: new Date()
        }
      });

      await this.auditLog.record({
        actorEmail,
        actionType: "OFFBOARD_EXCEPTION_REVOKED",
        targetUserEmail: user.email,
        targetFolderPath: request.restrictedFolder?.path,
        result: "SUCCESS",
        notes: "Revoked active restricted-folder exception during offboarding hygiene.",
        metadata: {
          requestId: request.id,
          previousStatus: request.status
        }
      });
    }
  }
}
