import type { UserSuggestion } from "@/lib/users/types";

export function getNextAutocompleteIndex(
  currentIndex: number,
  direction: "up" | "down",
  itemCount: number
) {
  if (itemCount === 0) {
    return -1;
  }

  if (direction === "down") {
    return currentIndex < itemCount - 1 ? currentIndex + 1 : 0;
  }

  return currentIndex > 0 ? currentIndex - 1 : itemCount - 1;
}

export function getAutocompleteSelectionLabel(suggestion: UserSuggestion) {
  const normalizedEmail = suggestion.email.trim().toLowerCase();

  if (suggestion.displayName && suggestion.displayName.toLowerCase() !== normalizedEmail) {
    return `${suggestion.displayName} (${normalizedEmail})`;
  }

  return normalizedEmail;
}

export function shouldShowManualEntryWarning({
  allowManualEntry,
  hasExactManagedMatch,
  inputValue,
  isLoading,
  suggestions
}: {
  allowManualEntry: boolean;
  hasExactManagedMatch: boolean;
  inputValue: string;
  isLoading: boolean;
  suggestions: UserSuggestion[];
}) {
  if (!allowManualEntry || isLoading) {
    return false;
  }

  const normalizedInput = inputValue.trim().toLowerCase();

  if (!normalizedInput.includes("@") || hasExactManagedMatch) {
    return false;
  }

  return suggestions.length === 0;
}

export function shouldApplyAutocompleteResponse(requestId: number, latestRequestId: number) {
  return requestId === latestRequestId;
}

export function getAutocompleteEmptyStateMessage(meta: {
  emptyState: "none" | "no_match" | "sync_empty" | "sync_error";
  lastSyncError: string | null;
  activeUsersCount: number;
} | null) {
  if (!meta) {
    return "No active employees are synced yet. Run Directory Sync.";
  }

  if (meta.emptyState === "sync_error") {
    return "Unable to search users because directory sync is not configured or failed.";
  }

  if (meta.emptyState === "sync_empty" || meta.activeUsersCount === 0) {
    return "No active employees are synced yet. Run Directory Sync.";
  }

  return "No matching active users found.";
}
