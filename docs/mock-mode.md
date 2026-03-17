# Mock Mode

The project can advance before Google Workspace groups are created by running in `mock` integration mode.

## Goal

Allow MVP development of:

- RBAC data model
- internal admin UI
- access request workflow
- audit logging
- access reviews
- report generation
- folder template flows

without depending on real Google Groups, real Shared Drive permissions, or live Google Directory membership changes.

## Mode switch

Set:

```env
GOOGLE_INTEGRATION_MODE=mock
```

Available modes:

- `mock`: uses in-app fake providers for Directory and Drive
- `google`: uses Google Admin SDK and Google Drive API

## What works in mock mode

- searching sample users
- simulating group membership changes
- generating reports and storing mock file references
- creating mock folder structures
- testing app flows and audit logging

## What does not work in mock mode

- real Google Group membership updates
- real Shared Drive permission effects
- real Google Drive uploads
- real Workspace SSO behavior

## Why this is the right approach

The business rules and app workflows are more important than immediate live integration. The groups from IT are integration dependencies, not modeling dependencies.

The system can be built now as long as the Google layer is behind provider interfaces.
