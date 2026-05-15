import test from "node:test";
import assert from "node:assert/strict";
import {
  additionalBusinessAccessRoleMappings,
  additionalBusinessAccessRoles,
  missingRecommendedBusinessAccessGroups
} from "@/lib/access-roles/additional-business-roles";

test("catalog contains the five new business access roles", () => {
  const codes = additionalBusinessAccessRoles.map((role) => role.code);

  assert.deepEqual(codes, [
    "CTO",
    "SOFTWARE_DIRECTOR",
    "SOFTWARE_INTEGRATOR",
    "INFRASTRUCTURE_ENGINEER",
    "REQUIREMENTS_ENGINEER"
  ]);
});

test("new business access roles have the expected restricted modes", () => {
  const modeByCode = Object.fromEntries(
    additionalBusinessAccessRoles.map((role) => [role.code, role.restrictedAccessMode])
  );

  assert.equal(modeByCode.CTO, "EXCEPTION_FIRST");
  assert.equal(modeByCode.INFRASTRUCTURE_ENGINEER, "EXCEPTION_FIRST");
  assert.equal(modeByCode.SOFTWARE_DIRECTOR, "NONE");
  assert.equal(modeByCode.SOFTWARE_INTEGRATOR, "NONE");
  assert.equal(modeByCode.REQUIREMENTS_ENGINEER, "NONE");
});

test("new business access role mappings target the expected drives and groups", () => {
  const mappingsByCode = Object.groupBy(additionalBusinessAccessRoleMappings, (mapping) => mapping.code);

  assert.deepEqual(
    mappingsByCode.CTO?.map((mapping) => [mapping.driveName, mapping.groupEmail]),
    [
      ["02_Strategic_Working", "grp-strategic-owner@conceivable.life"],
      ["03_Operational_Working", "grp-operational-owner@conceivable.life"],
      ["04_Support_Working", "grp-support-owner@conceivable.life"]
    ]
  );

  assert.deepEqual(
    mappingsByCode.SOFTWARE_DIRECTOR?.map((mapping) => [mapping.driveName, mapping.groupEmail]),
    [
      ["02_Strategic_Working", "grp-strategic-editor@conceivable.life"],
      ["03_Operational_Working", "grp-operational-owner@conceivable.life"]
    ]
  );

  assert.deepEqual(
    mappingsByCode.SOFTWARE_INTEGRATOR?.map((mapping) => [mapping.driveName, mapping.groupEmail]),
    [["03_Operational_Working", "grp-operational-contributor@conceivable.life"]]
  );

  assert.deepEqual(
    mappingsByCode.INFRASTRUCTURE_ENGINEER?.map((mapping) => [mapping.driveName, mapping.groupEmail]),
    [
      ["03_Operational_Working", "grp-operational-contributor@conceivable.life"],
      ["04_Support_Working", "grp-it@conceivable.life"]
    ]
  );

  assert.deepEqual(
    mappingsByCode.REQUIREMENTS_ENGINEER?.map((mapping) => [mapping.driveName, mapping.groupEmail]),
    [
      ["02_Strategic_Working", "grp-strategic-editor@conceivable.life"],
      ["03_Operational_Working", "grp-operational-contributor@conceivable.life"]
    ]
  );
});

test("infrastructure engineer records the missing support contributor group fallback explicitly", () => {
  assert.deepEqual(missingRecommendedBusinessAccessGroups, [
    {
      roleCode: "INFRASTRUCTURE_ENGINEER",
      recommendedGroupEmail: "grp-support-contributor@conceivable.life",
      fallbackGroupEmail: "grp-it@conceivable.life",
      reason:
        "The current group inventory does not include a dedicated support contributor group. The existing IT contributor group is the closest least-privilege support-side mapping."
    }
  ]);
});

test("new business access role definitions are complete and render-safe", () => {
  for (const role of additionalBusinessAccessRoles) {
    assert.ok(role.code);
    assert.ok(role.displayName);
    assert.ok(role.department);
    assert.ok(role.description);
    assert.ok(role.restrictedAccessMode);
  }

  for (const mapping of additionalBusinessAccessRoleMappings) {
    assert.ok(mapping.code);
    assert.ok(mapping.driveName);
    assert.ok(mapping.groupEmail);
    assert.ok(mapping.accessLevel);
  }
});
