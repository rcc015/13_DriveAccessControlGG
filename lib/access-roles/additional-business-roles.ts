export const additionalBusinessAccessRoles = [
  {
    code: "CTO",
    displayName: "CTO",
    department: "Cross-drive",
    restrictedAccessMode: "EXCEPTION_FIRST",
    description:
      "Executive technical leadership role spanning strategic planning, operational engineering execution, and support oversight. Restricted folders remain exception-based."
  },
  {
    code: "SOFTWARE_DIRECTOR",
    displayName: "Software Director",
    department: "Software",
    restrictedAccessMode: "NONE",
    description: "Software leadership role spanning strategic software planning and operational software delivery."
  },
  {
    code: "SOFTWARE_INTEGRATOR",
    displayName: "Software Integrator",
    department: "Software",
    restrictedAccessMode: "NONE",
    description:
      "Operational software integration contributor role for build, integration, release preparation, and engineering execution workflows."
  },
  {
    code: "INFRASTRUCTURE_ENGINEER",
    displayName: "Infrastructure Engineer",
    department: "Infrastructure",
    restrictedAccessMode: "EXCEPTION_FIRST",
    description:
      "Infrastructure and platform engineering contributor role spanning operational systems and support tooling. Restricted support folders remain exception-based."
  },
  {
    code: "REQUIREMENTS_ENGINEER",
    displayName: "Requirements Engineer",
    department: "Requirements",
    restrictedAccessMode: "NONE",
    description:
      "Requirements engineering role spanning strategic requirements definition and operational engineering documentation and traceability."
  }
] as const;

export const additionalBusinessAccessRoleMappings = [
  {
    code: "CTO",
    driveName: "02_Strategic_Working",
    groupEmail: "grp-strategic-owner@conceivable.life",
    accessLevel: "CONTENT_MANAGER"
  },
  {
    code: "CTO",
    driveName: "03_Operational_Working",
    groupEmail: "grp-operational-owner@conceivable.life",
    accessLevel: "CONTENT_MANAGER"
  },
  {
    code: "CTO",
    driveName: "04_Support_Working",
    groupEmail: "grp-support-owner@conceivable.life",
    accessLevel: "CONTENT_MANAGER"
  },
  {
    code: "SOFTWARE_DIRECTOR",
    driveName: "02_Strategic_Working",
    groupEmail: "grp-strategic-editor@conceivable.life",
    accessLevel: "CONTRIBUTOR"
  },
  {
    code: "SOFTWARE_DIRECTOR",
    driveName: "03_Operational_Working",
    groupEmail: "grp-operational-owner@conceivable.life",
    accessLevel: "CONTENT_MANAGER"
  },
  {
    code: "SOFTWARE_INTEGRATOR",
    driveName: "03_Operational_Working",
    groupEmail: "grp-operational-contributor@conceivable.life",
    accessLevel: "CONTRIBUTOR"
  },
  {
    code: "INFRASTRUCTURE_ENGINEER",
    driveName: "03_Operational_Working",
    groupEmail: "grp-operational-contributor@conceivable.life",
    accessLevel: "CONTRIBUTOR"
  },
  {
    code: "INFRASTRUCTURE_ENGINEER",
    driveName: "04_Support_Working",
    groupEmail: "grp-it@conceivable.life",
    accessLevel: "CONTRIBUTOR"
  },
  {
    code: "REQUIREMENTS_ENGINEER",
    driveName: "02_Strategic_Working",
    groupEmail: "grp-strategic-editor@conceivable.life",
    accessLevel: "CONTRIBUTOR"
  },
  {
    code: "REQUIREMENTS_ENGINEER",
    driveName: "03_Operational_Working",
    groupEmail: "grp-operational-contributor@conceivable.life",
    accessLevel: "CONTRIBUTOR"
  }
] as const;

export const missingRecommendedBusinessAccessGroups = [
  {
    roleCode: "INFRASTRUCTURE_ENGINEER",
    recommendedGroupEmail: "grp-support-contributor@conceivable.life",
    fallbackGroupEmail: "grp-it@conceivable.life",
    reason:
      "The current group inventory does not include a dedicated support contributor group. The existing IT contributor group is the closest least-privilege support-side mapping."
  }
] as const;
