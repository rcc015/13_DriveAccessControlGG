import { getDriveProvider } from "@/lib/google/provider-factory";
import type { DriveProvider } from "@/lib/google/types";
import { AuditLogService } from "@/lib/services/audit-log-service";
import type { FolderTemplateKind } from "@/types/domain";

const EXPLORATION_TREE = [
  "00_Project_Log",
  "01_Definition",
  {
    name: "02_Working_Directory",
    children: [
      "01_Optics",
      "02_MachineLearning",
      "03_Mechatronics",
      "04_Software",
      "05_Data",
      "06_General"
    ]
  },
  "03_Data_Evidence",
  "04_Media",
  "05_Engineering_Handoff"
] as const;

const ENGINEERING_TREE = [
  "01_InstrumentTechnicalLead",
  "02_SystemsEngineering",
  "03_RiskManagement",
  "04_Regulatory",
  "33_Subsystems",
  "90_Working_Directory",
  "95_Ready_For_Helix"
] as const;

export class FolderTemplateService {
  constructor(
    private drive: DriveProvider = getDriveProvider(),
    private auditLog = new AuditLogService()
  ) {}

  async createTemplate(input: {
    actorEmail: string;
    parentFolderPath: string;
    rootFolderName: string;
    template: FolderTemplateKind;
  }) {
    const parentFolder = await this.drive.resolveFolder(input.parentFolderPath);
    const parentFolderId = parentFolder.id ?? "";

    if (!parentFolderId) {
      throw new Error(`Google Drive did not return an id for base path ${input.parentFolderPath}.`);
    }

    const root = await this.drive.createFolder(parentFolderId, input.rootFolderName);
    const rootId = root.id ?? "";

    if (!rootId) {
      throw new Error("Google Drive did not return a folder id.");
    }

    const tree = input.template === "EXPLORATION" ? EXPLORATION_TREE : ENGINEERING_TREE;
    await this.createTree(rootId, tree);

    await this.auditLog.record({
      actorEmail: input.actorEmail,
      actionType: "FOLDER_TEMPLATE_CREATED",
      targetFolderPath: input.rootFolderName,
      result: "SUCCESS",
      notes: `${input.template} template created`,
      metadata: {
        basePath: input.parentFolderPath,
        rootFolderName: input.rootFolderName,
        createdFolderId: root.id ?? null,
        createdFolderUrl: root.webViewLink ?? null
      }
    });

    return root;
  }

  private async createTree(parentId: string, nodes: readonly (string | { name: string; children: readonly string[] })[]) {
    for (const node of nodes) {
      if (typeof node === "string") {
        await this.drive.createFolder(parentId, node);
        continue;
      }

      const parent = await this.drive.createFolder(parentId, node.name);
      if (parent.id) {
        for (const child of node.children) {
          await this.drive.createFolder(parent.id, child);
        }
      }
    }
  }
}
