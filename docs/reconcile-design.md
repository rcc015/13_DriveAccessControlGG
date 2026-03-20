# Reconcile Design

## Goal

Close the loop between:

1. RBAC policy defined in the app
2. Google Drive ACL state detected by the monitor
3. Corrective actions applied back to Google Drive

The reconcile feature should make drift actionable without forcing operators to manually edit every Shared Drive or restricted folder.

## Principles

- Start with `preview` before `apply`
- Treat Google Drive changes as auditable operations
- Keep a narrow initial scope: Drive ACL reconciliation only
- Respect an explicit allowlist for direct technical access
- Never remove approved restricted-folder exceptions silently

## Scope

### V1

- Preview reconcile actions for:
  - Shared Drives
  - Restricted folders
- Apply reconcile actions for:
  - Missing groups
  - Unexpected groups
  - Role mismatches
  - Unexpected direct user access
  - Missing limited access on restricted folders
- Ignore allowed direct-user exceptions such as `rbac@conceivable.life`
- Write audit events for preview and apply operations

### Out of Scope for V1

- Google Group membership sync
- Renaming or moving folders
- Rebuilding folder structure
- Automatic background reconciliation
- Silent auto-fix on page load

## User Experience

### Monitor entry point

Add a top-level action to the Google access monitor page:

- `Preview reconcile`

Optional follow-up actions after V1:

- `Preview shared drive reconcile`
- `Preview restricted folder reconcile`

### Preview result

The preview should produce a structured plan with actions grouped by resource.

Example:

```text
Shared Drive: 01_QMS_Working
- Add grp-drive-admin@conceivable.life as Manager
- Add grp-all-employees@conceivable.life as Viewer
- Remove direct user rodrigo@conceivable.life

Restricted folder: 01_QMS_Working / 08_QMS_Governance
- Remove grp-quality-editor@conceivable.life
- Keep grp-quality-owner@conceivable.life
- Keep rbac@conceivable.life
```

### Apply flow

1. User opens reconcile preview
2. App builds action plan
3. User confirms apply
4. App executes actions sequentially
5. UI shows:
   - applied
   - skipped
   - failed
6. Audit log stores the result

## Reconcile Model

Suggested action model:

```ts
type ReconcileAction =
  | {
      type: "ADD_GROUP_TO_DRIVE";
      driveName: string;
      groupEmail: string;
      role: "reader" | "writer" | "fileOrganizer" | "organizer";
    }
  | {
      type: "REMOVE_GROUP_FROM_DRIVE";
      driveName: string;
      groupEmail: string;
    }
  | {
      type: "UPDATE_GROUP_ROLE_ON_DRIVE";
      driveName: string;
      groupEmail: string;
      role: "reader" | "writer" | "fileOrganizer" | "organizer";
    }
  | {
      type: "REMOVE_DIRECT_USER_FROM_DRIVE";
      driveName: string;
      userEmail: string;
    }
  | {
      type: "ENABLE_LIMITED_ACCESS";
      folderPath: string;
    }
  | {
      type: "ADD_GROUP_TO_FOLDER";
      folderPath: string;
      groupEmail: string;
      role: "reader" | "writer" | "fileOrganizer" | "organizer";
    }
  | {
      type: "REMOVE_GROUP_FROM_FOLDER";
      folderPath: string;
      groupEmail: string;
    }
  | {
      type: "UPDATE_GROUP_ROLE_ON_FOLDER";
      folderPath: string;
      groupEmail: string;
      role: "reader" | "writer" | "fileOrganizer" | "organizer";
    }
  | {
      type: "REMOVE_DIRECT_USER_FROM_FOLDER";
      folderPath: string;
      userEmail: string;
    };
```

Suggested preview result:

```ts
interface ReconcilePlan {
  generatedAt: string;
  allowedDirectUserExceptions: string[];
  actions: ReconcileAction[];
  summary: {
    addCount: number;
    removeCount: number;
    updateCount: number;
    enableLimitedAccessCount: number;
  };
}
```

## Allowlist

The monitor and reconcile service should share the same direct-user exception list.

Current allowed direct-user exception:

- `rbac@conceivable.life`

Direct users outside that allowlist should be proposed for removal.

## Service Design

Suggested new service:

- `/Users/rodrigocastro/00_casdev/00_git/13_DriveAccessControlGG/13_DriveAccessControlGG/lib/services/reconcile-service.ts`

Methods:

- `buildReconcilePlan()`
- `applyReconcilePlan(plan: ReconcilePlan)`

### `buildReconcilePlan()`

Responsibilities:

- load monitor snapshot
- convert drift into concrete actions
- exclude allowlisted direct users
- exclude inherited permissions that are already removed by limited access
- keep folder actions separate from drive actions

### `applyReconcilePlan()`

Responsibilities:

- execute actions sequentially
- stop or continue on failure based on action type
- capture per-action result:
  - applied
  - skipped
  - failed
- write audit log entries

## Drive Provider Changes

Current provider already supports:

- read Shared Drive principals
- read restricted-folder principals
- ensure group/user access on folders

V1 reconcile needs these additional capabilities in:

- `/Users/rodrigocastro/00_casdev/00_git/13_DriveAccessControlGG/13_DriveAccessControlGG/lib/google/drive.ts`

Suggested additions:

- `ensureSharedDriveGroupAccess(driveName, groupEmail, role)`
- `removeSharedDrivePrincipal(driveName, principalEmail)`
- `removeFolderPrincipal(folderPath, principalEmail)`
- `ensureLimitedAccess(folderPath)`

If the Drive API does not support toggling limited access directly in the current delegated scope, V1 can:

- detect that limited access is disabled
- show the action in preview
- mark it as manual-required in apply

## Audit Logging

Every apply operation should write to the app audit log with:

- actor email
- action type
- resource
- target principal
- previous state
- new state
- result

Example:

```text
RECONCILE_APPLY
resource=01_QMS_Working
action=ADD_GROUP_TO_DRIVE
principal=grp-drive-admin@conceivable.life
result=SUCCESS
```

## UI Delivery Plan

### Step 1

Add a `Preview reconcile` action in:

- `/Users/rodrigocastro/00_casdev/00_git/13_DriveAccessControlGG/13_DriveAccessControlGG/app/(dashboard)/google-access-monitor/page.tsx`

### Step 2

Render a preview panel showing:

- grouped actions
- summary totals
- warnings for manual-required items

### Step 3

Add `Apply reconcile` confirmation flow

### Step 4

Refresh monitor after apply and show:

- remaining drift
- actions applied
- failures needing manual follow-up

## Implementation Order

1. Create reconcile plan builder from monitor snapshot
2. Add preview UI
3. Add shared drive apply actions
4. Add restricted folder apply actions
5. Add audit logging
6. Add row-level reconcile actions later

## Follow-up Phase

After V1 is stable, Phase 2 should include:

- scheduled reconcile preview runs
- optional auto-reconcile for safe actions
- group source-of-truth sync for `grp-all-employees`
- row-level reconcile buttons
- exportable drift and reconcile reports
