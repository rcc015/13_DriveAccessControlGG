import { Fragment } from "react";
import { AccessDenied } from "@/components/dashboard/access-denied";
import {
  createAdminRoleMapping,
  createBusinessRoleMapping,
  deleteAdminRoleMapping,
  deleteBusinessRoleMapping,
  updateAdminRoleMapping,
  updateBusinessRoleMapping
} from "@/app/(dashboard)/role-matrix/actions";
import { adminAndReadRoles, hasAnyRole } from "@/lib/auth/authorization";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

type MatrixMapping = {
  id: string;
  accessLevel: string;
  sharedDriveName: string;
  restrictedFolderPath?: string;
  groupEmail: string;
};

type MatrixEntry = {
  id: string;
  name: string;
  description: string;
  family: string;
  mappings: MatrixMapping[];
};

function formatAccessLevel(accessLevel: string) {
  return accessLevel
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (value) => value.toUpperCase());
}

function chipClassName(accessLevel: string) {
  switch (accessLevel) {
    case "MANAGER":
      return "access-chip manager";
    case "CONTENT_MANAGER":
      return "access-chip owner";
    case "CONTRIBUTOR":
      return "access-chip contributor";
    case "VIEWER":
      return "access-chip viewer";
    case "RESTRICTED":
      return "access-chip restricted";
    default:
      return "access-chip";
  }
}

function formatGroupLabel(groupEmail: string) {
  return groupEmail.replace("@conceivable.life", "");
}

function getAdminRoleFamily(role: MatrixEntry) {
  const roleName = role.name.toLowerCase();
  const driveNames = new Set(role.mappings.filter((mapping) => !mapping.restrictedFolderPath).map((mapping) => mapping.sharedDriveName));

  if (roleName.includes("reviewer") || roleName.includes("auditor")) {
    return "Oversight";
  }

  if (roleName.includes("super_admin")) {
    return "Platform";
  }

  if (driveNames.size === 1) {
    return Array.from(driveNames)[0];
  }

  if (driveNames.size > 1) {
    return "Cross-drive";
  }

  return "App-only";
}

function familyClassName(label: string) {
  if (label.includes("QMS")) {
    return "matrix-family qms";
  }
  if (label.includes("Strategic")) {
    return "matrix-family strategic";
  }
  if (label.includes("Operational")) {
    return "matrix-family operational";
  }
  if (label.includes("Support")) {
    return "matrix-family support";
  }
  if (label === "Oversight") {
    return "matrix-family oversight";
  }
  if (label === "Platform") {
    return "matrix-family platform";
  }
  if (label === "Cross-drive") {
    return "matrix-family cross";
  }
  if (label === "App-only") {
    return "matrix-family app";
  }

  return "matrix-family";
}

function groupEntriesByFamily(entries: MatrixEntry[]) {
  const grouped = entries.reduce<Array<{ family: string; roles: MatrixEntry[] }>>((acc, role) => {
    const existing = acc.find((entry) => entry.family === role.family);

    if (existing) {
      existing.roles.push(role);
      return acc;
    }

    acc.push({ family: role.family, roles: [role] });
    return acc;
  }, []);

  grouped.sort((left, right) => left.family.localeCompare(right.family));

  return grouped;
}

