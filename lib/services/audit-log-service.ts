import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

interface AuditInput {
  actorEmail: string;
  actionType: string;
  targetUserEmail?: string;
  targetGroupEmail?: string;
  targetDriveName?: string;
  targetFolderPath?: string;
  approvalReference?: string;
  result: string;
  notes?: string;
  metadata?: Prisma.InputJsonValue;
}

export class AuditLogService {
  async record(input: AuditInput) {
    return prisma.auditLog.create({
      data: {
        actorEmail: input.actorEmail,
        actionType: input.actionType,
        targetUserEmail: input.targetUserEmail,
        targetGroupEmail: input.targetGroupEmail,
        targetDriveName: input.targetDriveName,
        targetFolderPath: input.targetFolderPath,
        approvalReference: input.approvalReference,
        result: input.result,
        notes: input.notes,
        metadataJson: input.metadata
      }
    });
  }
}
