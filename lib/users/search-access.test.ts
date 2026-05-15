import test from "node:test";
import assert from "node:assert/strict";
import { canSearchManagedUsers } from "@/lib/users/search-access";

test("Super Admin can access user search endpoint", () => {
  assert.equal(
    canSearchManagedUsers({
      email: "rodrigo@conceivable.life",
      displayName: "Rodrigo Castro",
      appRole: "SUPER_ADMIN"
    }),
    true
  );
});

test("request portal users can access user search endpoint when the workflow needs it", () => {
  assert.equal(
    canSearchManagedUsers({
      email: "guest@conceivable.life",
      displayName: "Guest User",
      appRole: "REQUESTER"
    }),
    true
  );
});

test("unauthenticated users cannot access user search endpoint", () => {
  assert.equal(canSearchManagedUsers(null), false);
});
