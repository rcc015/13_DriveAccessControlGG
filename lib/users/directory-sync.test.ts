import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeDirectorySyncError } from "@/lib/users/directory-sync";

test("directory sync errors are sanitized for UI/status display", () => {
  const error = new Error("  Google API delegation failed.\nService account missing scope.  ");

  assert.equal(
    sanitizeDirectorySyncError(error),
    "Google API delegation failed. Service account missing scope."
  );
});
