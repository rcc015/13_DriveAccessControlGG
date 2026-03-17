# Google API Integration Plan

## Authentication pattern

- Use a Google Cloud service account with domain-wide delegation
- Impersonate a Google Workspace admin via `GOOGLE_IMPERSONATED_ADMIN`
- Restrict scopes to only those required for each service
- Until IT delivers real Google groups and IDs, run the app in `mock` mode

## Directory API responsibilities

- Search users for role assignment workflows
- List members of managed Google Groups
- Add or remove group members during RBAC changes
- Support quarterly review snapshots

## Drive API responsibilities

- Upload generated reports to the configured evidence folder
- Persist Google Drive file IDs and URLs locally
- Create standardized Exploration and Engineering project folder trees

## Required setup steps

1. Create a Google Cloud project for the internal app.
2. Enable Admin SDK API and Google Drive API.
3. Create a service account and grant domain-wide delegation.
4. In Google Workspace Admin, authorize the service account client ID with required scopes.
5. Create or identify the Shared Drive folder for report archival.
6. Store service account JSON in `GOOGLE_SERVICE_ACCOUNT_JSON`.

## Recommended scope split

Directory:

- `https://www.googleapis.com/auth/admin.directory.user.readonly`
- `https://www.googleapis.com/auth/admin.directory.group`
- `https://www.googleapis.com/auth/admin.directory.group.member.readonly`

Drive:

- `https://www.googleapis.com/auth/drive`

## Failure handling

- Log every failed mutation to `AuditLog` with error detail in metadata
- Retry idempotent report uploads carefully
- Surface Google API request IDs in logs when available
- Reconcile local membership state against Google Group membership on scheduled review cycles
