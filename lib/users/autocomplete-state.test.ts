import test from "node:test";
import assert from "node:assert/strict";
import {
  getAutocompleteEmptyStateMessage,
  getAutocompleteSelectionLabel,
  getNextAutocompleteIndex,
  shouldApplyAutocompleteResponse,
  shouldShowManualEntryWarning
} from "@/lib/users/autocomplete-state";
import type { UserSuggestion } from "@/lib/users/types";

const suggestion: UserSuggestion = {
  id: "usr_1",
  email: "RODRIGO@CONCEIVABLE.LIFE",
  displayName: "Rodrigo Castro",
  givenName: "Rodrigo",
  familyName: "Castro",
  status: "active",
  department: null,
  title: null,
  source: "google_group",
  lastSyncedAt: "2026-05-14T00:00:00.000Z"
};

test("frontend autocomplete builds a readable selection label", () => {
  assert.equal(getAutocompleteSelectionLabel(suggestion), "Rodrigo Castro (rodrigo@conceivable.life)");
});

test("keyboard selection wraps through the suggestion list", () => {
  assert.equal(getNextAutocompleteIndex(-1, "down", 3), 0);
  assert.equal(getNextAutocompleteIndex(2, "down", 3), 0);
  assert.equal(getNextAutocompleteIndex(0, "up", 3), 2);
});

test("no-results manual email warning is shown only when needed", () => {
  assert.equal(
    shouldShowManualEntryWarning({
      allowManualEntry: true,
      hasExactManagedMatch: false,
      inputValue: "unknown@conceivable.life",
      isLoading: false,
      suggestions: []
    }),
    true
  );

  assert.equal(
    shouldShowManualEntryWarning({
      allowManualEntry: true,
      hasExactManagedMatch: true,
      inputValue: "rodrigo@conceivable.life",
      isLoading: false,
      suggestions: [suggestion]
    }),
    false
  );
});

test("stale autocomplete responses are ignored", () => {
  assert.equal(shouldApplyAutocompleteResponse(3, 3), true);
  assert.equal(shouldApplyAutocompleteResponse(2, 3), false);
});

test("empty state message distinguishes sync errors from no-match results", () => {
  assert.equal(
    getAutocompleteEmptyStateMessage({
      emptyState: "sync_error",
      lastSyncError: "Delegation failed.",
      activeUsersCount: 0
    }),
    "Unable to search users because directory sync is not configured or failed."
  );

  assert.equal(
    getAutocompleteEmptyStateMessage({
      emptyState: "no_match",
      lastSyncError: null,
      activeUsersCount: 12
    }),
    "No matching active users found."
  );
});
