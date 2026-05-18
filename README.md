# Drive Access Console

Internal web application for governing Google Workspace Shared Drive access through RBAC, restricted-folder exceptions, audit trails, and operational Google integrations.

## Purpose

Drive Access Console provides an internal control layer for the company working directory.

Primary control path:

`User -> App role / Business access role -> Google Group -> Shared Drive or restricted-folder access`

The system is designed to enforce:

- role-based access control
- least privilege
- exception-only restricted access
- auditable access mutations
- quarterly evidence-based access reviews
- Google Drive report archival

## Scope

This platform governs the operational working directory in Google Shared Drives.

It is not the authoritative controlled-document repository.

## Current functionality

### 1. Dashboard and governance overview

- KPI view for active memberships, approved restricted exceptions, and open quarterly review items
- Shared Drive coverage summary showing mapped Google Groups by drive
- Recent audit pulse for sensitive actions such as reconcile, access approvals, sync, cleanup, and template creation

### 2. User role assignment

- Search synced active employees from the local directory cache
- Assign and revoke internal app roles
- Assign and revoke business access roles
- Preview role impact before assignment
- Preview role-to-drive coverage and mapped Google Groups
- Inspect current app role assignments, business role assignments, and active derived memberships
- View local directory sync status and sync health messaging

### 3. Effective access viewer

- Lookup a specific user
- View app roles and business access roles
- View current Google Group memberships
- View inherited Shared Drive access
- View approved restricted-folder grants
- Review a consolidated effective-access summary

### 4. Restricted access request workflow

- Submit restricted-folder exception requests
- Store business justification, approver reference, start/end dates, and audit trail
- Admin approval and rejection workflow from the portal
- Separate visibility for requester-only vs admin review views
- Track requested, approved, rejected, expiring, and expired exceptions

### 5. Quarterly access reviews

- Create or reopen quarterly review campaigns
- Review group/member access line items
- Record `KEEP`, `REVOKE`, `NEEDS_REVIEW`, or pending decisions
- Filter by quarter, status, decision, reviewer, user, role, and group
- Preserve review metadata and reviewer evidence
- Feed reviewed data into quarterly reporting exports

### 6. Reports and evidence archival

- Generate and track:
  - Group Membership Snapshot
  - Quarterly Access Review
  - Restricted Access Exceptions
  - Permission Matrix
  - Access & Reconcile Change Log
- Persist local report metadata, timestamps, generator identity, Google Drive file ID, and URL
- Archive reports into Google Drive quarter folders
- Provide an automation entrypoint for quarterly report generation with `npm run reports:quarterly:auto`

### 7. Role matrix and policy modeling

- View the current admin role matrix by Shared Drive and restricted folder
- View the current business access role matrix by Shared Drive and restricted folder
- Filter matrix by drive, role family, catalog, and search query
- Create, update, and delete role mappings
- Manage non-restricted Shared Drive mappings through the inline editor flow
- Review restricted-folder mappings separately with clear policy visibility

### 8. Google Workspace integration verification

- Validate live vs mock integration mode
- Probe delegated Directory API user search
- Probe managed Google Group member visibility
- Inspect current members of RBAC-managed Google Groups
- Verify service account, impersonated admin, and reports folder configuration

### 9. Active employee sync

- Preview adds and removals for the all-employees managed group
- Apply sync from Google Directory into the local RBAC operating model
- Surface sync counts, affected emails, and operational errors before apply

### 10. Offboarding hygiene

- Preview inactive users that still retain managed access
- Detect stale app role assignments, business role assignments, group memberships, restricted exceptions, and direct folder access
- Apply offboarding cleanup from the portal
- Record cleanup activity in the audit log

### 11. Google Drive access monitor and reconcile

- Compare RBAC policy vs actual Google Drive ACL state
- Monitor Shared Drives and restricted folders independently
- Detect:
  - missing expected group grants
  - unexpected group grants
  - role mismatches
  - direct user access
  - restricted folders with limited access disabled
- Show reconcile preview before apply
- Support reconcile actions for drift correction with audit logging

### 12. Orphaned membership cleanup

- Detect group memberships that exist in Google/local state without a valid local assignment source
- Clean orphaned memberships from the admin experience
- Log cleanup actions for traceability

### 13. Folder template creation

- Create operational folders from the portal
- Support Exploration templates:
  - `EXP-###_ProjectName`
- Support Engineering templates:
  - `PRJ-###_ProjectName`
- Generate the approved folder tree structure in Google Drive
- Record template creation in the audit history

### 14. Authentication and authorization

- Google Workspace SSO login flow
- App role gating for `SUPER_ADMIN`, `ACCESS_ADMIN`, `REVIEWER`, `READ_ONLY_AUDITOR`, and requester access flows
- Restricted screens and mutations enforced server-side

## Shared Drives in scope

- `01_QMS_Working`
- `02_Strategic_Working`
- `03_Operational_Working`
- `04_Support_Working`

## Restricted folders currently in scope

- `01_QMS_Working / 08_QMS_Governance`
- `01_QualityAssurance_Working / 05_Audits`
- `04_Support_Working / 01_HumanResources`
- `04_Support_Working / 05_Finance`
- `04_Support_Working / 06_Legal`

## Google Groups in scope

