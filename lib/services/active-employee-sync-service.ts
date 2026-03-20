import { AuditLogService } from "@/lib/services/audit-log-service";
import { getDirectoryProvider } from "@/lib/google/provider-factory";
import type { DirectoryProvider } from "@/lib/google/types";

const ALL_EMPLOYEES_GROUP = "grp-all-employees@conceivable.life";

export interface ActiveEmployeeSyncPreview {
  activeCount: number;
  currentMemberCount: number;
  addEmails: string[];
  removeEmails: string[];
}

export interface ActiveEmployeeSyncApplyResult extends ActiveEmployeeSyncPreview {
  added: string[];
  removed: string[];
}

export class ActiveEmployeeSyncService {
  constructor(
    private directory: DirectoryProvider = getDirectoryProvider(),
    private auditLog = new AuditLogService()
  ) {}

  async previewSync(): Promise<ActiveEmployeeSyncPreview> {
    const [activeUsers, currentMembers] = await Promise.all([
      this.directory.listActiveUsers(),
      this.directory.listGroupMembers(ALL_EMPLOYEES_GROUP)
    ]);

    const activeEmails = new Set(activeUsers.map((user) => user.primaryEmail.toLowerCase()));
    const currentEmails = new Set(currentMembers.map((member) => member.email.toLowerCase()));

    const addEmails = Array.from(activeEmails)
      .filter((email) => !currentEmails.has(email))
      .sort();

    const removeEmails = Array.from(currentEmails)
      .filter((email) => !activeEmails.has(email))
      .sort();

    return {
      activeCount: activeEmails.size,
      currentMemberCount: currentEmails.size,
      addEmails,
      removeEmails
    };
  }

  async applySync(actorEmail: string): Promise<ActiveEmployeeSyncApplyResult> {
    const preview = await this.previewSync();
    const added: string[] = [];
    const removed: string[] = [];

    await this.auditLog.record({
      actorEmail,
      actionType: "ACTIVE_EMPLOYEE_SYNC_STARTED",
      targetGroupEmail: ALL_EMPLOYEES_GROUP,
      result: "SUCCESS",
      notes: "Started active employee sync preview apply.",
      metadata: {
        activeCount: preview.activeCount,
        currentMemberCount: preview.currentMemberCount,
        addCount: preview.addEmails.length,
        removeCount: preview.removeEmails.length
      }
    });

    for (const email of preview.addEmails) {
      await this.directory.addGroupMember(ALL_EMPLOYEES_GROUP, email);
      added.push(email);

      await this.auditLog.record({
        actorEmail,
        actionType: "ACTIVE_EMPLOYEE_SYNC_ADD",
        targetUserEmail: email,
        targetGroupEmail: ALL_EMPLOYEES_GROUP,
        result: "SUCCESS",
        notes: `Added ${email} to ${ALL_EMPLOYEES_GROUP}.`
      });
    }

    for (const email of preview.removeEmails) {
      await this.directory.removeGroupMember(ALL_EMPLOYEES_GROUP, email);
      removed.push(email);

      await this.auditLog.record({
        actorEmail,
        actionType: "ACTIVE_EMPLOYEE_SYNC_REMOVE",
        targetUserEmail: email,
        targetGroupEmail: ALL_EMPLOYEES_GROUP,
        result: "SUCCESS",
        notes: `Removed ${email} from ${ALL_EMPLOYEES_GROUP}.`
      });
    }

    await this.auditLog.record({
      actorEmail,
      actionType: "ACTIVE_EMPLOYEE_SYNC_COMPLETED",
      targetGroupEmail: ALL_EMPLOYEES_GROUP,
      result: "SUCCESS",
      notes: "Completed active employee sync.",
      metadata: {
        added,
        removed
      }
    });

    return {
      ...preview,
      added,
      removed
    };
  }
}

export function getAllEmployeesGroupEmail() {
  return ALL_EMPLOYEES_GROUP;
}
