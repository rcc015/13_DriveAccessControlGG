# IT Handover Contract

This is the minimum information IT must deliver before switching from `mock` mode to real Google integration.

## 1. Google Groups

Provide the final created group email for each expected group:

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

For each group, IT should confirm:

- exact group email
- display name
- owner
- whether external members are allowed
- whether the group already contains members

## 2. Shared Drives

For each Shared Drive, IT should provide:

- exact name
- Google Drive id
- whether the drive already exists
- responsible admin owner

In scope:

- `01_QMS_Working`
- `02_Strategic_Working`
- `03_Operational_Working`
- `04_Support_Working`

## 3. Restricted folders

For each restricted folder, IT should provide:

- exact path
- Google folder id
- owning group
- whether inheritance is blocked or managed through separate permissions

## 4. Service account and delegation

IT or Google admin must provide:

- service account enabled for domain-wide delegation
- approved OAuth scopes for Admin SDK and Drive API
- impersonated admin account email

## 5. Report archival destination

IT should provide:

- Google Drive folder id for reports
- Shared Drive id for reports if applicable
- retention expectations

## 6. Acceptance checks before go-live

- every expected group exists
- every mapped drive exists
- restricted folders exist and match workbook paths
- service account can list users
- service account can manage group membership
- service account can upload report files
