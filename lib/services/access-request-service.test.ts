import test from "node:test";
import assert from "node:assert/strict";
import { AccessRequestService } from "@/lib/services/access-request-service";

function createFakeDependencies() {
  const requests = new Map<string, any>();
  const auditEntries: Array<Record<string, unknown>> = [];
  let requestCounter = 0;

  const repository = {
    async findUserByEmail(email: string) {
      if (email === "employee@conceivable.life") {
        return {
          id: "user-1",
          email,
          displayName: "Employee User",
          isActive: true,
          directoryStatus: "ACTIVE"
        };
      }

      return null;
    },
    async findAccessRoleById(id: string) {
      return id === "access-role-1"
        ? {
            id,
            displayName: "Finance Analyst"
          }
        : null;
    },
    async findSharedDriveById(id: string) {
      return id === "drive-1"
        ? {
            id,
            name: "03_Operational_Working"
          }
        : null;
    },
    async findRestrictedFolderById(id: string) {
      return id === "folder-1"
        ? {
            id,
            path: "04_Support_Working / 05_Finance",
            isRestricted: true
          }
        : null;
    },
    async createRequest(data: Record<string, unknown>) {
      requestCounter += 1;
      const request = {
        id: `request-${requestCounter}`,
        ...data
      };
      requests.set(request.id, request);
      return request;
    },
    async updateRequest(where: { id: string }, data: Record<string, unknown>) {
      const current = requests.get(where.id);
      if (!current) {
        throw new Error("Missing request");
      }

      const updated = {
        ...current,
        ...data,
        user: {
          email: "employee@conceivable.life",
          displayName: "Employee User"
        },
        accessRole: current.accessRoleId ? { displayName: "Finance Analyst" } : null,
        sharedDrive: current.sharedDriveId ? { name: "03_Operational_Working" } : null,
        restrictedFolder: current.restrictedFolderId ? { path: "04_Support_Working / 05_Finance" } : null
      };

      requests.set(where.id, updated);
      return updated;
    },
    async findRequestById(id: string) {
      const current = requests.get(id);
      if (!current) {
        return null;
      }

      return {
        id: current.id,
        status: current.status ?? "REQUESTED",
        requestedByEmail: current.requestedByEmail,
        user: {
          email: "employee@conceivable.life",
          displayName: "Employee User"
        }
      };
    }
  };

  const auditLog = {
    async record(entry: Record<string, unknown>) {
      auditEntries.push(entry);
    }
  };

  return {
    service: new AccessRequestService(repository as never, auditLog as never),
    requests,
    auditEntries
  };
}

test("requester can create a business role request and justification is normalized", async () => {
  const fake = createFakeDependencies();

  const request = await fake.service.createRequest({
    requesterEmail: "EMPLOYEE@conceivable.life",
    requesterName: "Employee User",
    requestType: "BUSINESS_ROLE",
    accessRoleId: "access-role-1",
    justification: "  Need access for monthly close and invoice reviews across the finance queue.  "
  });

  assert.equal(request.requestedByEmail, "employee@conceivable.life");
  assert.equal(request.requestType, "BUSINESS_ROLE");
  assert.equal(request.justification, "Need access for monthly close and invoice reviews across the finance queue.");
  assert.equal(fake.auditEntries.length, 1);
  assert.equal(fake.auditEntries[0]?.actionType, "ACCESS_REQUEST_SUBMITTED");
});

test("request submission requires at least 20 characters of business justification", async () => {
  const fake = createFakeDependencies();

  await assert.rejects(
    fake.service.createRequest({
      requesterEmail: "employee@conceivable.life",
      requestType: "OTHER",
      otherTargetText: "Need something",
      justification: "Too short"
    }),
    /at least 20 characters/
  );
});

test("unknown request targets are rejected server-side", async () => {
  const fake = createFakeDependencies();

  await assert.rejects(
    fake.service.createRequest({
      requesterEmail: "employee@conceivable.life",
      requestType: "SHARED_DRIVE",
      sharedDriveId: "missing-drive",
      justification: "Need access to a drive that is not part of the managed policy catalog."
    }),
    /Unknown Shared Drive/
  );
});

test("reviewer can approve request with notes without silently granting access", async () => {
  const fake = createFakeDependencies();
  const created = await fake.service.createRequest({
    requesterEmail: "employee@conceivable.life",
    requestType: "RESTRICTED_FOLDER",
    restrictedFolderId: "folder-1",
    requestedAccessLevel: "viewer",
    justification: "Need temporary access to validate finance evidence before the quarterly audit starts."
  });

  const updated = await fake.service.reviewRequest({
    actorEmail: "reviewer@conceivable.life",
    requestId: created.id,
    decision: "APPROVED",
    reviewerNotes: "Approved pending manual fulfillment."
  });

  assert.equal(updated.status, "APPROVED");
  assert.equal(updated.reviewerNotes, "Approved pending manual fulfillment.");
  assert.equal(fake.auditEntries.at(-1)?.actionType, "ACCESS_REQUEST_APPROVED");
});

test("requester can cancel only own open request", async () => {
  const fake = createFakeDependencies();
  const created = await fake.service.createRequest({
    requesterEmail: "employee@conceivable.life",
    requestType: "SHARED_DRIVE",
    sharedDriveId: "drive-1",
    requestedAccessLevel: "CONTRIBUTOR",
    justification: "Need contributor access to upload validation outputs for the current engineering deliverable."
  });

  const updated = await fake.service.cancelRequest({
    actorEmail: "employee@conceivable.life",
    requestId: created.id
  });

  assert.equal(updated.status, "CANCELLED");
  assert.equal(fake.auditEntries.at(-1)?.actionType, "ACCESS_REQUEST_CANCELLED");
});
