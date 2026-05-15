export type UserSuggestionStatus = "active" | "inactive" | "suspended";
export type UserSuggestionSource = "google_group" | "google_directory" | "manual";

export interface UserSuggestion {
  id: string;
  email: string;
  displayName: string;
  givenName: string | null;
  familyName: string | null;
  status: UserSuggestionStatus;
  department: string | null;
  title: string | null;
  orgUnitPath?: string | null;
  aliases?: string[];
  source: UserSuggestionSource;
  lastSyncedAt: string | null;
}

export interface UserSearchResponse {
  results: UserSuggestion[];
  meta: {
    source: "local";
    usedLiveDirectoryFallback: false;
    emptyState: "none" | "no_match" | "sync_empty" | "sync_error";
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
  };
}
