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
  const roles = [
    { name: "SUPER_ADMIN", description: "Full platform administration." },
    {
      name: "ACCESS_ADMIN",
      description: "Legacy broad admin role. Keep only for compatibility; use drive-specific admin roles for new assignments."
    },
    { name: "QMS_ACCESS_ADMIN", description: "Manages RBAC group membership for 01_QMS_Working." },
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

  const drives = [
    "01_QMS_Working",
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
    ["01_QMS_Working", "08_QMS_Governance", "01_QMS_Working / 00_Quality / 08_QMS_Governance"],
    ["04_Support_Working", "01_HumanResources", "04_Support_Working / 03_SupportProcesses / 01_HumanResources"],
    ["04_Support_Working", "05_Finance", "04_Support_Working / 03_SupportProcesses / 05_Finance"],
    ["04_Support_Working", "06_Legal", "04_Support_Working / 03_SupportProcesses / 06_Legal"]
  ] as const;

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

  await prisma.groupMapping.deleteMany({
    where: {
      roleId: roleByName.ACCESS_ADMIN.id
    }
  });

  const driveByName = {
    qms: await prisma.sharedDrive.findUniqueOrThrow({ where: { name: "01_QMS_Working" } }),
    strategic: await prisma.sharedDrive.findUniqueOrThrow({ where: { name: "02_Strategic_Working" } }),
    operational: await prisma.sharedDrive.findUniqueOrThrow({ where: { name: "03_Operational_Working" } }),
    support: await prisma.sharedDrive.findUniqueOrThrow({ where: { name: "04_Support_Working" } })
  };

  const restrictedByPath = {
    qmsGovernance: await prisma.restrictedFolder.findUniqueOrThrow({
      where: { path: "01_QMS_Working / 00_Quality / 08_QMS_Governance" }
    }),
    hr: await prisma.restrictedFolder.findUniqueOrThrow({
      where: { path: "04_Support_Working / 03_SupportProcesses / 01_HumanResources" }
    }),
    finance: await prisma.restrictedFolder.findUniqueOrThrow({
      where: { path: "04_Support_Working / 03_SupportProcesses / 05_Finance" }
    }),
    legal: await prisma.restrictedFolder.findUniqueOrThrow({
      where: { path: "04_Support_Working / 03_SupportProcesses / 06_Legal" }
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

  const demoUsers = [
    ["ana@company.com", "Ana Quality"],
    ["miguel@company.com", "Miguel Operations"],
    ["lucia@company.com", "Lucia Auditor"]
  ] as const;

  const userIds: Record<string, string> = {};

  for (const [email, displayName] of demoUsers) {
    const user = await prisma.user.upsert({
      where: { email },
      update: { displayName },
      create: { email, displayName }
    });
    userIds[email] = user.id;
  }

  const mappingByKey = {
    qualityEditor: await prisma.groupMapping.findFirstOrThrow({
      where: {
        groupEmail: groupEmails.qualityEditor,
        sharedDriveId: driveByName.qms.id,
        restrictedFolderId: null
      }
    }),
    operationalContributor: await prisma.groupMapping.findFirstOrThrow({
      where: {
        groupEmail: groupEmails.operationalContributor,
        sharedDriveId: driveByName.operational.id,
        restrictedFolderId: null
      }
    }),
    auditors: await prisma.groupMapping.findFirstOrThrow({
      where: {
        groupEmail: groupEmails.allEmployees,
        sharedDriveId: driveByName.qms.id,
        restrictedFolderId: null
      }
    })
  };

  const memberships = [
    [userIds["ana@company.com"], mappingByKey.qualityEditor.id],
    [userIds["miguel@company.com"], mappingByKey.operationalContributor.id],
    [userIds["lucia@company.com"], mappingByKey.auditors.id]
  ] as const;

  for (const [userId, groupMappingId] of memberships) {
    await prisma.groupMembership.upsert({
      where: {
        userId_groupMappingId: {
          userId,
          groupMappingId
        }
      },
      update: {
        revokedAt: null,
        revokedReason: null
      },
      create: {
        userId,
        groupMappingId,
        source: "APP_MANAGED"
      }
    });
  }

  await prisma.accessRequest.upsert({
    where: { id: "seed-finance-exception" },
    update: {
      status: "APPROVED",
      approverEmail: "admin@example.com",
      approvalReference: "APR-2026-001",
      justification: "Quarterly finance evidence review"
    },
    create: {
      id: "seed-finance-exception",
      userId: userIds["lucia@company.com"],
      restrictedFolderId: restrictedByPath.finance.id,
      requestedByEmail: "reviewer@example.com",
      approverEmail: "admin@example.com",
      approvalReference: "APR-2026-001",
      justification: "Quarterly finance evidence review",
      status: "APPROVED",
      startDate: new Date("2026-01-05T00:00:00.000Z"),
      endDate: new Date("2026-03-31T23:59:59.000Z"),
      decidedAt: new Date("2026-01-06T00:00:00.000Z")
    }
  });

  await prisma.accessReview.upsert({
    where: { id: "seed-q1-2026-review" },
    update: {
      name: "Q1 2026 Quarterly Access Review",
      quarterLabel: "Q1 2026",
      reviewerEmail: "rodrigo@conceivable.life",
      status: "OPEN"
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
