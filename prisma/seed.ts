import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const groupEmails = {
  driveAdmin: "grp-drive-admin@conceivable.life",
  qualityOwner: "grp-quality-owner@conceivable.life",
  qualityEditor: "grp-quality-editor@conceivable.life",
  strategicOwner: "grp-strategic-owner@conceivable.life",
  strategicEditor: "grp-strategic-editor@conceivable.life",
  operationalOwner: "grp-operational-owner@conceivable.life",
  operationalContributor: "grp-operational-contributor@conceivable.life",
  supportOwner: "grp-support-owner@conceivable.life",
  hr: "grp-hr@conceivable.life",
  finance: "grp-finance@conceivable.life",
  legal: "grp-legal@conceivable.life",
  it: "grp-it@conceivable.life",
  allEmployees: "grp-all-employees@conceivable.life",
  auditors: "grp-auditors@conceivable.life"
} as const;

const legacyGroupAliases = {
  "grp-drive-admin": groupEmails.driveAdmin,
  "grp-quality-owner": groupEmails.qualityOwner,
  "grp-quality-editor": groupEmails.qualityEditor,
  "grp-strategic-owner": groupEmails.strategicOwner,
  "grp-strategic-editor": groupEmails.strategicEditor,
  "grp-operational-owner": groupEmails.operationalOwner,
  "grp-operational-contributor": groupEmails.operationalContributor,
  "grp-support-owner": groupEmails.supportOwner,
  "grp-hr": groupEmails.hr,
  "grp-finance": groupEmails.finance,
  "grp-legal": groupEmails.legal,
  "grp-it": groupEmails.it,
  "grp-all-employees": groupEmails.allEmployees,
  "grp-auditors": groupEmails.auditors
} as const;

