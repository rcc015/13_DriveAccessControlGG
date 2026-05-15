import type { DirectoryUserSourceType, DirectoryUserStatus, Prisma } from "@prisma/client";
import { env } from "@/lib/config/env";
import { prisma } from "@/lib/db/prisma";
import { AuditLogService } from "@/lib/services/audit-log-service";
import { getDirectoryProvider } from "@/lib/google/provider-factory";
import type { DirectoryProvider, DirectoryUser } from "@/lib/google/types";
import {
  getConfiguredDirectorySource,
  sanitizeDirectorySyncError,
  upsertDirectorySyncState
} from "@/lib/users/directory-sync";

export interface ActiveEmployeeSyncPreview {
  activeCount: number;
  currentMemberCount: number;
  addEmails: string[];
  removeEmails: string[];
  sourceType: "google_group" | "google_directory" | "local_manual";
  sourceName: string | null;
}

export interface ActiveEmployeeSyncApplyResult extends ActiveEmployeeSyncPreview {
  fetchedUsers: number;
  createdUsers: number;
  updatedUsers: number;
  markedInactiveUsers: number;
  markedSuspendedUsers: number;
  skippedUsers: number;
}

interface SyncCandidate {
  email: string;
  googleUserId: string | null;
  displayName: string;
  givenName: string | null;
  familyName: string | null;
  orgUnitPath: string | null;
  department: string | null;
  title: string | null;
  aliases: string[];
  status: DirectoryUserStatus;
  source: DirectoryUserSourceType;
}

export class ActiveEmployeeSyncService {
  constructor(
    private directory: DirectoryProvider = getDirectoryProvider(),
    private auditLog = new AuditLogService()
  ) {}

  async previewSync(): Promise<ActiveEmployeeSyncPreview> {
    const source = getConfiguredDirectorySource();
    const sourceUsers = await this.fetchSourceUsers();
    const sourceEmails = new Set(sourceUsers.map((user) => user.email));
    const currentUsers = await prisma.user.findMany({
      where: {
        directorySource: {
          in: ["GOOGLE_GROUP", "GOOGLE_DIRECTORY"]
        },
        directoryStatus: "ACTIVE"
      },
      select: {
        email: true
      }
    });
    const currentEmails = new Set(currentUsers.map((user) => user.email.toLowerCase()));

    return {
      activeCount: sourceUsers.length,
      currentMemberCount: currentEmails.size,
      addEmails: sourceUsers
        .map((user) => user.email)
        .filter((email) => !currentEmails.has(email))
        .sort(),
      removeEmails: Array.from(currentEmails)
        .filter((email) => !sourceEmails.has(email))
        .sort(),
      sourceType: source.sourceType.toLowerCase() as ActiveEmployeeSyncPreview["sourceType"],
      sourceName: source.sourceName
    };
  }

