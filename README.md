# Drive Access Console

Internal web application to manage Google Workspace Shared Drive access using RBAC.

## Purpose

This application provides an internal administrative layer for managing access to Google Shared Drives used as the corporate **working directory**.

It is designed to support:
- role-based access control
- least privilege
- auditable access changes
- restricted folder exception workflows
- quarterly access reviews
- automated report generation and archival to Google Drive

## Scope

This system manages **working directory access only**.

It does **not** serve as the official controlled document repository.

## Core governance model

The primary access model is:

`User -> Role -> Google Group -> Shared Drive access`

Direct user permissions must **not** be used by default.

Only approved restricted-folder exception workflows may create special-case assignments, and those must be fully logged and reviewable.

## Shared Drives in scope

- `01_QMS_Working`
- `02_Strategic_Working`
- `03_Operational_Working`
- `04_Support_Working`

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

## Restricted folders in scope

- `01_QMS_Working / 00_Quality / 08_QMS_Governance`
- `04_Support_Working / 03_SupportProcesses / 01_HumanResources`
- `04_Support_Working / 03_SupportProcesses / 05_Finance`
- `04_Support_Working / 03_SupportProcesses / 06_Legal`

## Main use cases

### 1. User role assignment

- search users
- assign roles
- add/remove Google Group membership
- record approvals and justification

### 2. User access viewer

- view user groups
- view inherited Shared Drive access
- view restricted-folder exceptions
- show effective access summary

### 3. Restricted access request workflow

- request restricted access
- approve/reject
- store justification, approver, and expiration
- revoke expired exceptions when possible

### 4. Quarterly access review

- review group membership
- mark keep/remove/needs review
- capture reviewer decisions
- export reports
- upload reports to Google Drive

### 5. Reports

Generate and archive:
- Group Membership Snapshot
- Quarterly Access Review
- Restricted Access Exceptions
- Permission Matrix
- Access Change Log

Reports must be uploaded to Google Drive and tracked locally in the database.

### 6. Folder template creation

Support creation of:
- `EXP-###_ProjectName`
- `PRJ-###_ProjectName`

## Folder templates

### Exploration template

Base path:

`03_Operational_Working / 02_OperationalProcesses / 03_Exploration_R&D / 02_Exploration_Projects`

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

`03_Operational_Working / 02_OperationalProcesses / 04_Engineering / 01_EngineeringProjects`

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

- Frontend: Next.js
- Backend: Next.js server routes/actions
- Database: PostgreSQL
- Auth: Google Workspace SSO
- ORM: Prisma
- Integrations:
  - Google Admin SDK Directory API
  - Google Drive API

## Core data model

- `User`
- `Role`
- `GroupMapping`
- `SharedDrive`
- `RestrictedFolder`
- `AccessRequest`
- `AuditLog`
- `AccessReview`
- `AccessReviewItem`
- `GeneratedReport`

## Required outputs

- Architecture: [docs/architecture.md](/Users/rodrigocastro/00_casdev/00_git/13_DriveAccessControlGG/13_DriveAccessControlGG/docs/architecture.md)
- Database schema: [prisma/schema.prisma](/Users/rodrigocastro/00_casdev/00_git/13_DriveAccessControlGG/13_DriveAccessControlGG/prisma/schema.prisma)
- Env variables: [.env.example](/Users/rodrigocastro/00_casdev/00_git/13_DriveAccessControlGG/13_DriveAccessControlGG/.env.example)
- UI screen map: [docs/ui-screen-map.md](/Users/rodrigocastro/00_casdev/00_git/13_DriveAccessControlGG/13_DriveAccessControlGG/docs/ui-screen-map.md)
- Google API integration plan: [docs/google-api-plan.md](/Users/rodrigocastro/00_casdev/00_git/13_DriveAccessControlGG/13_DriveAccessControlGG/docs/google-api-plan.md)
- Mock mode: [docs/mock-mode.md](/Users/rodrigocastro/00_casdev/00_git/13_DriveAccessControlGG/13_DriveAccessControlGG/docs/mock-mode.md)
- IT handover contract: [docs/it-handover-contract.md](/Users/rodrigocastro/00_casdev/00_git/13_DriveAccessControlGG/13_DriveAccessControlGG/docs/it-handover-contract.md)
- Functional role catalog: [docs/functional-role-catalog.md](/Users/rodrigocastro/00_casdev/00_git/13_DriveAccessControlGG/13_DriveAccessControlGG/docs/functional-role-catalog.md)
- Company role mapping draft: [docs/company-role-mapping-draft.md](/Users/rodrigocastro/00_casdev/00_git/13_DriveAccessControlGG/13_DriveAccessControlGG/docs/company-role-mapping-draft.md)
- Project structure: [docs/project-structure.md](/Users/rodrigocastro/00_casdev/00_git/13_DriveAccessControlGG/13_DriveAccessControlGG/docs/project-structure.md)
- MVP implementation plan: [docs/mvp-implementation-plan.md](/Users/rodrigocastro/00_casdev/00_git/13_DriveAccessControlGG/13_DriveAccessControlGG/docs/mvp-implementation-plan.md)
- Design pack index: [docs/design-pack.md](/Users/rodrigocastro/00_casdev/00_git/13_DriveAccessControlGG/13_DriveAccessControlGG/docs/design-pack.md)

## Initial scaffold

The project includes:

- Next.js App Router pages for overview, users, access requests, access reviews, reports, and templates
- Prisma schema and seed file
- Google integration adapters with `mock` and `google` modes
- Core service stubs for:
  - group membership management
  - access viewer
  - report generation
  - Google Drive report upload
  - folder template creation

## Getting started

```bash
npm install
cp .env.example .env
npx prisma generate
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

## Local development

For local PostgreSQL with Docker, use [docs/local-setup.md](/Users/rodrigocastro/00_casdev/00_git/13_DriveAccessControlGG/13_DriveAccessControlGG/docs/local-setup.md).
