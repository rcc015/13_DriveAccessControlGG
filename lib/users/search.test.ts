import test from "node:test";
import assert from "node:assert/strict";
import { mapUserRecordToSuggestion, rankUserSuggestions } from "@/lib/users/search";

test("backend user search ranks exact and prefix matches first", () => {
  const suggestions = [
    mapUserRecordToSuggestion({
      id: "1",
      email: "rodrigo@conceivable.life",
      displayName: "Rodrigo Castro",
      givenName: "Rodrigo",
      familyName: "Castro",
      directoryStatus: "ACTIVE",
      directorySource: "GOOGLE_GROUP",
      department: null,
      title: null,
      orgUnitPath: null,
      aliases: [],
      lastSyncedAt: null
    }),
    mapUserRecordToSuggestion({
      id: "2",
      email: "ana@conceivable.life",
      displayName: "Ana Rodriguez",
      givenName: "Ana",
      familyName: "Rodriguez",
      directoryStatus: "ACTIVE",
      directorySource: "GOOGLE_GROUP",
      department: null,
      title: null,
      orgUnitPath: null,
      aliases: [],
      lastSyncedAt: null
    }),
    mapUserRecordToSuggestion({
      id: "3",
      email: "rod-support@conceivable.life",
      displayName: "Support Rotation",
      givenName: "Support",
      familyName: "Rotation",
      directoryStatus: "ACTIVE",
      directorySource: "GOOGLE_DIRECTORY",
      department: null,
      title: null,
      orgUnitPath: null,
      aliases: [],
      lastSyncedAt: null
    })
  ];

  const results = rankUserSuggestions(suggestions, "rod");

  assert.equal(results[0]?.email, "rodrigo@conceivable.life");
  assert.equal(results[1]?.email, "rod-support@conceivable.life");
});

test("backend user search hides inactive users by default", () => {
  const suggestions = [
    mapUserRecordToSuggestion({
      id: "1",
      email: "active@conceivable.life",
      displayName: "Active User",
      givenName: "Active",
      familyName: "User",
      directoryStatus: "ACTIVE",
      directorySource: "GOOGLE_GROUP",
      department: null,
      title: null,
      orgUnitPath: null,
      aliases: [],
      lastSyncedAt: null
    }),
    mapUserRecordToSuggestion({
      id: "2",
      email: "inactive@conceivable.life",
      displayName: "Inactive User",
      givenName: "Inactive",
      familyName: "User",
      directoryStatus: "INACTIVE",
      directorySource: "GOOGLE_GROUP",
      department: null,
      title: null,
      orgUnitPath: null,
      aliases: [],
      lastSyncedAt: null
    })
  ];

  const activeOnly = rankUserSuggestions(suggestions, "user");
  const withInactive = rankUserSuggestions(suggestions, "user", { includeInactive: true });

  assert.equal(activeOnly.some((user) => user.email === "inactive@conceivable.life"), false);
  assert.equal(withInactive.some((user) => user.email === "inactive@conceivable.life"), true);
});

test("backend user search returns partial email matches case-insensitively", () => {
  const suggestions = [
    mapUserRecordToSuggestion({
      id: "1",
      email: "rodrigo@conceivable.life",
      displayName: "Rodrigo Castro",
      givenName: "Rodrigo",
      familyName: "Castro",
      directoryStatus: "ACTIVE",
      directorySource: "GOOGLE_GROUP",
      department: null,
      title: null,
      orgUnitPath: null,
      aliases: [],
      lastSyncedAt: null
    })
  ];

  const results = rankUserSuggestions(suggestions, "RODRIGO@conceivable");

  assert.equal(results[0]?.email, "rodrigo@conceivable.life");
});

test("backend user search returns partial display name matches case-insensitively", () => {
  const suggestions = [
    mapUserRecordToSuggestion({
      id: "1",
      email: "rodrigo@conceivable.life",
      displayName: "Rodrigo Castro",
      givenName: "Rodrigo",
      familyName: "Castro",
      directoryStatus: "ACTIVE",
      directorySource: "GOOGLE_GROUP",
      department: null,
      title: null,
      orgUnitPath: null,
      aliases: [],
      lastSyncedAt: null
    })
  ];

  const results = rankUserSuggestions(suggestions, "cast");

  assert.equal(results[0]?.displayName, "Rodrigo Castro");
});

test("backend user suggestions normalize returned emails to lowercase", () => {
  const suggestion = mapUserRecordToSuggestion({
    id: "1",
    email: "FHURTADO@CONCEIVABLE.LIFE",
    displayName: "Francisco Hurtado",
    givenName: "Francisco",
    familyName: "Hurtado",
    directoryStatus: "ACTIVE",
    directorySource: "GOOGLE_GROUP",
    department: null,
    title: null,
    orgUnitPath: null,
    aliases: ["FHURTADO"],
    lastSyncedAt: null
  });

  assert.equal(suggestion.email, "fhurtado@conceivable.life");
  assert.deepEqual(suggestion.aliases, ["fhurtado"]);
});