  async applySync(actorEmail: string): Promise<ActiveEmployeeSyncApplyResult> {
    const source = getConfiguredDirectorySource();
    const attemptedAt = new Date();

    await upsertDirectorySyncState({
      sourceType: source.sourceType,
      sourceName: source.sourceName,
      lastAttemptedSyncAt: attemptedAt,
      lastSyncStatus: "FAILED",
      lastSyncError: null
    });

    try {
      const sourceUsers = await this.fetchSourceUsers();
      const preview = await this.buildPreviewFromSourceUsers(sourceUsers, source);
      const trackedUsers = await prisma.user.findMany({
        where: {
          directorySource: {
            in: ["GOOGLE_GROUP", "GOOGLE_DIRECTORY"]
          }
        },
        select: {
          id: true,
          email: true
        }
      });
      const trackedByEmail = new Map(trackedUsers.map((user) => [user.email.toLowerCase(), user]));

      let createdUsers = 0;
      let updatedUsers = 0;
      let markedInactiveUsers = 0;
      let markedSuspendedUsers = 0;

      await this.auditLog.record({
        actorEmail,
        actionType: "ACTIVE_EMPLOYEE_SYNC_STARTED",
        result: "SUCCESS",
        targetGroupEmail: source.sourceName ?? undefined,
        notes: "Started managed directory sync.",
        metadata: {
          sourceType: source.sourceType,
          sourceName: source.sourceName
        }
      });

      for (const user of sourceUsers) {
        const existing = trackedByEmail.get(user.email);
        const updatePayload = mapSyncCandidateToUserUpdate(user, attemptedAt);
        const createPayload = mapSyncCandidateToUserCreate(user, attemptedAt);

        if (existing) {
          await prisma.user.update({
            where: { id: existing.id },
            data: updatePayload
          });
          updatedUsers += 1;
          continue;
        }

        await prisma.user.upsert({
          where: { email: user.email },
          update: updatePayload,
          create: createPayload
        });

        createdUsers += 1;
      }

      const sourceEmails = new Set(sourceUsers.map((user) => user.email));

      for (const trackedUser of trackedUsers) {
        if (sourceEmails.has(trackedUser.email.toLowerCase())) {
          continue;
        }

        const lookup = await this.directory.getUserByEmail(trackedUser.email);
        const directoryStatus: DirectoryUserStatus = lookup?.suspended ? "SUSPENDED" : "INACTIVE";

        await prisma.user.update({
          where: { id: trackedUser.id },
          data: {
            isActive: false,
            directoryStatus,
            lastSyncedAt: attemptedAt
          }
        });

        if (directoryStatus === "SUSPENDED") {
          markedSuspendedUsers += 1;
        } else {
          markedInactiveUsers += 1;
        }
      }

      await upsertDirectorySyncState({
        sourceType: source.sourceType,
        sourceName: source.sourceName,
        lastAttemptedSyncAt: attemptedAt,
        lastSuccessfulSyncAt: attemptedAt,
        lastSyncStatus: "SUCCESS",
        lastSyncError: null,
        lastFetchedCount: sourceUsers.length,
        lastCreatedCount: createdUsers,
        lastUpdatedCount: updatedUsers,
        lastMarkedInactiveCount: markedInactiveUsers,
        lastMarkedSuspendedCount: markedSuspendedUsers,
        lastSkippedCount: 0
      });

      await this.auditLog.record({
        actorEmail,
        actionType: "ACTIVE_EMPLOYEE_SYNC_COMPLETED",
        result: "SUCCESS",
        targetGroupEmail: source.sourceName ?? undefined,
        notes: "Completed managed directory sync.",
        metadata: {
          sourceType: source.sourceType,
          sourceName: source.sourceName,
          fetchedUsers: sourceUsers.length,
          createdUsers,
          updatedUsers,
          markedInactiveUsers,
          markedSuspendedUsers
        }
      });

      return {
        ...preview,
        fetchedUsers: sourceUsers.length,
        createdUsers,
        updatedUsers,
        markedInactiveUsers,
        markedSuspendedUsers,
        skippedUsers: 0
      };
    } catch (error) {
      const sanitizedError = sanitizeDirectorySyncError(error);

      await upsertDirectorySyncState({
        sourceType: source.sourceType,
        sourceName: source.sourceName,
        lastAttemptedSyncAt: attemptedAt,
        lastSyncStatus: "FAILED",
        lastSyncError: sanitizedError
      });

      await this.auditLog.record({
        actorEmail,
        actionType: "ACTIVE_EMPLOYEE_SYNC_FAILED",
        result: "FAILED",
        targetGroupEmail: source.sourceName ?? undefined,
        notes: sanitizedError,
        metadata: {
          sourceType: source.sourceType,
          sourceName: source.sourceName
        }
      });

      throw error;
    }
  }

  private async buildPreviewFromSourceUsers(
    sourceUsers: SyncCandidate[],
    source = getConfiguredDirectorySource()
  ): Promise<ActiveEmployeeSyncPreview> {
    const sourceEmails = new Set(sourceUsers.map((user) => user.email));
    const currentUsers = await prisma.user.findMany({
      where: {
        directorySource: {
          in: ["GOOGLE_GROUP", "GOOGLE_DIRECTORY"]
        },
        directoryStatus: "ACTIVE"
      },
      select: {
        email: true
      }
    });
    const currentEmails = new Set(currentUsers.map((user) => user.email.toLowerCase()));

    return {
      activeCount: sourceUsers.length,
      currentMemberCount: currentEmails.size,
      addEmails: sourceUsers
        .map((user) => user.email)
        .filter((email) => !currentEmails.has(email))
        .sort(),
      removeEmails: Array.from(currentEmails)
        .filter((email) => !sourceEmails.has(email))
        .sort(),
      sourceType: source.sourceType.toLowerCase() as ActiveEmployeeSyncPreview["sourceType"],
      sourceName: source.sourceName
    };
  }