async function main() {
  const demoEmails = ["ana@company.com", "miguel@company.com", "lucia@company.com"] as const;

  const roles = [
    { name: "SUPER_ADMIN", description: "Full platform administration." },
    {
      name: "ACCESS_ADMIN",
      description: "Legacy broad admin role. Keep only for compatibility; use drive-specific admin roles for new assignments."
    },
    { name: "QMS_ACCESS_ADMIN", description: "Manages RBAC group membership for 01_QualityAssurance_Working." },
    { name: "STRATEGIC_ACCESS_ADMIN", description: "Manages RBAC group membership for 02_Strategic_Working." },
    { name: "OPERATIONAL_ACCESS_ADMIN", description: "Manages RBAC group membership for 03_Operational_Working." },
    { name: "SUPPORT_ACCESS_ADMIN", description: "Manages RBAC group membership for 04_Support_Working." },
    { name: "REVIEWER", description: "Performs quarterly access reviews." },
    { name: "READ_ONLY_AUDITOR", description: "Reads evidence and reports without modifying access." }
  ] as const;

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: role
    });
  }

  const accessRoles = [
    {
      code: "DIRECTOR_OF_QUALITY",
      displayName: "Director of Quality",
      department: "QMS",
      restrictedAccessMode: "STANDARD",
      description: "Senior quality governance role with owner-level QMS coverage."
    },
    {
      code: "QUALITY_MANAGER",
      displayName: "Quality Manager",
      department: "QMS",
      restrictedAccessMode: "POLICY_REVIEW",
      description: "Owner-level quality role with governance access under active policy review."
    },
    {
      code: "QUALITY_CONTROL_SPECIALIST",
      displayName: "Quality Control Specialist",
      department: "QMS",
      restrictedAccessMode: "EXCEPTION_FIRST",
      description: "Standard QMS editor without default governance branch access."
    },
    {
      code: "CONFIGURATION_MANAGER",
      displayName: "Configuration Manager",
      department: "QMS",
      restrictedAccessMode: "STANDARD",
      description: "QMS owner with default governance-heavy work in controlled branches."
    },
    {
      code: "PRODUCT_MANAGER",
      displayName: "Product Manager",
      department: "Strategic",
      restrictedAccessMode: "NONE",
      description: "Strategic planning and portfolio collaboration role."
    },
    {
      code: "DIRECTOR_OF_PRODUCT",
      displayName: "Director of Product",
      department: "Strategic",
      restrictedAccessMode: "NONE",
      description: "Owner-level strategic role for roadmap and decision artifacts."
    },
    {
      code: "VP_OF_PRODUCT",
      displayName: "VP of Product",
      department: "Strategic",
      restrictedAccessMode: "NONE",
      description: "Senior strategic owner role for portfolio and product direction."
    },
    {
      code: "TECH_PROJECT_MANAGER",
      displayName: "Tech Project Manager",
      department: "Cross-drive",
      restrictedAccessMode: "NONE",
      description: "Cross-functional delivery role spanning strategic and operational work."
    },
    {
      code: "DIRECTOR_OF_OPERATIONS",
      displayName: "Director of Operations",
      department: "Cross-drive",
      restrictedAccessMode: "EXCEPTION_FIRST",
      description: "Cross-drive operations leader spanning support and operational execution."
    },
    {
      code: "RESEARCH_VP",
      displayName: "Research VP",
      department: "Operational",
      restrictedAccessMode: "NONE",
      description: "R&D leadership role in the operational working environment."
    },
    {
      code: "RESEARCH_LEAD",
      displayName: "Research Lead",
      department: "Operational",
      restrictedAccessMode: "NONE",
      description: "Owner-level research role for planning and execution artifacts."
    },
    {
      code: "RESEARCH_ENGINEER",
      displayName: "Research Engineer",
      department: "Operational",
      restrictedAccessMode: "NONE",
      description: "Standard R&D contributor role in operational work."
    },
    {
      code: "INSTRUMENT_TECHNICAL_LEAD",
      displayName: "Instrument Technical Lead",
      department: "Operational",
      restrictedAccessMode: "NONE",
      description: "Lifecycle owner role for instrument delivery and engineering control."
    },
    {
      code: "SOFTWARE_DEVELOPER",
      displayName: "Software Developer",
      department: "Operational",
      restrictedAccessMode: "NONE",
      description: "Standard engineering contributor in the operational working directory."
    },
    {
      code: "SOFTWARE_ARCHITECT",
      displayName: "Software Architect",
      department: "Operational",
      restrictedAccessMode: "NONE",
      description: "Owner-level technical governance role within operational engineering."
    },
    {
      code: "HEAD_OF_ADVANCED_OPTICS",
      displayName: "Head of Advanced Optics",
      department: "Operational",
      restrictedAccessMode: "NONE",
      description: "Domain lead for optics work inside the operational drive."
    },
    {
      code: "HEAD_OF_CV_ML",
      displayName: "Head of CV/ML",
      department: "Operational",
      restrictedAccessMode: "NONE",
      description: "Domain lead for computer vision and machine learning work."
    },
    {
      code: "MECHATRONICS_DIRECTOR",
      displayName: "Mechatronics Director",
      department: "Operational",
      restrictedAccessMode: "NONE",
      description: "Owner-level mechatronics leadership role."
    },
    {
      code: "MECHATRONICS_ENGINEER",
      displayName: "Mechatronics Engineer",
      department: "Operational",
      restrictedAccessMode: "NONE",
      description: "Standard mechatronics contributor role."
    },
    {
      code: "MECHATRONICS_ENGINEER_RD",
      displayName: "Mechatronics Engineer R&D",
      department: "Operational",
      restrictedAccessMode: "NONE",
      description: "R&D mechatronics contributor role."
    },
    {
      code: "SYSTEMS_ENGINEER_LEAD",
      displayName: "Systems Engineer Lead",
      department: "Operational",
      restrictedAccessMode: "NONE",
      description: "Owner-level systems engineering governance role."
    },
    {
      code: "SYSTEMS_ENGINEER",
      displayName: "Systems Engineer",
      department: "Operational",
      restrictedAccessMode: "NONE",
      description: "Standard systems engineering contributor role."
    },
    {
      code: "TEST_ENGINEER",
      displayName: "Test Engineer",
      department: "Operational",
      restrictedAccessMode: "NONE",
      description: "Standard test and verification contributor role."
    },
    {
      code: "HEAD_OF_TESTING",
      displayName: "Head of Testing",
      department: "Operational",
      restrictedAccessMode: "NONE",
      description: "Owner-level testing leadership role."
    },
    {
      code: "DEPLOYMENT_ENGINEER",
      displayName: "Deployment Engineer",
      department: "Operational",
      restrictedAccessMode: "NONE",
      description: "Operational contributor for deployment and rollout work."
    },
    {
      code: "FULLSTACK_DEV_ENGINEER",
      displayName: "Fullstack Dev. Eng.",
      department: "Operational",
      restrictedAccessMode: "NONE",
      description: "Software contributor role for fullstack engineering."
    },
    {
      code: "COMPUTER_VISION_ENGINEER",
      displayName: "Computer Vision Eng.",
      department: "Operational",
      restrictedAccessMode: "NONE",
      description: "Computer vision contributor role."
    },
    {
      code: "ROBOTICS_ENGINEER",
      displayName: "Robotics Eng.",
      department: "Operational",
      restrictedAccessMode: "NONE",
      description: "Robotics contributor role."
    },
    {
      code: "DIGITAL_MANUFACTURING_ENGINEER",
      displayName: "Digital Manufacturing Eng.",
      department: "Operational",
      restrictedAccessMode: "NONE",
      description: "Digital manufacturing contributor role."
    },
    {
      code: "EXPERIMENTAL_BIOLOGIST",
      displayName: "Experimental Biologist",
      department: "Operational",
      restrictedAccessMode: "NONE",
      description: "Scientific contributor role in operational work."
    },
    {
      code: "CLINICAL_PROJECT_MANAGER",
      displayName: "Clinical Project Manager",
      department: "Operational",
      restrictedAccessMode: "EXCEPTION_FIRST",
      description: "Owner-level clinical operations role aligned to Operational working."
    },
    {
      code: "CLINICAL_SUPPORT",
      displayName: "Clinical Support",
      department: "Operational",
      restrictedAccessMode: "EXCEPTION_FIRST",
      description: "Clinical operations contributor aligned to Operational working, not Support."
    },
    {
      code: "AURA_LINE_MANAGER",
      displayName: "AURA Line Manager",
      department: "Operational",
      restrictedAccessMode: "NONE",
      description: "LabOps contributor inside the Operational working structure."
    },
    {
      code: "HR_DIRECTOR",
      displayName: "HR Director",
      department: "Support",
      restrictedAccessMode: "STANDARD",
      description: "Support role with default access to Human Resources restricted materials."
    },
    {
      code: "OFFICE_MANAGER_PR",
      displayName: "Office Manager and PR",
      department: "Support",
      restrictedAccessMode: "EXCEPTION_FIRST",
      description: "Support contributor role covering office coordination and communications work."
    },
    {
      code: "FINANCE_MANAGER",
      displayName: "Finance Manager",
      department: "Support",
      restrictedAccessMode: "STANDARD",
      description: "Support role with standard finance restricted-folder access."
    },
    {
      code: "LEGAL_MANAGER",
      displayName: "Legal Manager",
      department: "Support",
      restrictedAccessMode: "STANDARD",
      description: "Support role with standard legal restricted-folder access."
    },
    {
      code: "FACILITIES_PUBLIC_RELATIONS",
      displayName: "Facilities and Public Relations",
      department: "Support",
      restrictedAccessMode: "EXCEPTION_FIRST",
      description: "Support contributor role without default access to HR, Finance, or Legal branches."
    },
    {
      code: "COMMERCIAL_OPS",
      displayName: "Commercial Ops",
      department: "Support",
      restrictedAccessMode: "EXCEPTION_FIRST",
      description: "Support-aligned contributor role, pending a more specific support group if needed."
    },
    {
      code: "IT_SUPPORT",
      displayName: "IT Support",
      department: "Support",
      restrictedAccessMode: "EXCEPTION_FIRST",
      description: "IT contributor role without default HR, Finance, or Legal access."
    }
  ] as const;

  for (const accessRole of accessRoles) {
    await prisma.accessRole.upsert({
      where: { code: accessRole.code },
      update: {
        displayName: accessRole.displayName,
        department: accessRole.department,
        restrictedAccessMode: accessRole.restrictedAccessMode,
        description: accessRole.description
      },
      create: accessRole
    });
  }

  await prisma.sharedDrive.updateMany({
    where: { name: "01_QMS_Working" },
    data: { name: "01_QualityAssurance_Working" }
  });

  const drives = [
    "01_QualityAssurance_Working",
    "02_Strategic_Working",
    "03_Operational_Working",
    "04_Support_Working"
  ];

  for (const name of drives) {
    await prisma.sharedDrive.upsert({
      where: { name },
      update: {},
      create: { name }
    });
  }

  const restrictedFolders = [
    ["01_QualityAssurance_Working", "05_Audits", "01_QualityAssurance_Working / 05_Audits"],
    ["04_Support_Working", "01_HumanResources", "04_Support_Working / 01_HumanResources"],
    ["04_Support_Working", "05_Finance", "04_Support_Working / 05_Finance"],
    ["04_Support_Working", "06_Legal", "04_Support_Working / 06_Legal"]
  ] as const;

  const legacyRestrictedFolderPaths = [
    ["01_QMS_Working / 00_Quality / 08_QMS_Governance", "01_QualityAssurance_Working / 05_Audits"],
    ["01_QMS_Working / 08_QMS_Governance", "01_QualityAssurance_Working / 05_Audits"],
    ["04_Support_Working / 03_SupportProcesses / 01_HumanResources", "04_Support_Working / 01_HumanResources"],
    ["04_Support_Working / 03_SupportProcesses / 05_Finance", "04_Support_Working / 05_Finance"],
    ["04_Support_Working / 03_SupportProcesses / 06_Legal", "04_Support_Working / 06_Legal"]
  ] as const;

  for (const [legacyPath, currentPath] of legacyRestrictedFolderPaths) {
    await prisma.restrictedFolder.updateMany({
      where: { path: legacyPath },
      data: {
        path: currentPath,
        name: currentPath.endsWith("/ 05_Audits") ? "05_Audits" : undefined
      }
    });
  }

  for (const [driveName, name, path] of restrictedFolders) {
    const drive = await prisma.sharedDrive.findUniqueOrThrow({ where: { name: driveName } });
    await prisma.restrictedFolder.upsert({
      where: { path },
      update: {},
      create: {
        sharedDriveId: drive.id,
        name,
        path
      }
    });
  }

  const roleByName = {
    SUPER_ADMIN: await prisma.role.findUniqueOrThrow({ where: { name: "SUPER_ADMIN" } }),
    ACCESS_ADMIN: await prisma.role.findUniqueOrThrow({ where: { name: "ACCESS_ADMIN" } }),
    QMS_ACCESS_ADMIN: await prisma.role.findUniqueOrThrow({ where: { name: "QMS_ACCESS_ADMIN" } }),
    STRATEGIC_ACCESS_ADMIN: await prisma.role.findUniqueOrThrow({ where: { name: "STRATEGIC_ACCESS_ADMIN" } }),
    OPERATIONAL_ACCESS_ADMIN: await prisma.role.findUniqueOrThrow({ where: { name: "OPERATIONAL_ACCESS_ADMIN" } }),
    SUPPORT_ACCESS_ADMIN: await prisma.role.findUniqueOrThrow({ where: { name: "SUPPORT_ACCESS_ADMIN" } }),
    REVIEWER: await prisma.role.findUniqueOrThrow({ where: { name: "REVIEWER" } }),
    READ_ONLY_AUDITOR: await prisma.role.findUniqueOrThrow({ where: { name: "READ_ONLY_AUDITOR" } })
  };

  const accessRoleByCode = {
    DIRECTOR_OF_QUALITY: await prisma.accessRole.findUniqueOrThrow({ where: { code: "DIRECTOR_OF_QUALITY" } }),
    QUALITY_MANAGER: await prisma.accessRole.findUniqueOrThrow({ where: { code: "QUALITY_MANAGER" } }),
    QUALITY_CONTROL_SPECIALIST: await prisma.accessRole.findUniqueOrThrow({ where: { code: "QUALITY_CONTROL_SPECIALIST" } }),
    CONFIGURATION_MANAGER: await prisma.accessRole.findUniqueOrThrow({ where: { code: "CONFIGURATION_MANAGER" } }),
    PRODUCT_MANAGER: await prisma.accessRole.findUniqueOrThrow({ where: { code: "PRODUCT_MANAGER" } }),
    DIRECTOR_OF_PRODUCT: await prisma.accessRole.findUniqueOrThrow({ where: { code: "DIRECTOR_OF_PRODUCT" } }),
    VP_OF_PRODUCT: await prisma.accessRole.findUniqueOrThrow({ where: { code: "VP_OF_PRODUCT" } }),
    TECH_PROJECT_MANAGER: await prisma.accessRole.findUniqueOrThrow({ where: { code: "TECH_PROJECT_MANAGER" } }),
    DIRECTOR_OF_OPERATIONS: await prisma.accessRole.findUniqueOrThrow({ where: { code: "DIRECTOR_OF_OPERATIONS" } }),
    RESEARCH_VP: await prisma.accessRole.findUniqueOrThrow({ where: { code: "RESEARCH_VP" } }),
    RESEARCH_LEAD: await prisma.accessRole.findUniqueOrThrow({ where: { code: "RESEARCH_LEAD" } }),
    RESEARCH_ENGINEER: await prisma.accessRole.findUniqueOrThrow({ where: { code: "RESEARCH_ENGINEER" } }),
    INSTRUMENT_TECHNICAL_LEAD: await prisma.accessRole.findUniqueOrThrow({ where: { code: "INSTRUMENT_TECHNICAL_LEAD" } }),
    SOFTWARE_DEVELOPER: await prisma.accessRole.findUniqueOrThrow({ where: { code: "SOFTWARE_DEVELOPER" } }),
    SOFTWARE_ARCHITECT: await prisma.accessRole.findUniqueOrThrow({ where: { code: "SOFTWARE_ARCHITECT" } }),
    HEAD_OF_ADVANCED_OPTICS: await prisma.accessRole.findUniqueOrThrow({ where: { code: "HEAD_OF_ADVANCED_OPTICS" } }),
    HEAD_OF_CV_ML: await prisma.accessRole.findUniqueOrThrow({ where: { code: "HEAD_OF_CV_ML" } }),
    MECHATRONICS_DIRECTOR: await prisma.accessRole.findUniqueOrThrow({ where: { code: "MECHATRONICS_DIRECTOR" } }),
    MECHATRONICS_ENGINEER: await prisma.accessRole.findUniqueOrThrow({ where: { code: "MECHATRONICS_ENGINEER" } }),
    MECHATRONICS_ENGINEER_RD: await prisma.accessRole.findUniqueOrThrow({ where: { code: "MECHATRONICS_ENGINEER_RD" } }),
    SYSTEMS_ENGINEER_LEAD: await prisma.accessRole.findUniqueOrThrow({ where: { code: "SYSTEMS_ENGINEER_LEAD" } }),
    SYSTEMS_ENGINEER: await prisma.accessRole.findUniqueOrThrow({ where: { code: "SYSTEMS_ENGINEER" } }),
    TEST_ENGINEER: await prisma.accessRole.findUniqueOrThrow({ where: { code: "TEST_ENGINEER" } }),
    HEAD_OF_TESTING: await prisma.accessRole.findUniqueOrThrow({ where: { code: "HEAD_OF_TESTING" } }),
    DEPLOYMENT_ENGINEER: await prisma.accessRole.findUniqueOrThrow({ where: { code: "DEPLOYMENT_ENGINEER" } }),
    FULLSTACK_DEV_ENGINEER: await prisma.accessRole.findUniqueOrThrow({ where: { code: "FULLSTACK_DEV_ENGINEER" } }),
    COMPUTER_VISION_ENGINEER: await prisma.accessRole.findUniqueOrThrow({ where: { code: "COMPUTER_VISION_ENGINEER" } }),
    ROBOTICS_ENGINEER: await prisma.accessRole.findUniqueOrThrow({ where: { code: "ROBOTICS_ENGINEER" } }),
    DIGITAL_MANUFACTURING_ENGINEER: await prisma.accessRole.findUniqueOrThrow({ where: { code: "DIGITAL_MANUFACTURING_ENGINEER" } }),
    EXPERIMENTAL_BIOLOGIST: await prisma.accessRole.findUniqueOrThrow({ where: { code: "EXPERIMENTAL_BIOLOGIST" } }),
    CLINICAL_PROJECT_MANAGER: await prisma.accessRole.findUniqueOrThrow({ where: { code: "CLINICAL_PROJECT_MANAGER" } }),
    CLINICAL_SUPPORT: await prisma.accessRole.findUniqueOrThrow({ where: { code: "CLINICAL_SUPPORT" } }),
    AURA_LINE_MANAGER: await prisma.accessRole.findUniqueOrThrow({ where: { code: "AURA_LINE_MANAGER" } }),
    HR_DIRECTOR: await prisma.accessRole.findUniqueOrThrow({ where: { code: "HR_DIRECTOR" } }),
    OFFICE_MANAGER_PR: await prisma.accessRole.findUniqueOrThrow({ where: { code: "OFFICE_MANAGER_PR" } }),
    FINANCE_MANAGER: await prisma.accessRole.findUniqueOrThrow({ where: { code: "FINANCE_MANAGER" } }),
    LEGAL_MANAGER: await prisma.accessRole.findUniqueOrThrow({ where: { code: "LEGAL_MANAGER" } }),
    FACILITIES_PUBLIC_RELATIONS: await prisma.accessRole.findUniqueOrThrow({ where: { code: "FACILITIES_PUBLIC_RELATIONS" } }),
    COMMERCIAL_OPS: await prisma.accessRole.findUniqueOrThrow({ where: { code: "COMMERCIAL_OPS" } }),
    IT_SUPPORT: await prisma.accessRole.findUniqueOrThrow({ where: { code: "IT_SUPPORT" } })
  };

  await prisma.groupMapping.deleteMany({
    where: {
      roleId: roleByName.ACCESS_ADMIN.id
    }
  });

  const driveByName = {
    qms: await prisma.sharedDrive.findUniqueOrThrow({ where: { name: "01_QualityAssurance_Working" } }),
    strategic: await prisma.sharedDrive.findUniqueOrThrow({ where: { name: "02_Strategic_Working" } }),
    operational: await prisma.sharedDrive.findUniqueOrThrow({ where: { name: "03_Operational_Working" } }),
    support: await prisma.sharedDrive.findUniqueOrThrow({ where: { name: "04_Support_Working" } })
  };

  const restrictedByPath = {
    qmsGovernance: await prisma.restrictedFolder.findUniqueOrThrow({
      where: { path: "01_QualityAssurance_Working / 05_Audits" }
    }),
    hr: await prisma.restrictedFolder.findUniqueOrThrow({
      where: { path: "04_Support_Working / 01_HumanResources" }
    }),
    finance: await prisma.restrictedFolder.findUniqueOrThrow({
      where: { path: "04_Support_Working / 05_Finance" }
    }),
    legal: await prisma.restrictedFolder.findUniqueOrThrow({
      where: { path: "04_Support_Working / 06_Legal" }
    })
  };

  for (const [legacyAlias, realEmail] of Object.entries(legacyGroupAliases)) {
    await prisma.groupMapping.updateMany({
      where: { groupEmail: legacyAlias },
      data: { groupEmail: realEmail }
    });

    await prisma.folderOwnership.updateMany({
      where: { responsibleGroupEmail: legacyAlias },
      data: { responsibleGroupEmail: realEmail }
    });

    await prisma.accessReviewItem.updateMany({
      where: { groupEmail: legacyAlias },
      data: { groupEmail: realEmail }
    });
  }

  const mappings = [
    {
      groupEmail: groupEmails.driveAdmin,
      roleId: roleByName.SUPER_ADMIN.id,
      sharedDriveId: driveByName.qms.id,
      accessLevel: "MANAGER"
    },
    {
      groupEmail: groupEmails.driveAdmin,
      roleId: roleByName.SUPER_ADMIN.id,
      sharedDriveId: driveByName.strategic.id,
      accessLevel: "MANAGER"
    },
    {
      groupEmail: groupEmails.driveAdmin,
      roleId: roleByName.SUPER_ADMIN.id,
      sharedDriveId: driveByName.operational.id,
      accessLevel: "MANAGER"
    },
    {
      groupEmail: groupEmails.driveAdmin,
      roleId: roleByName.SUPER_ADMIN.id,
      sharedDriveId: driveByName.support.id,
      accessLevel: "MANAGER"
    },
    {
      groupEmail: groupEmails.qualityOwner,
      roleId: roleByName.QMS_ACCESS_ADMIN.id,
      sharedDriveId: driveByName.qms.id,
      accessLevel: "CONTENT_MANAGER"
    },
    {
      groupEmail: groupEmails.qualityEditor,
      roleId: roleByName.QMS_ACCESS_ADMIN.id,
      sharedDriveId: driveByName.qms.id,
      accessLevel: "CONTRIBUTOR"
    },
    {
      groupEmail: groupEmails.strategicOwner,
      roleId: roleByName.STRATEGIC_ACCESS_ADMIN.id,
      sharedDriveId: driveByName.strategic.id,
      accessLevel: "CONTENT_MANAGER"
    },
    {
      groupEmail: groupEmails.strategicEditor,
      roleId: roleByName.STRATEGIC_ACCESS_ADMIN.id,
      sharedDriveId: driveByName.strategic.id,
      accessLevel: "CONTRIBUTOR"
    },
    {
      groupEmail: groupEmails.operationalOwner,
      roleId: roleByName.OPERATIONAL_ACCESS_ADMIN.id,
      sharedDriveId: driveByName.operational.id,
      accessLevel: "CONTENT_MANAGER"
    },
    {
      groupEmail: groupEmails.operationalContributor,
      roleId: roleByName.OPERATIONAL_ACCESS_ADMIN.id,
      sharedDriveId: driveByName.operational.id,
      accessLevel: "CONTRIBUTOR"
    },
    {
      groupEmail: groupEmails.supportOwner,
      roleId: roleByName.SUPPORT_ACCESS_ADMIN.id,
      sharedDriveId: driveByName.support.id,
      accessLevel: "CONTENT_MANAGER"
    },
    {
      groupEmail: groupEmails.allEmployees,
      roleId: roleByName.READ_ONLY_AUDITOR.id,
      sharedDriveId: driveByName.qms.id,
      accessLevel: "VIEWER"
    },
    {
      groupEmail: groupEmails.qualityOwner,
      roleId: roleByName.QMS_ACCESS_ADMIN.id,
      sharedDriveId: driveByName.qms.id,
      restrictedFolderId: restrictedByPath.qmsGovernance.id,
      accessLevel: "RESTRICTED"
    },
    {
      groupEmail: groupEmails.hr,
      roleId: roleByName.SUPPORT_ACCESS_ADMIN.id,
      sharedDriveId: driveByName.support.id,
      restrictedFolderId: restrictedByPath.hr.id,
      accessLevel: "RESTRICTED"
    },
    {
      groupEmail: groupEmails.finance,
      roleId: roleByName.SUPPORT_ACCESS_ADMIN.id,
      sharedDriveId: driveByName.support.id,
      restrictedFolderId: restrictedByPath.finance.id,
      accessLevel: "RESTRICTED"
    },
    {
      groupEmail: groupEmails.legal,
      roleId: roleByName.SUPPORT_ACCESS_ADMIN.id,
      sharedDriveId: driveByName.support.id,
      restrictedFolderId: restrictedByPath.legal.id,
      accessLevel: "RESTRICTED"
    }
  ];

  for (const mapping of mappings) {
    const existing = await prisma.groupMapping.findFirst({
      where: {
        roleId: mapping.roleId,
        sharedDriveId: mapping.sharedDriveId,
        restrictedFolderId: mapping.restrictedFolderId ?? null,
        groupEmail: mapping.groupEmail
      }
    });

    if (existing) {
      await prisma.groupMapping.update({
        where: { id: existing.id },
        data: {
          accessLevel: mapping.accessLevel,
          restrictedFolderId: mapping.restrictedFolderId
        }
      });
      continue;
    }

    await prisma.groupMapping.create({
      data: mapping
    });
  }

  const accessRoleMappings = [
    [accessRoleByCode.DIRECTOR_OF_QUALITY.id, driveByName.qms.id, null, groupEmails.qualityOwner, "CONTENT_MANAGER"],
    [accessRoleByCode.DIRECTOR_OF_QUALITY.id, driveByName.qms.id, restrictedByPath.qmsGovernance.id, groupEmails.qualityOwner, "RESTRICTED"],
    [accessRoleByCode.QUALITY_MANAGER.id, driveByName.qms.id, null, groupEmails.qualityOwner, "CONTENT_MANAGER"],
    [accessRoleByCode.QUALITY_MANAGER.id, driveByName.qms.id, restrictedByPath.qmsGovernance.id, groupEmails.qualityOwner, "RESTRICTED"],
    [accessRoleByCode.QUALITY_CONTROL_SPECIALIST.id, driveByName.qms.id, null, groupEmails.qualityEditor, "CONTRIBUTOR"],
    [accessRoleByCode.CONFIGURATION_MANAGER.id, driveByName.qms.id, null, groupEmails.qualityOwner, "CONTENT_MANAGER"],
    [accessRoleByCode.CONFIGURATION_MANAGER.id, driveByName.qms.id, restrictedByPath.qmsGovernance.id, groupEmails.qualityOwner, "RESTRICTED"],
    [accessRoleByCode.PRODUCT_MANAGER.id, driveByName.strategic.id, null, groupEmails.strategicEditor, "CONTRIBUTOR"],
    [accessRoleByCode.DIRECTOR_OF_PRODUCT.id, driveByName.strategic.id, null, groupEmails.strategicOwner, "CONTENT_MANAGER"],
    [accessRoleByCode.VP_OF_PRODUCT.id, driveByName.strategic.id, null, groupEmails.strategicOwner, "CONTENT_MANAGER"],
    [accessRoleByCode.TECH_PROJECT_MANAGER.id, driveByName.strategic.id, null, groupEmails.strategicEditor, "CONTRIBUTOR"],
    [accessRoleByCode.TECH_PROJECT_MANAGER.id, driveByName.operational.id, null, groupEmails.operationalContributor, "CONTRIBUTOR"],
    [accessRoleByCode.DIRECTOR_OF_OPERATIONS.id, driveByName.operational.id, null, groupEmails.operationalOwner, "CONTENT_MANAGER"],
    [accessRoleByCode.DIRECTOR_OF_OPERATIONS.id, driveByName.support.id, null, groupEmails.supportOwner, "CONTENT_MANAGER"],
    [accessRoleByCode.RESEARCH_VP.id, driveByName.operational.id, null, groupEmails.operationalOwner, "CONTENT_MANAGER"],
    [accessRoleByCode.RESEARCH_LEAD.id, driveByName.operational.id, null, groupEmails.operationalOwner, "CONTENT_MANAGER"],
    [accessRoleByCode.RESEARCH_ENGINEER.id, driveByName.operational.id, null, groupEmails.operationalContributor, "CONTRIBUTOR"],
    [accessRoleByCode.INSTRUMENT_TECHNICAL_LEAD.id, driveByName.operational.id, null, groupEmails.operationalOwner, "CONTENT_MANAGER"],
    [accessRoleByCode.SOFTWARE_DEVELOPER.id, driveByName.operational.id, null, groupEmails.operationalContributor, "CONTRIBUTOR"],
    [accessRoleByCode.SOFTWARE_ARCHITECT.id, driveByName.operational.id, null, groupEmails.operationalOwner, "CONTENT_MANAGER"],
    [accessRoleByCode.HEAD_OF_ADVANCED_OPTICS.id, driveByName.operational.id, null, groupEmails.operationalContributor, "CONTRIBUTOR"],
    [accessRoleByCode.HEAD_OF_CV_ML.id, driveByName.operational.id, null, groupEmails.operationalContributor, "CONTRIBUTOR"],
    [accessRoleByCode.MECHATRONICS_DIRECTOR.id, driveByName.operational.id, null, groupEmails.operationalOwner, "CONTENT_MANAGER"],
    [accessRoleByCode.MECHATRONICS_ENGINEER.id, driveByName.operational.id, null, groupEmails.operationalContributor, "CONTRIBUTOR"],
    [accessRoleByCode.MECHATRONICS_ENGINEER_RD.id, driveByName.operational.id, null, groupEmails.operationalContributor, "CONTRIBUTOR"],
    [accessRoleByCode.SYSTEMS_ENGINEER_LEAD.id, driveByName.operational.id, null, groupEmails.operationalOwner, "CONTENT_MANAGER"],
    [accessRoleByCode.SYSTEMS_ENGINEER.id, driveByName.operational.id, null, groupEmails.operationalContributor, "CONTRIBUTOR"],
    [accessRoleByCode.TEST_ENGINEER.id, driveByName.operational.id, null, groupEmails.operationalContributor, "CONTRIBUTOR"],
    [accessRoleByCode.HEAD_OF_TESTING.id, driveByName.operational.id, null, groupEmails.operationalOwner, "CONTENT_MANAGER"],
    [accessRoleByCode.DEPLOYMENT_ENGINEER.id, driveByName.operational.id, null, groupEmails.operationalContributor, "CONTRIBUTOR"],
    [accessRoleByCode.FULLSTACK_DEV_ENGINEER.id, driveByName.operational.id, null, groupEmails.operationalContributor, "CONTRIBUTOR"],
    [accessRoleByCode.COMPUTER_VISION_ENGINEER.id, driveByName.operational.id, null, groupEmails.operationalContributor, "CONTRIBUTOR"],
    [accessRoleByCode.ROBOTICS_ENGINEER.id, driveByName.operational.id, null, groupEmails.operationalContributor, "CONTRIBUTOR"],
    [accessRoleByCode.DIGITAL_MANUFACTURING_ENGINEER.id, driveByName.operational.id, null, groupEmails.operationalContributor, "CONTRIBUTOR"],
    [accessRoleByCode.EXPERIMENTAL_BIOLOGIST.id, driveByName.operational.id, null, groupEmails.operationalContributor, "CONTRIBUTOR"],
    [accessRoleByCode.CLINICAL_PROJECT_MANAGER.id, driveByName.operational.id, null, groupEmails.operationalOwner, "CONTENT_MANAGER"],
    [accessRoleByCode.CLINICAL_SUPPORT.id, driveByName.operational.id, null, groupEmails.operationalContributor, "CONTRIBUTOR"],
    [accessRoleByCode.AURA_LINE_MANAGER.id, driveByName.operational.id, null, groupEmails.operationalContributor, "CONTRIBUTOR"],
    [accessRoleByCode.HR_DIRECTOR.id, driveByName.support.id, null, groupEmails.hr, "CONTENT_MANAGER"],
    [accessRoleByCode.HR_DIRECTOR.id, driveByName.support.id, restrictedByPath.hr.id, groupEmails.hr, "RESTRICTED"],
    [accessRoleByCode.OFFICE_MANAGER_PR.id, driveByName.support.id, null, groupEmails.supportOwner, "CONTRIBUTOR"],
    [accessRoleByCode.FINANCE_MANAGER.id, driveByName.support.id, null, groupEmails.finance, "CONTENT_MANAGER"],
    [accessRoleByCode.FINANCE_MANAGER.id, driveByName.support.id, restrictedByPath.finance.id, groupEmails.finance, "RESTRICTED"],
    [accessRoleByCode.LEGAL_MANAGER.id, driveByName.support.id, null, groupEmails.legal, "CONTENT_MANAGER"],
    [accessRoleByCode.LEGAL_MANAGER.id, driveByName.support.id, restrictedByPath.legal.id, groupEmails.legal, "RESTRICTED"],
    [accessRoleByCode.FACILITIES_PUBLIC_RELATIONS.id, driveByName.support.id, null, groupEmails.supportOwner, "CONTRIBUTOR"],
    [accessRoleByCode.COMMERCIAL_OPS.id, driveByName.support.id, null, groupEmails.supportOwner, "CONTRIBUTOR"],
    [accessRoleByCode.IT_SUPPORT.id, driveByName.support.id, null, groupEmails.it, "CONTRIBUTOR"]
  ] as const;

  for (const [accessRoleId, sharedDriveId, restrictedFolderId, groupEmail, accessLevel] of accessRoleMappings) {
    const existing = await prisma.accessRoleMapping.findFirst({
      where: {
        accessRoleId,
        sharedDriveId,
        restrictedFolderId: restrictedFolderId ?? null,
        groupEmail
      }
    });

    if (existing) {
      await prisma.accessRoleMapping.update({
        where: { id: existing.id },
        data: {
          accessLevel,
          restrictedFolderId
        }
      });
      continue;
    }

    await prisma.accessRoleMapping.create({
      data: {
        accessRoleId,
        sharedDriveId,
        restrictedFolderId,
        groupEmail,
        accessLevel
      }
    });
  }

  const folderOwners = [
    [
      driveByName.qms.id,
      "00_Quality",
      "Configuration Management / Quality",
      "IT",
      groupEmails.qualityOwner
    ],
    [driveByName.strategic.id, "01_StrategicProcesses", "Process Owners", "IT", groupEmails.strategicOwner],
    [
      driveByName.operational.id,
      "02_OperationalProcesses",
      "Engineering / R&D Leads",
      "IT",
      groupEmails.operationalOwner
    ],
    [driveByName.support.id, "03_SupportProcesses", "Department Heads", "IT", groupEmails.supportOwner]
  ] as const;

  for (const [sharedDriveId, topFolder, functionalOwner, technicalOwner, responsibleGroupEmail] of folderOwners) {
    await prisma.folderOwnership.upsert({
      where: {
        sharedDriveId_topFolder: {
          sharedDriveId,
          topFolder
        }
      },
      update: {
        functionalOwner,
        technicalOwner,
        responsibleGroupEmail
      },
      create: {
        sharedDriveId,
        topFolder,
        functionalOwner,
        technicalOwner,
        responsibleGroupEmail
      }
    });
  }

  const demoUsers = await prisma.user.findMany({
    where: {
      email: { in: [...demoEmails] }
    },
    select: { id: true, email: true }
  });

  if (demoUsers.length > 0) {
    const demoUserIds = demoUsers.map((user) => user.id);

    await prisma.accessReviewItem.deleteMany({
      where: {
        OR: [
          { memberEmail: { in: [...demoEmails] } },
          { memberEmail: { in: demoUsers.map((user) => user.email) } }
        ]
      }
    });

    await prisma.accessRequest.deleteMany({
      where: {
        OR: [
          { userId: { in: demoUserIds } },
          { requestedByEmail: { in: [...demoEmails] } },
          { approverEmail: { in: [...demoEmails] } }
        ]
      }
    });

    await prisma.groupMembership.deleteMany({
      where: {
        userId: { in: demoUserIds }
      }
    });

    await prisma.userRole.deleteMany({
      where: {
        userId: { in: demoUserIds }
      }
    });

    await prisma.userAccessRole.deleteMany({
      where: {
        userId: { in: demoUserIds }
      }
    });

    await prisma.user.deleteMany({
      where: {
        id: { in: demoUserIds }
      }
    });
  }

  await prisma.accessReview.upsert({
    where: { id: "seed-q1-2026-review" },
    update: {
      name: "Q1 2026 Quarterly Access Review",
      quarterLabel: "Q1 2026",
      reviewerEmail: "rodrigo@conceivable.life",
      status: "OPEN",
      dueAt: new Date("2026-03-31T23:59:59.000Z")
    },
    create: {
      id: "seed-q1-2026-review",
      name: "Q1 2026 Quarterly Access Review",
      quarterLabel: "Q1 2026",
      reviewerEmail: "rodrigo@conceivable.life",
      status: "OPEN",
      dueAt: new Date("2026-03-31T23:59:59.000Z")
    }
  });

  const accessReview = await prisma.accessReview.findUniqueOrThrow({
    where: { id: "seed-q1-2026-review" }
  });

  const reviewSourceMemberships = await prisma.groupMembership.findMany({
    where: {
      revokedAt: null
    },
    include: {
      user: true,
      groupMapping: {
        include: {
          role: true
        }
      }
    }
  });

  for (const membership of reviewSourceMemberships) {
    if (!membership.groupMapping) {
      continue;
    }

    const reviewItemId = `review-${membership.id}`;
    await prisma.accessReviewItem.upsert({
      where: { id: reviewItemId },
      update: {
        groupMappingId: membership.groupMappingId,
        groupEmail: membership.groupMapping.groupEmail,
        memberName: membership.user.displayName,
        memberEmail: membership.user.email,
        roleLabel: membership.groupMapping.role.name
      },
      create: {
        id: reviewItemId,
        accessReviewId: accessReview.id,
        groupMappingId: membership.groupMappingId,
        groupEmail: membership.groupMapping.groupEmail,
        memberName: membership.user.displayName,
        memberEmail: membership.user.email,
        roleLabel: membership.groupMapping.role.name
      }
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
