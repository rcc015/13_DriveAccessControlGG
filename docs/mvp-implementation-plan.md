# MVP Implementation Plan

## Phase 1: Foundation

- Finalize Prisma schema and run initial migration
- Add Google Workspace SSO
- Seed Shared Drives, restricted folders, and role definitions
- Add role-based route protection

## Phase 2: Access management

- Build user search against Directory API
- Build role assignment UI
- Resolve role-to-group mappings with drive and optional restricted-folder context
- Add/remove Google Group membership
- Capture audit entries for every mutation

## Phase 3: Restricted access workflow

- Create request form for restricted folders
- Add approval and rejection actions
- Persist approver, justification, and dates
- Add expiration checks and revocation flow

## Phase 4: Access review and reports

- Build review campaigns and review items
- Add keep/remove decisions
- Generate structured report files
- Upload reports to Google Drive and store evidence links

## Phase 5: Folder automation

- Create Exploration and Engineering template forms
- Resolve parent Google Drive folder IDs
- Create folder trees through Drive API
- Record audit evidence for template creation