  private async fetchSourceUsers(): Promise<SyncCandidate[]> {
    const source = getConfiguredDirectorySource();

    if (source.sourceType === "LOCAL_MANUAL") {
      return [];
    }

    if (source.sourceType === "GOOGLE_DIRECTORY") {
      const users = await this.directory.listActiveUsers();
      return dedupeSyncCandidates(
        users
          .map((user) => mapDirectoryUserToSyncCandidate(user, source.userSource))
          .filter((user): user is SyncCandidate => user !== null)
      );
    }

    const groupEmail = source.sourceName;

    if (!groupEmail) {
      throw new Error("GOOGLE_ACTIVE_EMPLOYEES_GROUP_EMAIL must be configured for Google Group sync.");
    }

    const members = await this.directory.listGroupMembers(groupEmail);
    const users = await Promise.all(
      members.map(async (member) => {
        const email = member.email.trim().toLowerCase();

        if (!isHostedDomainEmail(email)) {
          return null;
        }

        const directoryUser = await this.directory.getUserByEmail(email);
        return mapDirectoryUserToSyncCandidate(
          directoryUser ?? {
            id: email,
            primaryEmail: email
          },
          source.userSource
        );
      })
    );

    return dedupeSyncCandidates(users.filter((user): user is SyncCandidate => user !== null));
  }
}

function mapDirectoryUserToSyncCandidate(
  user: DirectoryUser,
  source: DirectoryUserSourceType
): SyncCandidate | null {
  const email = user.primaryEmail.trim().toLowerCase();

  if (!email || !isHostedDomainEmail(email)) {
    return null;
  }

  return {
    email,
    googleUserId: user.id || null,
    displayName: user.name?.fullName?.trim() || email.split("@")[0],
    givenName: user.name?.givenName?.trim() || null,
    familyName: user.name?.familyName?.trim() || null,
    orgUnitPath: user.orgUnitPath?.trim() || null,
    department: user.department?.trim() || null,
    title: user.title?.trim() || null,
    aliases: normalizeAliases(user.aliases),
    status: user.suspended ? "SUSPENDED" : "ACTIVE",
    source
  };
}

function mapSyncCandidateToUserUpdate(user: SyncCandidate, syncedAt: Date): Prisma.UserUpdateInput {
  return {
    googleUserId: user.googleUserId,
    displayName: user.displayName,
    givenName: user.givenName,
    familyName: user.familyName,
    isActive: user.status === "ACTIVE",
    directoryStatus: user.status,
    directorySource: user.source,
    orgUnitPath: user.orgUnitPath,
    department: user.department,
    title: user.title,
    aliases: {
      set: user.aliases
    },
    lastSyncedAt: syncedAt
  };
}

function mapSyncCandidateToUserCreate(user: SyncCandidate, syncedAt: Date): Prisma.UserCreateInput {
  return {
    email: user.email,
    googleUserId: user.googleUserId,
    displayName: user.displayName,
    givenName: user.givenName,
    familyName: user.familyName,
    isActive: user.status === "ACTIVE",
    directoryStatus: user.status,
    directorySource: user.source,
    orgUnitPath: user.orgUnitPath,
    department: user.department,
    title: user.title,
    aliases: user.aliases,
    lastSyncedAt: syncedAt
  };
}

function normalizeAliases(aliases: string[] | undefined) {
  return Array.from(
    new Set(
      (aliases ?? [])
        .map((alias) => alias.trim().toLowerCase())
        .filter((alias) => alias.length > 0)
    )
  );
}

function dedupeSyncCandidates(users: SyncCandidate[]) {
  const byEmail = new Map<string, SyncCandidate>();

  for (const user of users) {
    byEmail.set(user.email, user);
  }

  return Array.from(byEmail.values()).sort((left, right) => left.email.localeCompare(right.email));
}

function isHostedDomainEmail(email: string) {
  const hostedDomain = env.GOOGLE_HOSTED_DOMAIN?.toLowerCase();
  return hostedDomain ? email.endsWith(`@${hostedDomain}`) : true;
}

export function getAllEmployeesGroupEmail() {
  return getConfiguredDirectorySource().sourceName ?? "grp-all-employees@conceivable.life";
}
