# Company Role Mapping Draft

This draft maps currently identified company roles to Google Groups, Shared Drives, and exception handling rules.

The goal is to move from generic technical roles to business-aligned access roles.

## Mapping rules

- Default access must follow `User -> Role -> Google Group -> Shared Drive access`
- Direct user access is not the default model
- Restricted folders should only be granted:
  - by default if every holder of that role requires it
  - by exception if access is not universally required

## Draft mapping

| Company role | Proposed Google group(s) | Shared Drive(s) | Restricted access rule | Notes |
|---|---|---|---|---|
| Director of Quality | `grp-quality-owner@conceivable.life` | `01_QMS_Working` | Review policy for `08_QMS_Governance`; likely standard | Senior quality governance role |
| Quality Manager | `grp-quality-owner@conceivable.life` | `01_QMS_Working` | Decision required for `08_QMS_Governance` | Likely owner-level QMS access |
| QA/QC Manager | `grp-quality-editor@conceivable.life` or `grp-quality-owner@conceivable.life` | `01_QMS_Working` | Usually exception for governance folder unless required full-time | Needs policy decision on owner vs editor |
| Quality Control Specialist | `grp-quality-editor@conceivable.life` | `01_QMS_Working` | Exception only | Standard working access, not governance by default |
| Configuration Manager | `grp-quality-owner@conceivable.life` | `01_QMS_Working` | Likely standard for `08_QMS_Governance` | Strong candidate for governance access |
| Configuration/Change Manager | `grp-quality-owner@conceivable.life` | `01_QMS_Working` | Likely standard for `08_QMS_Governance` | Explicitly governance-heavy in PLC doc |
| Product Manager | `grp-strategic-editor@conceivable.life` | `02_Strategic_Working` | None by default | Strategic collaboration role |
| Director of Product | `grp-strategic-owner@conceivable.life` | `02_Strategic_Working` | None by default | Owner-level strategic access |
| VP of Product | `grp-strategic-owner@conceivable.life` | `02_Strategic_Working` | None by default | Senior strategic owner |
| Tech Project Manager | `grp-strategic-editor@conceivable.life`, `grp-operational-contributor@conceivable.life` | `02_Strategic_Working`, `03_Operational_Working` | None by default | Cross-functional delivery role |
| Director of Operations | `grp-support-owner@conceivable.life`, `grp-operational-owner@conceivable.life` | `04_Support_Working`, `03_Operational_Working` | Restricted folders by exception | Cross-drive leadership role |
| Lab. Manager | `grp-operational-owner@conceivable.life` | `03_Operational_Working` | None by default | Operational ownership role |
| AURA Line Manager | `grp-operational-contributor@conceivable.life` | `03_Operational_Working` | None by default | Confirmed under `06_LabOps`; start as contributor |
| Research VP | `grp-operational-owner@conceivable.life` | `03_Operational_Working` | None by default | R&D leadership likely sits in Operational working area |
| Research Lead | `grp-operational-owner@conceivable.life` | `03_Operational_Working` | None by default | Candidate for owner-level R&D access |
| Research Engineer | `grp-operational-contributor@conceivable.life` | `03_Operational_Working` | None by default | Standard R&D access |
| Instrument Technical Lead (ITL) | `grp-operational-owner@conceivable.life` | `03_Operational_Working` | None by default | Explicit lifecycle owner role from PLC document |
| Head of Advanced Optics | `grp-operational-contributor@conceivable.life` | `03_Operational_Working` | None by default | Domain lead inside operational work |
| Head of CV/ML | `grp-operational-contributor@conceivable.life` | `03_Operational_Working` | None by default | Domain lead inside operational work |
| Mechatronics Director | `grp-operational-owner@conceivable.life` | `03_Operational_Working` | None by default | Leadership in engineering implementation |
| Mechatronics Eng. | `grp-operational-contributor@conceivable.life` | `03_Operational_Working` | None by default | Standard contributor role |
| Mechatronics Eng. R&D | `grp-operational-contributor@conceivable.life` | `03_Operational_Working` | None by default | Exploration / R&D contributor |
| Software Dev. Head | `grp-operational-owner@conceivable.life` | `03_Operational_Working` | None by default | Technical owner-level access |
| Software Developer | `grp-operational-contributor@conceivable.life` | `03_Operational_Working` | None by default | Generic software contributor role |
| Software Architect | `grp-operational-owner@conceivable.life` | `03_Operational_Working` | None by default | Architecture leadership role |
| Systems Engineer Lead | `grp-operational-owner@conceivable.life` | `03_Operational_Working` | None by default | Systems governance role |
| Systems Engineer | `grp-operational-contributor@conceivable.life` | `03_Operational_Working` | None by default | Standard contributor role |
| Test Engineer | `grp-operational-contributor@conceivable.life` | `03_Operational_Working` | None by default | Standard contributor role |
| Head of Testing | `grp-operational-owner@conceivable.life` | `03_Operational_Working` | None by default | Test leadership |
| Deployment Eng. | `grp-operational-contributor@conceivable.life` | `03_Operational_Working` | None by default | Standard contributor role |
| Fullstack Dev. Eng. | `grp-operational-contributor@conceivable.life` | `03_Operational_Working` | None by default | Standard contributor role |
| Computer Vision Eng. | `grp-operational-contributor@conceivable.life` | `03_Operational_Working` | None by default | Standard contributor role |
| Robotics Eng. | `grp-operational-contributor@conceivable.life` | `03_Operational_Working` | None by default | Standard contributor role |
| Digital Manufacturing Eng. | `grp-operational-contributor@conceivable.life` | `03_Operational_Working` | None by default | Standard contributor role |
| Experimental Biologist | `grp-operational-contributor@conceivable.life` | `03_Operational_Working` | None by default | Standard contributor role |
| Clinical Project Manager | `grp-operational-owner@conceivable.life` | `03_Operational_Working` | Exception-first | Align to clinical operations within Operational working |
| Clinical Support | `grp-operational-contributor@conceivable.life` | `03_Operational_Working` | Exception-first | Confirmed under `07_ClinicalOps` |
| HR Director | `grp-hr@conceivable.life` | `04_Support_Working` | `01_HumanResources` likely standard | Restricted access likely role-based |
| Office Manager and PR | `grp-support-owner@conceivable.life` | `04_Support_Working` | HR/Finance/Legal folders by exception | Includes facilities and public relations work |
| Facilities and Public Relations | `grp-support-owner@conceivable.life` | `04_Support_Working` | HR/Finance/Legal folders by exception | Confirmed in Support drive |
| Commercial Ops | `grp-support-owner@conceivable.life` | `04_Support_Working` | Exception-first | Confirmed in Support drive; candidate for future dedicated group |
| Finance Manager / Finance Lead | `grp-finance@conceivable.life` | `04_Support_Working` | `05_Finance` likely standard | Restricted folder likely role-based |
| Legal Manager / Legal Lead | `grp-legal@conceivable.life` | `04_Support_Working` | `06_Legal` likely standard | Restricted folder likely role-based |
| IT role / IT support | `grp-it@conceivable.life` | `04_Support_Working` | Restricted folders by exception unless admin support requires otherwise | Support access, not HR/Finance/Legal by default |
| Managing Director | `grp-drive-admin@conceivable.life` or governance-specific future role | All drives if policy allows | Restricted by policy review | High-impact role, should be tightly controlled |
| Founder & CEO | `grp-drive-admin@conceivable.life` or no routine access | Policy decision required | Restricted by policy review | Avoid default over-broad access unless justified |