function MatrixTable({
  title,
  description,
  pill,
  groupedRoles,
  columns,
  emptyLabel
}: {
  title: string;
  description: string;
  pill: string;
  groupedRoles: Array<{ family: string; roles: MatrixEntry[] }>;
  columns: Array<{ id: string; label: string }>;
  emptyLabel: string;
}) {
  return (
    <section className="panel">
      <div className="section-head">
        <div>
          <h3>{title}</h3>
          <p className="muted">{description}</p>
        </div>
        <span className="pill">{pill}</span>
      </div>
      <div className="matrix-wrap">
        <table className="matrix-table">
          <thead>
            <tr>
              <th>Role</th>
              {columns.map((column) => (
                <th key={column.id}>{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groupedRoles.map((group) => (
              <Fragment key={`${group.family}-${title}`}>
                <tr className="matrix-family-row">
                  <td colSpan={columns.length + 1}>
                    <span className={familyClassName(group.family)}>{group.family}</span>
                  </td>
                </tr>
                {group.roles.map((role) => (
                  <tr key={`${role.id}-${title}`}>
                    <td className="matrix-role">
                      <strong>{role.name.replaceAll("_", " ")}</strong>
                      <div className="muted">{role.description}</div>
                    </td>
                    {columns.map((column) => {
                      const mappings = role.mappings.filter((mapping) =>
                        column.id.startsWith("restricted:")
                          ? mapping.restrictedFolderPath === column.id.replace("restricted:", "")
                          : !mapping.restrictedFolderPath && mapping.sharedDriveName === column.id
                      );

                      return (
                        <td key={`${role.id}-${column.id}`}>
                          {mappings.length > 0 ? (
                            <div className="matrix-cell">
                              {mappings.map((mapping) => (
                                <span key={mapping.id} className={chipClassName(mapping.accessLevel)}>
                                  <span>{formatAccessLevel(mapping.accessLevel)}</span>
                                  <span className="access-chip-meta">{formatGroupLabel(mapping.groupEmail)}</span>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="access-none">{emptyLabel}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

interface RoleMatrixPageProps {
  searchParams?: Promise<{
    drive?: string;
    view?: string;
    q?: string;
    catalog?: string;
  }>;
}

export default async function RoleMatrixPage({ searchParams }: RoleMatrixPageProps) {
  const session = await requireSession();

  if (!hasAnyRole(session, adminAndReadRoles)) {
    return (
      <AccessDenied
        title="Role matrix restricted"
        description="Only authorized roles can inspect the role-to-drive access matrix."
      />
    );
  }

  const params = (await searchParams) ?? {};
  const driveFilter = params.drive?.trim() ?? "all";
  const viewFilter = params.view?.trim() ?? "all";
  const roleQuery = params.q?.trim().toLowerCase() ?? "";
  const catalogFilter = params.catalog?.trim() ?? "all";

  const [roles, accessRoles, drives, restrictedFolders] = await Promise.all([
    prisma.role.findMany({
      include: {
        mappings: {
          include: {
            sharedDrive: true,
            restrictedFolder: true
          }
        }
      },
      orderBy: { name: "asc" }
    }),
    prisma.accessRole
      .findMany({
        include: {
          mappings: {
            include: {
              sharedDrive: true,
              restrictedFolder: true
            }
          }
        },
        orderBy: [{ department: "asc" }, { displayName: "asc" }]
      })
      .catch(() => []),
    prisma.sharedDrive.findMany({
      orderBy: { name: "asc" }
    }),
    prisma.restrictedFolder.findMany({
      orderBy: [{ sharedDrive: { name: "asc" } }, { path: "asc" }],
      include: {
        sharedDrive: true
      }
    })
  ]);

  const filteredDrives = driveFilter === "all" ? drives : drives.filter((drive) => drive.name === driveFilter);
  const filteredRestrictedFolders =
    driveFilter === "all"
      ? restrictedFolders
      : restrictedFolders.filter((folder) => folder.sharedDrive.name === driveFilter);

  const adminRoles: MatrixEntry[] = roles
    .filter((role) => role.name !== "ACCESS_ADMIN")
    .map((role) => {
      const mappings = role.mappings.map((mapping) => ({
        id: mapping.id,
        accessLevel: mapping.accessLevel,
        sharedDriveName: mapping.sharedDrive.name,
        restrictedFolderPath: mapping.restrictedFolder?.path,
        groupEmail: mapping.groupEmail
      }));

      return {
        id: role.id,
        name: role.name,
        description: role.description,
        family: getAdminRoleFamily({
          id: role.id,
          name: role.name,
          description: role.description,
          family: "",
          mappings
        }),
        mappings
      };
    })
    .filter((role) => {
      const matchesQuery = roleQuery ? `${role.name} ${role.description}`.toLowerCase().includes(roleQuery) : true;
      const matchesDrive =
        driveFilter === "all" ? true : role.mappings.some((mapping) => mapping.sharedDriveName === driveFilter);

      return matchesQuery && matchesDrive;
    });

  const businessRoles: MatrixEntry[] = accessRoles
    .map((role) => ({
      id: role.id,
      name: role.displayName,
      description: role.description,
      family: role.department === "Cross-drive" ? "Cross-drive" : `${role.department === "QMS" ? "01_QualityAssurance_Working" : role.department === "Strategic" ? "02_Strategic_Working" : role.department === "Operational" ? "03_Operational_Working" : role.department === "Support" ? "04_Support_Working" : role.department}`,
      mappings: role.mappings.map((mapping) => ({
        id: mapping.id,
        accessLevel: mapping.accessLevel,
        sharedDriveName: mapping.sharedDrive.name,
        restrictedFolderPath: mapping.restrictedFolder?.path,
        groupEmail: mapping.groupEmail
      }))
    }))
    .filter((role) => {
      const matchesQuery = roleQuery ? `${role.name} ${role.description}`.toLowerCase().includes(roleQuery) : true;
      const matchesDrive =
        driveFilter === "all" ? true : role.mappings.some((mapping) => mapping.sharedDriveName === driveFilter);

      return matchesQuery && matchesDrive;
    });

  const adminGroupedRoles = groupEntriesByFamily(adminRoles);
  const businessGroupedRoles = groupEntriesByFamily(businessRoles);

  const totalAdminMappings = adminRoles.reduce((count, role) => count + role.mappings.length, 0);
  const totalBusinessMappings = businessRoles.reduce((count, role) => count + role.mappings.length, 0);

  const driveColumns = filteredDrives.map((drive) => ({ id: drive.name, label: drive.name }));
  const restrictedColumns = filteredRestrictedFolders.map((folder) => ({
    id: `restricted:${folder.path}`,
    label: folder.name
  }));

  const showAdminCatalog = catalogFilter === "all" || catalogFilter === "admin";
  const showBusinessCatalog = catalogFilter === "all" || catalogFilter === "business";
  const manageableAdminRoles = roles.filter((role) => role.name !== "ACCESS_ADMIN");
  const editableAdminMappings = adminRoles
    .flatMap((role) =>
      role.mappings
        .filter((mapping) => !mapping.restrictedFolderPath)
        .map((mapping) => ({
          ...mapping,
          roleName: role.name
        }))
    )
    .sort((left, right) => `${left.roleName}-${left.sharedDriveName}-${left.groupEmail}`.localeCompare(`${right.roleName}-${right.sharedDriveName}-${right.groupEmail}`));
  const editableBusinessMappings = businessRoles
    .flatMap((role) =>
      role.mappings
        .filter((mapping) => !mapping.restrictedFolderPath)
        .map((mapping) => ({
          ...mapping,
          roleName: role.name
        }))
    )
    .sort((left, right) => `${left.roleName}-${left.sharedDriveName}-${left.groupEmail}`.localeCompare(`${right.roleName}-${right.sharedDriveName}-${right.groupEmail}`));

  return (
    <div className="stack">
      <section className="hero-card">
        <div className="eyebrow-row">
          <div className="eyebrow">Role Matrix</div>
          <span className="pill">Visual coverage</span>
        </div>
        <h2>Role-to-folder access matrix</h2>
        <p>
          Compare the current RBAC model running in the app with the business-role catalog now stored as a separate planning layer.
        </p>
      </section>

      <section className="stat-strip">
        <article className="panel stat-card">
          <span>Admin roles</span>
          <strong>{adminRoles.length}</strong>
        </article>
        <article className="panel stat-card">
          <span>Business roles</span>
          <strong>{businessRoles.length}</strong>
        </article>
        <article className="panel stat-card">
          <span>Total mappings</span>
          <strong>{totalAdminMappings + totalBusinessMappings}</strong>
        </article>
      </section>

      <section className="panel">
        <div className="section-head">
          <div>
            <h3>Matrix filters</h3>
            <p className="muted">Compare live admin roles against business access roles without leaving this screen.</p>
          </div>
          <span className="pill">Fast scan</span>
        </div>
        <form className="search-bar" action="/role-matrix">
          <input
            type="search"
            name="q"
            defaultValue={roleQuery}
            placeholder="Filter roles by name"
            aria-label="Filter roles by name"
          />
          <select name="drive" defaultValue={driveFilter} aria-label="Filter by drive">
            <option value="all">All drives</option>
            {drives.map((drive) => (
              <option key={drive.id} value={drive.name}>
                {drive.name}
              </option>
            ))}
          </select>
          <select name="catalog" defaultValue={catalogFilter} aria-label="Filter by role catalog">
            <option value="all">All catalogs</option>
            <option value="admin">Admin roles only</option>
            <option value="business">Business roles only</option>
          </select>
          <select name="view" defaultValue={viewFilter} aria-label="Filter matrix section">
            <option value="all">All sections</option>
            <option value="drives">Drive access only</option>
            <option value="restricted">Restricted only</option>
          </select>
          <button type="submit">Apply</button>
        </form>
      </section>

      {showAdminCatalog && (
        <section className="panel inset-panel">
          <div className="section-head">
            <div>
              <h3>Current admin role catalog</h3>
              <p className="muted">This is the live RBAC model currently enforced by the application.</p>
            </div>
            <span className="pill">Live RBAC</span>
          </div>
          <p className="matrix-note">
            Assignments in this catalog are the ones that currently drive Google Group membership changes from the Users module.
          </p>
        </section>
      )}

      {showAdminCatalog && (
        <section className="panel">
          <div className="section-head">
            <div>
              <h3>App role mapping editor</h3>
              <p className="muted">
                Manage non-restricted Shared Drive visibility for app roles. This editor is intentionally limited to
                `VIEWER` and `CONTRIBUTOR`.
              </p>
            </div>
            <span className="pill">V1 safe edit</span>
          </div>

          <form action={createAdminRoleMapping} className="form-grid">
            <label className="field">
              <span>App role</span>
              <select name="roleId" required defaultValue="">
                <option value="" disabled>
                  Select app role
                </option>
                {manageableAdminRoles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Shared drive</span>
              <select name="sharedDriveId" required defaultValue="">
                <option value="" disabled>
                  Select Shared Drive
                </option>
                {drives.map((drive) => (
                  <option key={drive.id} value={drive.id}>
                    {drive.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field field-full">
              <span>Google group</span>
              <input type="email" name="groupEmail" placeholder="grp-reviewers@conceivable.life" required />
            </label>

            <label className="field">
              <span>Access level</span>
              <select name="accessLevel" required defaultValue="VIEWER">
                <option value="VIEWER">Viewer</option>
                <option value="CONTRIBUTOR">Contributor</option>
              </select>
            </label>

            <div className="card-note field-full">
              App roles inherit access across the whole Shared Drive. Non-restricted folders are covered automatically by that
              drive-level mapping. Restricted folders stay out of scope in this editor.
            </div>

            <div className="form-actions">
              <button type="submit">Add mapping</button>
            </div>
          </form>

          <table className="table-tight" style={{ marginTop: 24 }}>
            <thead>
              <tr>
                <th>App role</th>
                <th>Shared Drive</th>
                <th>Mapping editor</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {editableAdminMappings.length > 0 ? (
                editableAdminMappings.map((mapping) => (
                  <tr key={`editable-${mapping.id}`}>
                    <td>{mapping.roleName.replaceAll("_", " ")}</td>
                    <td>{mapping.sharedDriveName}</td>
                    <td>
                      <form action={updateAdminRoleMapping} className="inline-edit-form">
                        <input type="hidden" name="mappingId" value={mapping.id} />
                        <input type="email" name="groupEmail" defaultValue={mapping.groupEmail} required />
                        <select name="accessLevel" defaultValue={mapping.accessLevel}>
                          <option value="VIEWER">Viewer</option>
                          <option value="CONTRIBUTOR">Contributor</option>
                        </select>
                        <button type="submit" className="button-ghost">
                          Save
                        </button>
                      </form>
                    </td>
                    <td>
                      <form action={deleteAdminRoleMapping}>
                        <input type="hidden" name="mappingId" value={mapping.id} />
                        <button type="submit" className="button-ghost">
                          Remove
                        </button>
                      </form>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="muted">
                    No non-restricted app-role mappings available in the current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      )}

      {showAdminCatalog && (viewFilter === "all" || viewFilter === "drives") && (
        <MatrixTable
          title="Admin role Shared Drive matrix"
          description="Each cell shows the inherited drive access currently granted by the app role."
          pill="Admin drives"
          groupedRoles={adminGroupedRoles}
          columns={driveColumns}
          emptyLabel="No access"
        />
      )}

      {showAdminCatalog && (viewFilter === "all" || viewFilter === "restricted") && (
        <MatrixTable
          title="Admin role restricted matrix"
          description="This shows restricted-folder access modeled directly in the current admin catalog."
          pill="Admin restricted"
          groupedRoles={adminGroupedRoles}
          columns={restrictedColumns}
          emptyLabel="Exception only"
        />
      )}

      {showBusinessCatalog && (
        <section className="panel inset-panel">
          <div className="section-head">
            <div>
              <h3>Business access role catalog</h3>
              <p className="muted">This catalog now lives in the database as a separate planning and policy layer.</p>
            </div>
            <span className="pill warn">Reference model</span>
          </div>
          <p className="matrix-note">
            These roles represent company vocabulary like Quality Manager and Software Developer. They are stored and assignable, but still separate from the live admin-role membership workflow.
          </p>
        </section>
      )}

      {showBusinessCatalog && (
        <section className="panel">
          <div className="section-head">
            <div>
              <h3>Business role mapping editor</h3>
              <p className="muted">
                Add drive-level `Viewer` or `Contributor` access to business roles when the need is clear and the
                folder is not restricted.
              </p>
            </div>
            <span className="pill">V1 safe edit</span>
          </div>

          <form action={createBusinessRoleMapping} className="form-grid">
            <label className="field">
              <span>Business role</span>
              <select name="accessRoleId" required defaultValue="">
                <option value="" disabled>
                  Select business role
                </option>
                {accessRoles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.displayName}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Shared drive</span>
              <select name="sharedDriveId" required defaultValue="">
                <option value="" disabled>
                  Select Shared Drive
                </option>
                {drives.map((drive) => (
                  <option key={drive.id} value={drive.id}>
                    {drive.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field field-full">
              <span>Google group</span>
              <input type="email" name="groupEmail" placeholder="grp-quality-editor@conceivable.life" required />
            </label>

            <label className="field">
              <span>Access level</span>
              <select name="accessLevel" required defaultValue="VIEWER">
                <option value="VIEWER">Viewer</option>
                <option value="CONTRIBUTOR">Contributor</option>
              </select>
            </label>

            <div className="card-note field-full">
              This editor only manages non-restricted drive mappings. Restricted folders like audits, HR, finance, and
              legal stay governed separately.
            </div>

            <div className="form-actions">
              <button type="submit">Add business mapping</button>
            </div>
          </form>

          <table className="table-tight" style={{ marginTop: 24 }}>
            <thead>
              <tr>
                <th>Business role</th>
                <th>Shared Drive</th>
                <th>Mapping editor</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {editableBusinessMappings.length > 0 ? (
                editableBusinessMappings.map((mapping) => (
                  <tr key={`editable-business-${mapping.id}`}>
                    <td>{mapping.roleName}</td>
                    <td>{mapping.sharedDriveName}</td>
                    <td>
                      <form action={updateBusinessRoleMapping} className="inline-edit-form">
                        <input type="hidden" name="mappingId" value={mapping.id} />
                        <input type="email" name="groupEmail" defaultValue={mapping.groupEmail} required />
                        <select name="accessLevel" defaultValue={mapping.accessLevel}>
                          <option value="VIEWER">Viewer</option>
                          <option value="CONTRIBUTOR">Contributor</option>
                        </select>
                        <button type="submit" className="button-ghost">
                          Save
                        </button>
                      </form>
                    </td>
                    <td>
                      <form action={deleteBusinessRoleMapping}>
                        <input type="hidden" name="mappingId" value={mapping.id} />
                        <button type="submit" className="button-ghost">
                          Remove
                        </button>
                      </form>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="muted">
                    No non-restricted business-role mappings available in the current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      )}

      {showBusinessCatalog && (viewFilter === "all" || viewFilter === "drives") && (
        <MatrixTable
          title="Business role Shared Drive matrix"
          description="Use this to review the target drive coverage for company roles before we switch enforcement to AccessRole."
          pill="Business drives"
          groupedRoles={businessGroupedRoles}
          columns={driveColumns}
          emptyLabel="No access"
        />
      )}

      {showBusinessCatalog && (viewFilter === "all" || viewFilter === "restricted") && (
        <MatrixTable
          title="Business role restricted matrix"
          description="This highlights where restricted folders look role-based by policy versus exception-first."
          pill="Business restricted"
          groupedRoles={businessGroupedRoles}
          columns={restrictedColumns}
          emptyLabel="Exception only"
        />
      )}
    </div>
  );
}