- `grp-drive-admin@conceivable.life`
- `grp-quality-owner@conceivable.life`
- `grp-quality-editor@conceivable.life`
- `grp-strategic-owner@conceivable.life`
- `grp-strategic-editor@conceivable.life`
- `grp-operational-owner@conceivable.life`
- `grp-operational-contributor@conceivable.life`
- `grp-support-owner@conceivable.life`
- `grp-hr@conceivable.life`
- `grp-finance@conceivable.life`
- `grp-legal@conceivable.life`
- `grp-it@conceivable.life`
- `grp-all-employees@conceivable.life`
- `grp-auditors@conceivable.life`

## Folder templates

### Exploration template

Base path:

`03_Operational_Working / 03_Exploration_R&D / 02_Exploration_Projects`

Template:

- `EXP-###_ProjectName`
  - `00_Project_Log`
  - `01_Definition`
  - `02_Working_Directory`
    - `01_Optics`
    - `02_MachineLearning`
    - `03_Mechatronics`
    - `04_Software`
    - `05_Data`
    - `06_General`
  - `03_Data_Evidence`
  - `04_Media`
  - `05_Engineering_Handoff`

### Engineering template

Base path:

`03_Operational_Working / 04_Engineering / 01_EngineeringProjects`

Template:

- `PRJ-###_ProjectName`
  - `01_InstrumentTechnicalLead`
  - `02_SystemsEngineering`
  - `03_RiskManagement`
  - `04_Regulatory`
  - `33_Subsystems`
  - `90_Working_Directory`
  - `95_Ready_For_Helix`

## Technical stack

- Frontend: Next.js App Router
- Backend: Next.js server actions and route handlers
- Language: TypeScript
- Database: PostgreSQL
- ORM: Prisma
- Auth: Google Workspace SSO
- Integrations:
  - Google Admin SDK Directory API
  - Google Drive API

## Core data model

- `User`
- `Role`
- `AccessRole`
- `GroupMapping`
- `AccessRoleMapping`
- `GroupMembership`
- `SharedDrive`
- `RestrictedFolder`
- `AccessRequest`
- `AuditLog`
- `AccessReview`
- `AccessReviewItem`
- `GeneratedReport`

## Project docs

- Architecture: [docs/architecture.md](/Users/rodrigocastro/00_casdev/00_git/13_DriveAccessControlGG/13_DriveAccessControlGG/docs/architecture.md)
- Database schema: [prisma/schema.prisma](/Users/rodrigocastro/00_casdev/00_git/13_DriveAccessControlGG/13_DriveAccessControlGG/prisma/schema.prisma)
- Env variables: [.env.example](/Users/rodrigocastro/00_casdev/00_git/13_DriveAccessControlGG/13_DriveAccessControlGG/.env.example)
- UI screen map: [docs/ui-screen-map.md](/Users/rodrigocastro/00_casdev/00_git/13_DriveAccessControlGG/13_DriveAccessControlGG/docs/ui-screen-map.md)
- Google API integration plan: [docs/google-api-plan.md](/Users/rodrigocastro/00_casdev/00_git/13_DriveAccessControlGG/13_DriveAccessControlGG/docs/google-api-plan.md)
- Reconcile design: [docs/reconcile-design.md](/Users/rodrigocastro/00_casdev/00_git/13_DriveAccessControlGG/13_DriveAccessControlGG/docs/reconcile-design.md)
- Active employee sync design: [docs/active-employee-sync-design.md](/Users/rodrigocastro/00_casdev/00_git/13_DriveAccessControlGG/13_DriveAccessControlGG/docs/active-employee-sync-design.md)
- Mock mode: [docs/mock-mode.md](/Users/rodrigocastro/00_casdev/00_git/13_DriveAccessControlGG/13_DriveAccessControlGG/docs/mock-mode.md)
- IT handover contract: [docs/it-handover-contract.md](/Users/rodrigocastro/00_casdev/00_git/13_DriveAccessControlGG/13_DriveAccessControlGG/docs/it-handover-contract.md)
- Functional role catalog: [docs/functional-role-catalog.md](/Users/rodrigocastro/00_casdev/00_git/13_DriveAccessControlGG/13_DriveAccessControlGG/docs/functional-role-catalog.md)
- Company role mapping draft: [docs/company-role-mapping-draft.md](/Users/rodrigocastro/00_casdev/00_git/13_DriveAccessControlGG/13_DriveAccessControlGG/docs/company-role-mapping-draft.md)
- Project structure: [docs/project-structure.md](/Users/rodrigocastro/00_casdev/00_git/13_DriveAccessControlGG/13_DriveAccessControlGG/docs/project-structure.md)
- MVP implementation plan: [docs/mvp-implementation-plan.md](/Users/rodrigocastro/00_casdev/00_git/13_DriveAccessControlGG/13_DriveAccessControlGG/docs/mvp-implementation-plan.md)
- Release notes: [docs/releases/v1.0.md](/Users/rodrigocastro/00_casdev/00_git/13_DriveAccessControlGG/13_DriveAccessControlGG/docs/releases/v1.0.md)

## Getting started

```bash
npm install
cp .env.example .env
npx prisma generate
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

## Useful scripts

```bash
npm run dev
npm run build
npm run start
npm run test
npm run db:seed
npm run reports:quarterly:auto
```

## Local development

For local PostgreSQL with Docker, use [docs/local-setup.md](/Users/rodrigocastro/00_casdev/00_git/13_DriveAccessControlGG/13_DriveAccessControlGG/docs/local-setup.md).
