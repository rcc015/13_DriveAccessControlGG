import { getDriveProvider } from "@/lib/google/provider-factory";
import type { DriveProvider } from "@/lib/google/types";
import { AuditLogService } from "@/lib/services/audit-log-service";
import type { FolderTemplateKind } from "@/types/domain";

type TemplateNode =
  | string
  | {
      name: string;
      children: readonly TemplateNode[];
    };

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
] as const satisfies readonly TemplateNode[];

const C_PLATFORM_SUBTREE = [
  "00_IntegrationSpecs",
  {
    name: "01_ProductIntegration",
    children: [
      "01_ICDs",
      "02_AssemblySOPs",
      "03_MfgChecklists",
      "04_IntegrationBuilds",
      "05_CableHarness"
    ]
  },
  {
    name: "02_Mechatronics",
    children: [
      "01_Requirements",
      "02_DesignCAD",
      "03_BOMs",
      "04_AssemblyInstructions",
      "05_Drawings",
      "07_MfgFiles"
    ]
  },
  {
    name: "03_Software",
    children: [
      "01_Requirements",
      "02_Architecture",
      "03_SourceCode",
      "04_Testing",
      "05_Risk",
      "06_Release"
    ]
  },
  {
    name: "04_Optics",
    children: [
      "01_Requirements",
      "02_Design",
      "03_Drawings",
      "04_Verification"
    ]
  },
  {
    name: "05_MachineLearning",
    children: [
      "00_Planning",
      "01_Requirements",
      "02_Datasets",
      "03_Training_Reproducibility",
      "04_Models",
      "05_Assessment"
    ]
  },
  {
    name: "06_Testing",
    children: [
      "01_UnitTesting",
      "02_IntegrationTesting",
      "03_SystemTesting",
      "04_TestResults"
    ]
  },
  {
    name: "07_Research",
    children: [
      "01_ClinicalProtocols",
      "02_Tests",
      "03_DataCollection"
    ]
  },
  {
    name: "08_AutomationProtocols",
    children: [
      "01_Definitions",
      "02_Logs",
      "03_Reports"
    ]
  },
  {
    name: "09_UserDocs",
    children: [
      "01_UserManual",
      "02_UserChecklists",
      "03_QuickRefGuides",
      "04_Labels"
    ]
  }
] as const satisfies readonly TemplateNode[];

const ENGINEERING_TREE = [
  "01_InstrumentTechnicalLead",
  "02_SystemsEngineering",
  "03_RiskManagement",
  "04_Regulatory",
  {
    name: "33_Subsystems",
    children: [
      { name: "03_C_DISH", children: C_PLATFORM_SUBTREE },
      { name: "04_C_SPERM", children: C_PLATFORM_SUBTREE },
      { name: "05_C_EGG", children: C_PLATFORM_SUBTREE },
      { name: "06_C_ICSI", children: C_PLATFORM_SUBTREE },
      { name: "07_C_HANDLER", children: C_PLATFORM_SUBTREE },
      { name: "09_C_CULTURE", children: C_PLATFORM_SUBTREE },
      { name: "13_C_ELN", children: C_PLATFORM_SUBTREE }
    ]
  },
  "90_Working_Directory",
  "95_Ready_For_Helix"
] as const satisfies readonly TemplateNode[];

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

  private async createTree(parentId: string, nodes: readonly TemplateNode[]) {
    for (const node of nodes) {
      if (typeof node === "string") {
        await this.drive.createFolder(parentId, node);
        continue;
      }

      const parent = await this.drive.createFolder(parentId, node.name);
      if (parent.id) {
        await this.createTree(parent.id, node.children);
      }
    }
  }
}
