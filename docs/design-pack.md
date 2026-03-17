# Design Pack

This design pack defines the MVP shape for Drive Access Console before deeper implementation work.

## Included artifacts

- Architecture: [architecture.md](/Users/rodrigocastro/00_casdev/00_git/13_DriveAccessControlGG/13_DriveAccessControlGG/docs/architecture.md)
- Database schema: [../prisma/schema.prisma](/Users/rodrigocastro/00_casdev/00_git/13_DriveAccessControlGG/13_DriveAccessControlGG/prisma/schema.prisma)
- Environment variables: [../.env.example](/Users/rodrigocastro/00_casdev/00_git/13_DriveAccessControlGG/13_DriveAccessControlGG/.env.example)
- UI screen map: [ui-screen-map.md](/Users/rodrigocastro/00_casdev/00_git/13_DriveAccessControlGG/13_DriveAccessControlGG/docs/ui-screen-map.md)
- MVP phased plan: [mvp-implementation-plan.md](/Users/rodrigocastro/00_casdev/00_git/13_DriveAccessControlGG/13_DriveAccessControlGG/docs/mvp-implementation-plan.md)
- Google API integration plan: [google-api-plan.md](/Users/rodrigocastro/00_casdev/00_git/13_DriveAccessControlGG/13_DriveAccessControlGG/docs/google-api-plan.md)
- Project structure: [project-structure.md](/Users/rodrigocastro/00_casdev/00_git/13_DriveAccessControlGG/13_DriveAccessControlGG/docs/project-structure.md)
- Mock mode: [mock-mode.md](/Users/rodrigocastro/00_casdev/00_git/13_DriveAccessControlGG/13_DriveAccessControlGG/docs/mock-mode.md)
- IT handover contract: [it-handover-contract.md](/Users/rodrigocastro/00_casdev/00_git/13_DriveAccessControlGG/13_DriveAccessControlGG/docs/it-handover-contract.md)

## Governing rule

The application is designed around:

`User -> Role -> Google Group -> Shared Drive access`

The database, workflows, and UI must preserve that model as the default operating path.

Direct user permissions are not part of normal access design.

Restricted-folder access is allowed only through explicit exception workflow with approval, date bounds, and full audit logging.

## MVP boundaries

Included in MVP:

- role assignment through mapped Google Groups
- user access visibility
- restricted-folder request workflow
- quarterly access reviews
- report generation and Google Drive archival
- Exploration and Engineering folder template creation

## Alignment to RBAC workbook

The current design has been adjusted against `/Users/rodrigocastro/Downloads/SharedDrive_RBAC_and_Audit_Matrix.xlsx`.

Key alignment decisions:

- `grp-drive-admin@conceivable.life` is treated as a cross-drive group, so the schema no longer assumes one unique mapping per group email
- `grp-all-employees@conceivable.life` is mapped to `01_QMS_Working` viewer access per the workbook
- restricted folder mappings follow the `Restricted_Folders` sheet exactly
- top-folder ownership from `Folder_Owners_Matrix` is represented explicitly through `FolderOwnership`
- access review rows now need fields compatible with the `Access_Review_Template` sheet

Deferred until after MVP:

- advanced notification workflows
- automated reconciliation jobs
- policy engine customization
- nonessential analytics
