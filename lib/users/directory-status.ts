import { prisma } from "@/lib/db/prisma";
import { getConfiguredDirectorySource, getDirectorySyncStateRecord } from "@/lib/users/directory-sync";

export interface ManagedDirectoryStatus {
  managedUsersCount: number;
  activeUsersCount: number;
  inactiveUsersCount: number;
  suspendedUsersCount: number;
  lastAttemptedSyncAt: string | null;
  lastSuccessfulSyncAt: string | null;
  lastSyncStatus: "never" | "success" | "failed";
  lastSyncError: string | null;
  lastFetchedCount: number;
  lastCreatedCount: number;
  lastUpdatedCount: number;
  lastMarkedInactiveCount: number;
  lastMarkedSuspendedCount: number;
  lastSkippedCount: number;
  sourceType: "google_group" | "google_directory" | "local_manual";
  sourceName: string | null;
}

export async function getManagedDirectoryStatus(): Promise<ManagedDirectoryStatus> {
  const configuredSource = getConfiguredDirectorySource();
  const [managedUsersCount, activeUsersCount, inactiveUsersCount, suspendedUsersCount, syncState] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({
      where: { directoryStatus: "ACTIVE" }
    }),
    prisma.user.count({
      where: { directoryStatus: "INACTIVE" }
    }),
    prisma.user.count({
      where: { directoryStatus: "SUSPENDED" }
    }),
    getDirectorySyncStateRecord()
  ]);

  return {
    managedUsersCount,
    activeUsersCount,
    inactiveUsersCount,
    suspendedUsersCount,
    lastAttemptedSyncAt: syncState?.lastAttemptedSyncAt?.toISOString() ?? null,
    lastSuccessfulSyncAt: syncState?.lastSuccessfulSyncAt?.toISOString() ?? null,
    lastSyncStatus:
      syncState?.lastSyncStatus === "SUCCESS"
        ? "success"
        : syncState?.lastSyncStatus === "FAILED"
          ? "failed"
          : "never",
    lastSyncError: syncState?.lastSyncError ?? null,
    lastFetchedCount: syncState?.lastFetchedCount ?? 0,
    lastCreatedCount: syncState?.lastCreatedCount ?? 0,
    lastUpdatedCount: syncState?.lastUpdatedCount ?? 0,
    lastMarkedInactiveCount: syncState?.lastMarkedInactiveCount ?? 0,
    lastMarkedSuspendedCount: syncState?.lastMarkedSuspendedCount ?? 0,
    lastSkippedCount: syncState?.lastSkippedCount ?? 0,
    sourceType:
      (syncState?.sourceType ?? configuredSource.sourceType).toLowerCase() as ManagedDirectoryStatus["sourceType"],
    sourceName: syncState?.sourceName ?? configuredSource.sourceName
  };
}
