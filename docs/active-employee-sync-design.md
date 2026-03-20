# Active Employee Sync And Offboarding Design

## Goal

Use Google Directory as the source of truth for active employees, keep
`grp-all-employees@conceivable.life` aligned automatically, and then use that
same source to detect leavers and clean RBAC-managed access with auditability.

## Why This Order

The correct sequence is:

1. Define a reliable source of truth for active employees
2. Sync `grp-all-employees`
3. Detect inactive users and offboard RBAC-managed access
4. Record everything in `AuditLog`

If offboarding is implemented before the active-employee source is reliable,
the app is forced to guess who is still active and who is not.

## Source Of Truth

### Recommended source

Google Directory active users.

This should mean:

- Google Workspace user exists
- user is not suspended
- user is not archived or otherwise inactive
- user is a real employee account, not a service account

### Why not make `grp-all-employees` the source?

`grp-all-employees` should be a derived technical group used by the RBAC system.
It should not be the primary source of truth if we want reliable offboarding and
auditable sync behavior.

## Phase 1: Active Employee Sync

### Objective

Build a daily sync that compares active Directory users against
`grp-all-employees@conceivable.life`.

### Behavior

For each active user:

- if the user is not in `grp-all-employees`, add them

For each current member of `grp-all-employees`:

- if the user is no longer active in Directory, remove them

### Scope

This phase only manages:

- `grp-all-employees@conceivable.life`

It does not touch:

- business-role groups
- drive admin groups
- restricted-folder groups

### Audit events

Suggested action types:

- `ACTIVE_EMPLOYEE_SYNC_STARTED`
- `ACTIVE_EMPLOYEE_SYNC_ADD`
- `ACTIVE_EMPLOYEE_SYNC_REMOVE`
- `ACTIVE_EMPLOYEE_SYNC_COMPLETED`
- `ACTIVE_EMPLOYEE_SYNC_FAILED`

### Example metadata

```json
{
  "groupEmail": "grp-all-employees@conceivable.life",
  "added": ["ana@conceivable.life"],
  "removed": ["former.user@conceivable.life"]
}
```

## Phase 2: Offboarding Hygiene

### Objective

Detect users who are no longer active in Directory and remove RBAC-managed
access that the app controls.

### Trigger

Run after active-employee sync, ideally in the same daily job sequence.

### What should be removed

Only remove access that is explicitly managed by the console:

- `UserRole`
- `UserAccessRole`
- `GroupMembership` created by app-managed mappings
- active restricted-folder exceptions
- direct Drive/folder ACLs created by reconcile or exception flows

### What should not be removed blindly

- arbitrary Google Groups outside RBAC scope
- unrelated company-wide groups
- access that the app cannot attribute safely

### Behavior

For every inactive user detected in Directory:

1. find active app-role assignments
2. find active business-role assignments
3. find active `GroupMembership`
4. remove user from RBAC-managed Google Groups
5. revoke active restricted-folder exceptions
6. remove direct app-managed Drive or folder access if present
7. optionally mark the local user as inactive
8. write audit events

### Audit events

Suggested action types:

- `OFFBOARD_DETECTED`
- `OFFBOARD_GROUP_REMOVAL`
- `OFFBOARD_EXCEPTION_REVOKED`
- `OFFBOARD_DIRECT_ACCESS_REMOVED`
- `OFFBOARD_ASSIGNMENT_CLEARED`
- `OFFBOARD_COMPLETED`
- `OFFBOARD_FAILED`

## Phase 3: Verification Job

### Objective

Run daily verification and cleanup automatically.

### Sequence

1. Sync active employees into `grp-all-employees`
2. Detect inactive users
3. Run RBAC offboarding hygiene
4. Record summary in `AuditLog`

## Product Surfaces

### New admin page or section

Suggested module:

- `Directory Sync`

Suggested UI sections:

- last sync status
- active users counted
- all-employees add/remove summary
- inactive users detected
- offboarding actions applied
- failures requiring manual review

### Reports

The existing `Access & Reconcile Change Log` should include these new audit
events automatically.

Suggested event categories in reports:

- `DIRECTORY_SYNC`
- `OFFBOARD`

## Implementation Design

### Directory provider changes

Current directory provider supports search and group membership operations.

We need to add a method like:

```ts
listActiveUsers(): Promise<DirectoryUser[]>
```

For the Google implementation, this should query Directory users and filter to
active employee accounts only.

### New services

Suggested services:

- `/Users/rodrigocastro/00_casdev/00_git/13_DriveAccessControlGG/13_DriveAccessControlGG/lib/services/active-employee-sync-service.ts`
- `/Users/rodrigocastro/00_casdev/00_git/13_DriveAccessControlGG/13_DriveAccessControlGG/lib/services/offboarding-hygiene-service.ts`

#### `ActiveEmployeeSyncService`

Methods:

- `previewSync()`
- `applySync(actorEmail: string)`

#### `OffboardingHygieneService`

Methods:

- `previewOffboarding()`
- `applyOffboarding(actorEmail: string)`

## Reuse Opportunities

We already have:

- `DirectoryProvider`
- `GroupMembershipService`
- `GoogleAccessMonitorService`
- `AuditLogService`
- report generation from `AuditLog`

That means this feature can be built by layering on top of existing patterns,
not by introducing a separate access-management stack.

## Safety Rules

- never remove a user from non-RBAC groups
- never assume suspended means removable unless Directory confirms inactivity
- keep preview before apply
- write audit events for every change
- prefer idempotent operations

## Rollout Order

### V1

- add `listActiveUsers()` to Directory provider
- build daily sync for `grp-all-employees`
- write audit events

### V2

- build offboarding hygiene preview/apply
- remove RBAC-managed memberships for inactive users
- revoke exceptions

### V3

- scheduled automation / recurring job
- admin dashboard for sync status
- alerts for failures

## Recommendation

Implement in this exact order:

1. Directory-backed active employee sync
2. `grp-all-employees` sync preview/apply
3. offboarding hygiene preview/apply
4. daily scheduled execution

That gives the system a reliable identity baseline before it starts revoking
access automatically.
