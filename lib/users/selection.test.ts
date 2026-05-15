import test from "node:test";
import assert from "node:assert/strict";
import { resolveManagedUserSelection } from "@/lib/users/selection";

function buildFormData(entries: Record<string, string>) {
  const formData = new FormData();

  for (const [key, value] of Object.entries(entries)) {
    formData.set(key, value);
  }

  return formData;
}

test("valid selection save behavior uses the managed selected user", async () => {
  const result = await resolveManagedUserSelection(
    buildFormData({
      userEmail: "rodrigo@conceivable.life",
      displayName: "Wrong Name",
      selectedUserId: "usr_1"
    }),
    {
      emailField: "userEmail",
      displayNameField: "displayName",
      selectionIdField: "selectedUserId",
      userLookup: {
        async findById(id) {
          if (id !== "usr_1") {
            return null;
          }

          return {
            id: "usr_1",
            email: "rodrigo@conceivable.life",
            displayName: "Rodrigo Castro",
            isActive: true
          };
        },
        async findByEmail(email) {
          if (email !== "rodrigo@conceivable.life") {
            return null;
          }

          return {
            id: "usr_1",
            email: "rodrigo@conceivable.life",
            displayName: "Rodrigo Castro",
            isActive: true
          };
        }
      }
    }
  );

  assert.equal(result.email, "rodrigo@conceivable.life");
  assert.equal(result.displayName, "Rodrigo Castro");
  assert.equal(result.isManaged, true);
});

test("invalid manual email warning behavior still preserves manual entry when allowed", async () => {
  const result = await resolveManagedUserSelection(
    buildFormData({
      userEmail: "new.user@conceivable.life",
      displayName: "New User"
    }),
    {
      emailField: "userEmail",
      displayNameField: "displayName",
      allowManualEntry: true,
      userLookup: {
        async findById() {
          return null;
        },
        async findByEmail() {
          return null;
        }
      }
    }
  );

  assert.equal(result.email, "new.user@conceivable.life");
  assert.equal(result.displayName, "New User");
  assert.equal(result.isManaged, false);
});

test("invalid manual non-email input is rejected before save", async () => {
  await assert.rejects(
    () =>
      resolveManagedUserSelection(
        buildFormData({
          userEmail: "Rodrigo"
        }),
        {
          emailField: "userEmail",
          allowManualEntry: true,
          userLookup: {
            async findById() {
              return null;
            },
            async findByEmail() {
              return null;
            }
          }
        }
      ),
    /valid email address/
  );
});
