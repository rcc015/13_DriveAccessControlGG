import type { DirectorySyncSourceType, DirectorySyncStatus, DirectoryUserSourceType } from "@prisma/client";
import { env } from "@/lib/config/env";
import { prisma } from "@/lib/db/prisma";

export const MANAGED_DIRECTORY_SYNC_STATE_ID = "managed-user-directory";

export interface ConfiguredDirectorySource {
  sourceType: DirectorySyncSourceType;
  sourceName: string | null;
  userSource: DirectoryUserSourceType;
}

export function getConfiguredDirectorySource(): ConfiguredDirectorySource {
  if (env.GOOGLE_ACTIVE_EMPLOYEES_GROUP_EMAIL) {
    return {
      sourceType: "GOOGLE_GROUP",
      sourceName: env.GOOGLE_ACTIVE_EMPLOYEES_GROUP_EMAIL.toLowerCase(),
      userSource: "GOOGLE_GROUP"
    };
  }

  if (env.GOOGLE_INTEGRATION_MODE === "google") {
    return {
      sourceType: "GOOGLE_DIRECTORY",
      sourceName: env.GOOGLE_DIRECTORY_CUSTOMER_ID ?? "my_customer",
      userSource: "GOOGLE_DIRECTORY"
    };
  }

  return {
    sourceType: "LOCAL_MANUAL",
    sourceName: null,
    userSource: "MANUAL"
  };
}

export function sanitizeDirectorySyncError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown directory sync error.";
  return message.replace(/\s+/g, " ").trim().slice(0, 500);
}

export async function getDirectorySyncStateRecord() {
  return prisma.directorySyncState.findUnique({
    where: { id: MANAGED_DIRECTORY_SYNC_STATE_ID }
  });
}

export async function upsertDirectorySyncState(data: {
  sourceType?: DirectorySyncSourceType;
  sourceName?: string | null;
  lastAttemptedSyncAt?: Date;
  lastSuccessfulSyncAt?: Date | null;
  lastSyncStatus?: DirectorySyncStatus;
  lastSyncError?: string | null;
  lastFetchedCount?: number;
  lastCreatedCount?: number;
  lastUpdatedCount?: number;
  lastMarkedInactiveCount?: number;
  lastMarkedSuspendedCount?: number;
  lastSkippedCount?: number;
}) {
  const configuredSource = getConfiguredDirectorySource();

  return prisma.directorySyncState.upsert({
    where: { id: MANAGED_DIRECTORY_SYNC_STATE_ID },
    create: {
      id: MANAGED_DIRECTORY_SYNC_STATE_ID,
      sourceType: data.sourceType ?? configuredSource.sourceType,
      sourceName: data.sourceName ?? configuredSource.sourceName,
      lastAttemptedSyncAt: data.lastAttemptedSyncAt,
      lastSuccessfulSyncAt: data.lastSuccessfulSyncAt ?? null,
      lastSyncStatus: data.lastSyncStatus ?? "NEVER",
      lastSyncError: data.lastSyncError ?? null,
      lastFetchedCount: data.lastFetchedCount ?? 0,
      lastCreatedCount: data.lastCreatedCount ?? 0,
      lastUpdatedCount: data.lastUpdatedCount ?? 0,
      lastMarkedInactiveCount: data.lastMarkedInactiveCount ?? 0,
      lastMarkedSuspendedCount: data.lastMarkedSuspendedCount ?? 0,
      lastSkippedCount: data.lastSkippedCount ?? 0
    },
    update: {
      sourceType: data.sourceType ?? configuredSource.sourceType,
      sourceName: data.sourceName ?? configuredSource.sourceName,
      lastAttemptedSyncAt: data.lastAttemptedSyncAt,
      lastSuccessfulSyncAt: data.lastSuccessfulSyncAt ?? undefined,
      lastSyncStatus: data.lastSyncStatus,
      lastSyncError: data.lastSyncError,
      lastFetchedCount: data.lastFetchedCount,
      lastCreatedCount: data.lastCreatedCount,
      lastUpdatedCount: data.lastUpdatedCount,
      lastMarkedInactiveCount: data.lastMarkedInactiveCount,
      lastMarkedSuspendedCount: data.lastMarkedSuspendedCount,
      lastSkippedCount: data.lastSkippedCount
    }
  });
}
