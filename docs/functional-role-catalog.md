# Functional Role Catalog

This document defines the next layer to add on top of the current admin-role model.

The current app already supports:

- admin roles for operating the app
- role-to-group-to-drive mappings
- restricted-folder exception workflows
- audit logging

The next step is to model **functional access roles** for business users.

## Design rule

Do not use app administration roles as business access roles.

Separate:

- `Admin role`: who can operate Drive Access Console
- `Access role`: what Shared Drive access a business user receives

Core path remains:

`User -> Access role -> Google Group -> Shared Drive access`

Restricted folders should only be assigned in one of these ways:

1. standard access for a role, if policy says every holder of that role must have it
2. approved exception workflow, if restricted access should be case-by-case

## Current admin roles

These remain for operating the app:

- `SUPER_ADMIN`
- `QMS_ACCESS_ADMIN`
- `STRATEGIC_ACCESS_ADMIN`
- `OPERATIONAL_ACCESS_ADMIN`
- `SUPPORT_ACCESS_ADMIN`
- `REVIEWER`
- `READ_ONLY_AUDITOR`

These are not the same as business roles.

## Proposed functional access roles

### QMS

- `QUALITY_MANAGER`
  - mapped groups:
    - `grp-quality-owner@conceivable.life`
    - `grp-quality-editor@conceivable.life`
  - standard drive access:
    - `01_QMS_Working`
  - restricted-folder policy:
    - `01_QMS_Working / 08_QMS_Governance`
    - recommended: policy decision required
    - if all Quality Managers need it, map it directly
    - otherwise use exception workflow

- `QUALITY_EDITOR`
  - mapped groups:
    - `grp-quality-editor@conceivable.life`
  - standard drive access:
    - `01_QMS_Working`
  - restricted-folder policy:
    - exception only

### Strategic

- `STRATEGIC_MANAGER`
  - mapped groups:
    - `grp-strategic-owner@conceivable.life`
    - `grp-strategic-editor@conceivable.life`
  - standard drive access:
    - `02_Strategic_Working`
  - restricted-folder policy:
    - none by default

- `STRATEGIC_EDITOR`
  - mapped groups:
    - `grp-strategic-editor@conceivable.life`
  - standard drive access:
    - `02_Strategic_Working`
  - restricted-folder policy:
    - none by default

### Operational

- `OPERATIONAL_OWNER`
  - mapped groups:
    - `grp-operational-owner@conceivable.life`
    - `grp-operational-contributor@conceivable.life`
  - standard drive access:
    - `03_Operational_Working`
  - restricted-folder policy:
    - none by default

- `OPERATIONAL_CONTRIBUTOR`
  - mapped groups:
    - `grp-operational-contributor@conceivable.life`
  - standard drive access:
    - `03_Operational_Working`
  - restricted-folder policy:
    - none by default

### Support

- `SUPPORT_OWNER`
  - mapped groups:
    - `grp-support-owner@conceivable.life`
  - standard drive access:
    - `04_Support_Working`
  - restricted-folder policy:
    - none by default

- `IT_SUPPORT`
  - mapped groups:
    - `grp-it@conceivable.life`
  - standard drive access:
    - `04_Support_Working`
  - restricted-folder policy:
    - none by default

- `HR_MANAGER`
  - mapped groups:
    - `grp-hr@conceivable.life`
  - standard drive access:
    - restricted access only where approved
  - restricted-folder policy:
    - `04_Support_Working / 01_HumanResources`
    - recommended: role-based only if HR policy confirms this is standard

- `FINANCE_MANAGER`
  - mapped groups:
    - `grp-finance@conceivable.life`
  - standard drive access:
    - restricted access only where approved
  - restricted-folder policy:
    - `04_Support_Working / 05_Finance`
    - recommended: role-based only if Finance policy confirms this is standard

- `LEGAL_MANAGER`
  - mapped groups:
    - `grp-legal@conceivable.life`
  - standard drive access:
    - restricted access only where approved
  - restricted-folder policy:
    - `04_Support_Working / 06_Legal`
    - recommended: role-based only if Legal policy confirms this is standard

Support-side business roles such as `Office Manager and PR`, `Facilities and Public Relations`, and `Commercial Ops` are currently modeled as contributor-level roles in the app catalog. The current Google group inventory does not yet include a separate support contributor group, so these roles still map to `grp-support-owner@conceivable.life` temporarily. That means the catalog intent is now least-privilege aware, but the final Google-side permission shape should be revisited once a dedicated support contributor group exists.

### Broad read access

- `ALL_EMPLOYEES_VIEWER`
  - mapped groups:
    - `grp-all-employees@conceivable.life`
  - standard drive access:
    - currently `01_QMS_Working` viewer path only
  - restricted-folder policy:
    - none

- `AUDITOR`
  - mapped groups:
    - `grp-auditors@conceivable.life`
  - standard drive access:
    - policy decision required
  - restricted-folder policy:
    - exception-first recommended

## Recommended policy decisions

These are the decisions that should be made before implementation:

1. Should `QUALITY_MANAGER` include direct standard access to `08_QMS_Governance`?
2. Should `HR_MANAGER`, `FINANCE_MANAGER`, and `LEGAL_MANAGER` receive restricted folders by role, or only by exception?
3. Should `AUDITOR` map to any standard Shared Drive groups, or remain exception-driven?
4. Should `ALL_EMPLOYEES_VIEWER` stay limited to `01_QMS_Working`?

## Recommended product change

Add two assignment flows in the app:

1. `Assign admin role`
  - controls who can use Drive Access Console
2. `Assign access role`
  - controls Shared Drive access for business users

This avoids overloading one role model with two different meanings.

## Recommended implementation order

1. add `AccessRole` entity separate from `Role`
2. move current drive/group mappings for business access to `AccessRole`
3. keep `Role` only for app administration
4. update `Users` UI to show:
   - admin role assignment
   - access role assignment
   - effective group impact preview
5. decide which restricted folders are role-based versus exception-only

## Current seeded business roles

The app now includes an initial seeded `AccessRole` catalog covering:

- `Director of Quality`
- `Quality Manager`
- `Quality Control Specialist`
- `Configuration Manager`
- `Product Manager`
- `Director of Product`
- `VP of Product`
- `Tech Project Manager`
- `Director of Operations`
- `Research VP`
- `Research Lead`
- `Research Engineer`
- `Instrument Technical Lead`
- `Software Developer`
- `Software Architect`
- `Head of Advanced Optics`
- `Head of CV/ML`
- `Mechatronics Director`
- `Mechatronics Engineer`
- `Mechatronics Engineer R&D`
- `Systems Engineer Lead`
- `Systems Engineer`
- `Test Engineer`
- `Head of Testing`
- `Deployment Engineer`
- `Fullstack Dev. Eng.`
- `Computer Vision Eng.`
- `Robotics Eng.`
- `Digital Manufacturing Eng.`
- `Experimental Biologist`
- `Clinical Project Manager`
- `Clinical Support`
- `AURA Line Manager`
- `HR Director`
- `Office Manager and PR`
- `Finance Manager`
- `Legal Manager`
- `Facilities and Public Relations`
- `Commercial Ops`
- `IT Support`
