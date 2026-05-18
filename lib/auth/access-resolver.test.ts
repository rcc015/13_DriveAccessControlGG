import test from "node:test";
import assert from "node:assert/strict";
import { getHomeRouteForRole, resolveAccessForIdentity } from "@/lib/auth/access-resolver";

test("active employee without admin role becomes requester", () => {
  const result = resolveAccessForIdentity({
    email: "employee@conceivable.life",
    hostedDomain: "conceivable.life",
    directoryUser: {
      isActive: true,
      directoryStatus: "ACTIVE"
    }
  });

  assert.equal(result.authorized, true);
  assert.equal(result.appRole, "REQUESTER");
  assert.equal(result.reason, "AUTHORIZED_REQUESTER");
});

test("super admin role resolves to admin dashboard access", () => {
  const result = resolveAccessForIdentity({
    email: "admin@conceivable.life",
    hostedDomain: "conceivable.life",
    explicitRole: "SUPER_ADMIN"
  });

  assert.equal(result.authorized, true);
  assert.equal(result.appRole, "SUPER_ADMIN");
  assert.equal(getHomeRouteForRole(result.appRole!), "/");
});

test("inactive directory user is denied even in hosted domain", () => {
  const result = resolveAccessForIdentity({
    email: "former.employee@conceivable.life",
    hostedDomain: "conceivable.life",
    directoryUser: {
      isActive: false,
      directoryStatus: "INACTIVE"
    }
  });

  assert.equal(result.authorized, false);
  assert.equal(result.reason, "DIRECTORY_INACTIVE");
});

test("outside-domain account is denied", () => {
  const result = resolveAccessForIdentity({
    email: "guest@example.com",
    hostedDomain: "conceivable.life",
    directoryUser: {
      isActive: true,
      directoryStatus: "ACTIVE"
    }
  });

  assert.equal(result.authorized, false);
  assert.equal(result.reason, "NOT_IN_ALLOWED_DOMAIN");
});