## Roles that need clarification before implementation

These were identified but still need business clarification before clean mapping:

- `Lab Ops`
- `Governance`

These should be excluded from the first implementation pass:

- `VP, Intelligent Systems`

## V1 confirmed roles

These roles now have enough definition to move into first implementation planning:

- `Director of Quality`
- `Quality Manager`
- `QA/QC Manager`
- `Quality Control Specialist`
- `Configuration Manager`
- `Configuration/Change Manager`
- `Product Manager`
- `Director of Product`
- `VP of Product`
- `Tech Project Manager`
- `Director of Operations`
- `Clinical Project Manager`
- `Clinical Support`
- `Research VP`
- `Research Lead`
- `Research Engineer`
- `Instrument Technical Lead (ITL)`
- `Head of Advanced Optics`
- `Head of CV/ML`
- `Mechatronics Director`
- `Mechatronics Eng.`
- `Mechatronics Eng. R&D`
- `Software Dev. Head`
- `Software Developer`
- `Software Architect`
- `Systems Engineer Lead`
- `Test Engineer`
- `Head of Testing`
- `Deployment Eng.`
- `Fullstack Dev. Eng.`
- `Computer Vision Eng.`
- `Robotics Eng.`
- `Digital Manufacturing Eng.`
- `Experimental Biologist`
- `AURA Line Manager`
- `HR Director`
- `Office Manager and PR`
- `Facilities and Public Relations`
- `Finance Manager / Finance Lead`
- `Legal Manager / Legal Lead`
- `Commercial Ops`

## Recommended implementation phases

### Phase 1

Implement the high-confidence roles first:

- `Director of Quality`
- `Quality Manager`
- `Quality Control Specialist`
- `Configuration Manager`
- `Product Manager`
- `Director of Product`
- `Tech Project Manager`
- `Director of Operations`
- `Research Lead`
- `Software Architect`
- `Systems Engineer Lead`
- `HR Director`
- `Finance Manager`
- `Legal Manager`

### Phase 2

Implement the engineering and operations contributor roles:

- `Mechatronics Eng.`
- `Software Dev. Eng.`
- `Test Engineer`
- `Deployment Eng.`
- `Computer Vision Eng.`
- `Robotics Eng.`
- `Digital Manufacturing Eng.`
- `Experimental Biologist`

### Phase 3

Resolve ambiguous or leadership-wide roles:

- `Managing Director`
- `Founder & CEO`
- `Clinical Support`
- `Commercial Ops`
- `AURA Line Manager`

## Recommended next product change

Add a proper `AccessRole` catalog with:

- `displayName`
- `department`
- `businessRoleCode`
- `defaultGroupMappings`
- `restrictedAccessMode`

Then keep admin roles separate from access roles.
