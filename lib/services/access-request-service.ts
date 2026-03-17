import { prisma } from "@/lib/db/prisma";
import { AuditLogService } from "@/lib/services/audit-log-service";

export class AccessRequestService {
  constructor(private auditLog = new AuditLogService()) {}

  async createRequest(input: {
    requesterEmail: string;
    targetUserEmail: string;
    restrictedFolderId: string;
    justification: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const user = await prisma.user.upsert({
      where: { email: input.targetUserEmail },
      update: {},
      create: {
        email: input.targetUserEmail,
        displayName: input.targetUserEmail.split("@")[0]
      }
    });

    const request = await prisma.accessRequest.create({
      data: {
        requestedByEmail: input.requesterEmail,
        userId: user.id,
        restrictedFolderId: input.restrictedFolderId,
        justification: input.justification,
        startDate: input.startDate,
        endDate: input.endDate
      }
    });

    await this.auditLog.record({
      actorEmail: input.requesterEmail,
      actionType: "RESTRICTED_ACCESS_REQUEST_CREATED",
      targetUserEmail: input.targetUserEmail,
      result: "SUCCESS",
      notes: input.justification,
      metadata: { requestId: request.id }
    });

    return request;
  }

  async decideRequest(input: {
    actorEmail: string;
    requestId: string;
    decision: "APPROVED" | "REJECTED";
    approvalReference?: string;
  }) {
    const updated = await prisma.accessRequest.update({
      where: { id: input.requestId },
      data: {
        status: input.decision,
        approverEmail: input.actorEmail,
        approvalReference: input.approvalReference,
        decidedAt: new Date()
      }
    });

    await this.auditLog.record({
      actorEmail: input.actorEmail,
      actionType: `RESTRICTED_ACCESS_${input.decision}`,
      result: "SUCCESS",
      approvalReference: input.approvalReference,
      metadata: { requestId: input.requestId }
    });

    return updated;
  }
}
