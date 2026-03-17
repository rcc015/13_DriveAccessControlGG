# Architecture

## System shape

Drive Access Console is a Next.js internal application backed by PostgreSQL and Prisma.

Primary control path:

`User -> Role -> Google Group -> Shared Drive access`

Restricted-folder assignments are modeled as exception workflows only. They are approved through `AccessRequest`, logged in `AuditLog`, and displayed separately from inherited drive access.

## Runtime components

### 1. Web application

- Next.js App Router for internal admin UI
- Server components for dashboard and admin screens
- Route handlers and server-side services for Google integrations and audit-safe mutations

### 2. Data layer

- PostgreSQL for operational system of record
- Prisma schema for RBAC mappings, access requests, reviews, reports, and audit logs

### 3. Google integration layer

- Google Admin SDK Directory API for user search and group membership management
- Google Drive API for report uploads and folder template creation
- Domain-wide delegated service account for admin operations

### 4. Control evidence layer

- `AuditLog` captures every sensitive action
- `GeneratedReport` stores Google Drive file ID and URL
- `AccessReview` and `AccessReviewItem` preserve quarterly review evidence

## Security model

- Google Workspace SSO for authentication
- App role gating for `SUPER_ADMIN`, `ACCESS_ADMIN`, `REVIEWER`, and `READ_ONLY_AUDITOR`
- Google Groups remain the default authority boundary
- No direct user permissions in the normal access path
- Restricted folder exceptions require justification, approver, date bounds, and audit trace

## Suggested request flow

1. Admin signs in with Google Workspace SSO
2. App checks allowed admin email and local app role
3. Admin assigns a role to a user
4. App resolves the corresponding `GroupMapping`
5. Resolution uses `groupEmail + sharedDrive + optional restrictedFolder`, not group alone
6. App calls Google Directory API to add/remove group membership
7. App persists local membership state and writes `AuditLog`

## Reporting flow

1. Reviewer triggers report generation
2. App queries PostgreSQL for authoritative evidence data
3. Report builder renders XLSX/PDF/JSON artifact
4. Drive service uploads the artifact to the configured Google Drive folder
5. App stores file ID and URL in `GeneratedReport`
6. Audit event is recorded for traceability
