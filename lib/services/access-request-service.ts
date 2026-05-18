import { prisma } from "@/lib/db/prisma";
import { AuditLogService } from "@/lib/services/audit-log-service";
import type { AccessRequestStatus, AccessRequestType } from "@/types/domain";

type AccessRequestRecord = Awaited<ReturnType<typeof prisma.accessRequest.create>>;

type AccessRequestRepository = {
  findUserByEmail(email: string): Promise<{
    id: string;
    email: string;
    displayName: string;
    isActive: boolean;
    directoryStatus: string;
  } | null>;
  findAccessRoleById(id: string): Promise<{ id: string; displayName: string } | null>;
  findSharedDriveById(id: string): Promise<{ id: string; name: string } | null>;
  findRestrictedFolderById(id: string): Promise<{ id: string; path: string; isRestricted: boolean } | null>;
  createRequest(data: Record<string, unknown>): Promise<AccessRequestRecord>;
  updateRequest(where: { id: string }, data: Record<string, unknown>): Promise<{
    id: string;
    status: AccessRequestStatus;
    requestType: AccessRequestType;
    requestedByEmail: string;
    justification: string;
    requestedAccessLevel: string | null;
    otherTargetText: string | null;
    neededByDate: Date | null;
    endDate: Date | null;
    approverEmail: string | null;
    approvalReference: string | null;
    reviewerNotes: string | null;
    reviewedAt: Date | null;
    fulfilledAt: Date | null;
    user: { email: string; displayName: string };
    accessRole: { displayName: string } | null;
    sharedDrive: { name: string } | null;
    restrictedFolder: { path: string } | null;
  }>;
  findRequestById(id: string): Promise<{
    id: string;
    status: AccessRequestStatus;
    requestedByEmail: string;
    user: { email: string; displayName: string };
  } | null>;
};

const defaultRepository: AccessRequestRepository = {
  async findUserByEmail(email) {
    return prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        displayName: true,
        isActive: true,
        directoryStatus: true
      }
    });
  },
  async findAccessRoleById(id) {
    return prisma.accessRole.findUnique({
      where: { id },
      select: {
        id: true,
        displayName: true
      }
    });
  },
  async findSharedDriveById(id) {
    return prisma.sharedDrive.findUnique({
      where: { id },
      select: {
        id: true,
        name: true
      }
    });
  },
  async findRestrictedFolderById(id) {
    return prisma.restrictedFolder.findUnique({
      where: { id },
      select: {
        id: true,
        path: true,
        isRestricted: true
      }
    });
  },
  async createRequest(data) {
    return prisma.accessRequest.create({
      data: data as never
    });
  },
  async updateRequest(where, data) {
    return prisma.accessRequest.update({
      where,
      data: data as never,
      include: {
        user: {
          select: {
            email: true,
            displayName: true
          }
        },
        accessRole: {
          select: {
            displayName: true
          }
        },
        sharedDrive: {
          select: {
            name: true
          }
        },
        restrictedFolder: {
          select: {
            path: true
          }
        }
      }
    });
  },
  async findRequestById(id) {
    return prisma.accessRequest.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        requestedByEmail: true,
        user: {
          select: {
            email: true,
            displayName: true
          }
        }
      }
    });
  }
};

const reviewerStatuses: AccessRequestStatus[] = ["APPROVED", "REJECTED", "NEEDS_INFO", "IN_REVIEW"];

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeOptionalDate(value?: Date | null) {
  return value ?? null;
}

function normalizeJustification(justification: string) {
  return justification.trim().replace(/\s+/g, " ");
}

function ensureMinimumJustification(justification: string) {
  if (justification.length < 20) {
    throw new Error("Business justification must be at least 20 characters.");
  }
}

function parseAccessLevel(input?: string | null) {
  const value = input?.trim().toUpperCase() ?? "";

  if (!value) {
    return null;
  }

  if (!["VIEWER", "CONTRIBUTOR"].includes(value)) {
    throw new Error("Unsupported requested access level.");
  }

  return value;
}

export class AccessRequestService {
  constructor(
    private repository: AccessRequestRepository = defaultRepository,
    private auditLog = new AuditLogService()
  ) {}

  async createRequest(input: {
    requesterEmail: string;
    requesterName?: string | null;
    requestType: AccessRequestType;
    justification: string;
    accessRoleId?: string;
    sharedDriveId?: string;
    restrictedFolderId?: string;
    otherTargetText?: string;
    requestedAccessLevel?: string | null;
    neededByDate?: Date;
    requestedExpirationDate?: Date;
  }) {
    const requesterEmail = normalizeEmail(input.requesterEmail);
    const requester = await this.repository.findUserByEmail(requesterEmail);

    if (!requester || !requester.isActive || requester.directoryStatus !== "ACTIVE") {
      throw new Error("Only active employees can submit access requests.");
    }

    const justification = normalizeJustification(input.justification);
    if (!justification) {
      throw new Error("Business justification is required.");
    }
    ensureMinimumJustification(justification);

    const requestedAccessLevel = parseAccessLevel(input.requestedAccessLevel);

    let accessRoleId: string | null = null;
    let sharedDriveId: string | null = null;
    let restrictedFolderId: string | null = null;
    let otherTargetText: string | null = input.otherTargetText?.trim() || null;
    let targetLabel = "";

    switch (input.requestType) {
      case "BUSINESS_ROLE": {
        if (!input.accessRoleId) {
          throw new Error("Business role selection is required.");
        }

        const accessRole = await this.repository.findAccessRoleById(input.accessRoleId);
        if (!accessRole) {
          throw new Error("Unknown business role.");
        }

        accessRoleId = accessRole.id;
        targetLabel = accessRole.displayName;
        break;
      }
      case "SHARED_DRIVE": {
        if (!input.sharedDriveId) {
          throw new Error("Shared Drive selection is required.");
        }

        const sharedDrive = await this.repository.findSharedDriveById(input.sharedDriveId);
        if (!sharedDrive) {
          throw new Error("Unknown Shared Drive.");
        }

        sharedDriveId = sharedDrive.id;
        targetLabel = sharedDrive.name;
        break;
      }
      case "RESTRICTED_FOLDER": {
        if (!input.restrictedFolderId) {
          throw new Error("Restricted folder selection is required.");
        }

        const restrictedFolder = await this.repository.findRestrictedFolderById(input.restrictedFolderId);
        if (!restrictedFolder || !restrictedFolder.isRestricted) {
          throw new Error("Unknown restricted folder.");
        }

        restrictedFolderId = restrictedFolder.id;
        targetLabel = restrictedFolder.path;
        break;
      }
      case "OTHER": {
        if (!otherTargetText) {
          throw new Error("Describe the requested access target.");
        }

        targetLabel = otherTargetText;
        break;
      }
      default:
        throw new Error("Unsupported request type.");
    }

    const request = await this.repository.createRequest({
      userId: requester.id,
      requestType: input.requestType,
      requestedByEmail: requesterEmail,
      requesterName: input.requesterName?.trim() || requester.displayName,
      accessRoleId,
      sharedDriveId,
      restrictedFolderId,
      requestedAccessLevel,
      otherTargetText,
      justification,
      neededByDate: normalizeOptionalDate(input.neededByDate),
      endDate: normalizeOptionalDate(input.requestedExpirationDate)
    });

    await this.auditLog.record({
      actorEmail: requesterEmail,
      actionType: "ACCESS_REQUEST_SUBMITTED",
      targetUserEmail: requesterEmail,
      targetDriveName: input.requestType === "SHARED_DRIVE" ? targetLabel : undefined,
      targetFolderPath: input.requestType === "RESTRICTED_FOLDER" ? targetLabel : undefined,
      result: "SUCCESS",
      notes: justification,
      metadata: {
        requestId: request.id,
        requestType: input.requestType,
        targetLabel,
        requestedAccessLevel,
        neededByDate: input.neededByDate?.toISOString() ?? null,
        requestedExpirationDate: input.requestedExpirationDate?.toISOString() ?? null
      }
    });

    return request;
  }

  async reviewRequest(input: {
    actorEmail: string;
    requestId: string;
    decision: "APPROVED" | "REJECTED" | "NEEDS_INFO" | "IN_REVIEW";
    reviewerNotes?: string;
    approvalReference?: string;
  }) {
    if (!reviewerStatuses.includes(input.decision)) {
      throw new Error("Unsupported review decision.");
    }

    const reviewedAt = new Date();
    const updated = await this.repository.updateRequest(
      { id: input.requestId },
      {
        status: input.decision,
        approverEmail: normalizeEmail(input.actorEmail),
        approvalReference: input.approvalReference ?? null,
        reviewerNotes: input.reviewerNotes?.trim() || null,
        reviewedAt,
        decidedAt: reviewedAt
      }
    );

    await this.auditLog.record({
      actorEmail: normalizeEmail(input.actorEmail),
      actionType: `ACCESS_REQUEST_${input.decision}`,
      targetUserEmail: updated.user.email,
      targetDriveName: updated.sharedDrive?.name ?? undefined,
      targetFolderPath: updated.restrictedFolder?.path ?? undefined,
      approvalReference: input.approvalReference,
      result: "SUCCESS",
      notes: input.reviewerNotes?.trim() || updated.justification,
      metadata: {
        requestId: updated.id,
        requestType: updated.requestType,
        requestedAccessLevel: updated.requestedAccessLevel,
        accessRole: updated.accessRole?.displayName ?? null,
        sharedDrive: updated.sharedDrive?.name ?? null,
        restrictedFolder: updated.restrictedFolder?.path ?? null
      }
    });

    return updated;
  }

  async cancelRequest(input: {
    actorEmail: string;
    requestId: string;
  }) {
    const actorEmail = normalizeEmail(input.actorEmail);
    const existing = await this.repository.findRequestById(input.requestId);

    if (!existing) {
      throw new Error("Access request not found.");
    }

    if (normalizeEmail(existing.requestedByEmail) !== actorEmail) {
      throw new Error("You can only cancel your own access requests.");
    }

    if (existing.status !== "REQUESTED" && existing.status !== "IN_REVIEW" && existing.status !== "NEEDS_INFO") {
      throw new Error("Only open access requests can be cancelled.");
    }

    const updated = await this.repository.updateRequest(
      { id: input.requestId },
      {
        status: "CANCELLED",
        reviewedAt: new Date(),
        reviewerNotes: "Cancelled by requester."
      }
    );

    await this.auditLog.record({
      actorEmail,
      actionType: "ACCESS_REQUEST_CANCELLED",
      targetUserEmail: updated.user.email,
      targetDriveName: updated.sharedDrive?.name ?? undefined,
      targetFolderPath: updated.restrictedFolder?.path ?? undefined,
      result: "SUCCESS",
      notes: updated.justification,
      metadata: {
        requestId: updated.id,
        requestType: updated.requestType
      }
    });

    return updated;
  }
}
