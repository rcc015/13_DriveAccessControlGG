import { AccessDenied } from "@/components/dashboard/access-denied";
import { OrphanedMembershipCleanupForm } from "@/components/dashboard/orphaned-membership-cleanup-form";
import {
  assignUserAccessRole,
  assignUserRole,
  removeUserAccessRole,
  removeUserRole
} from "@/app/(dashboard)/users/actions";
import { adminAssignmentRoles, hasAnyRole } from "@/lib/auth/authorization";
import { requireSession } from "@/lib/auth/session";
import { env } from "@/lib/config/env";
import { prisma } from "@/lib/db/prisma";
import { getDirectoryProvider } from "@/lib/google/provider-factory";
import type { AppRoleName } from "@/types/domain";

interface UsersPageProps {
  searchParams?: Promise<{
    q?: string;
  }>;
}

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const session = await requireSession();

  if (!hasAnyRole(session, adminAssignmentRoles)) {
    return (
      <AccessDenied
        title="Users module restricted"
        description="Only Super Admin and Access Admin can assign roles and manage mapped group membership."
      />
    );
  }

  const params = (await searchParams) ?? {};
  const query = params.q?.trim() ?? "";
  const directory = getDirectoryProvider();

  const [roles, accessRoles, groupMappings, users, assignments, accessAssignments, activeMemberships] = await Promise.all([
    prisma.role.findMany({
      include: {
        mappings: {
          where: {
            restrictedFolderId: null
          },
          include: {
            sharedDrive: true
          }
        }
      },
      orderBy: { name: "asc" }
    }),
    prisma.accessRole
      .findMany({
        include: {
          mappings: {
            where: {
              restrictedFolderId: null
            },
            include: {
              sharedDrive: true
            }
          }
        },
        orderBy: [{ department: "asc" }, { displayName: "asc" }]
      })
      .catch(() => []),
    prisma.groupMapping.findMany({
      include: {
        role: true,
        sharedDrive: true,
        restrictedFolder: true
      },
      orderBy: [{ sharedDrive: { name: "asc" } }, { groupEmail: "asc" }]
    }),
    directory.searchUsers(query || "company"),
    prisma.userRole.findMany({
      include: {
        user: true,
        role: true
      },
      orderBy: [{ assignedAt: "desc" }]
    }),
    prisma.userAccessRole
      .findMany({
        include: {
          user: true,
          accessRole: true
        },
        orderBy: [{ assignedAt: "desc" }]
      })
      .catch(() => []),
    prisma.groupMembership.findMany({
      where: {
        revokedAt: null
      },
      include: {
        user: true,
        groupMapping: {
          include: {
            sharedDrive: true,
            restrictedFolder: true
          }
        },
        accessRoleMapping: {
          include: {
            accessRole: true,
            sharedDrive: true,
            restrictedFolder: true
          }
        }
      },
      orderBy: [{ user: { email: "asc" } }, { grantedAt: "desc" }]
    })
  ]).catch(() => [[], [], [], [], [], [], []] as const);

  const roleLabels: Record<AppRoleName, string> = {
    SUPER_ADMIN: "Super Admin",
    ACCESS_ADMIN: "Access Admin (Legacy)",
    QMS_ACCESS_ADMIN: "QMS Access Admin",
    STRATEGIC_ACCESS_ADMIN: "Strategic Access Admin",
    OPERATIONAL_ACCESS_ADMIN: "Operational Access Admin",
    SUPPORT_ACCESS_ADMIN: "Support Access Admin",
    REVIEWER: "Reviewer",
    READ_ONLY_AUDITOR: "Read-only Auditor"
  };

  const assignableRoles = roles.filter((role) => role.name !== "ACCESS_ADMIN");
  const roleCatalog = assignableRoles.map((role) => {
    const mappedGroups = role.mappings.map((mapping) => mapping.groupEmail);
    const drives = Array.from(new Set(role.mappings.map((mapping) => mapping.sharedDrive.name)));

    return {
      id: role.id,
      name: role.name,
      label: roleLabels[role.name],
      description: role.description,
      mappedGroups,
      drives,
      grantsInheritedAccess: mappedGroups.length > 0
    };
  });

  const groupedMappings = groupMappings.slice(0, 8);
  const accessRoleCatalog = accessRoles.map((role) => {
    const mappedGroups = role.mappings.map((mapping) => mapping.groupEmail);
    const drives = Array.from(new Set(role.mappings.map((mapping) => mapping.sharedDrive.name)));

    return {
      id: role.id,
      code: role.code,
      label: role.displayName,
      department: role.department,
      description: role.description,
      restrictedAccessMode: role.restrictedAccessMode,
      mappedGroups,
      drives
    };
  });
  const assignedAppRoleUsers = new Set(assignments.map((assignment) => assignment.user.email));
  const assignedAccessRoleUsers = new Set(accessAssignments.map((assignment) => assignment.user.email));
  type ActiveMembership = (typeof activeMemberships)[number];
  const membershipsByUser = activeMemberships.reduce<
    Array<{
      email: string;
      displayName: string;
      memberships: ActiveMembership[];
      hasLocalAssignments: boolean;
      appRoleAssignmentCount: number;
      accessRoleAssignmentCount: number;
    }>
  >((acc, membership) => {
    const existing = acc.find((item) => item.email === membership.user.email);
    const hasAppAssignment = assignedAppRoleUsers.has(membership.user.email);
    const hasAccessAssignment = assignedAccessRoleUsers.has(membership.user.email);

    if (existing) {
      existing.memberships.push(membership);
      return acc;
    }

    acc.push({
      email: membership.user.email,
      displayName: membership.user.displayName,
      memberships: [membership],
      hasLocalAssignments: hasAppAssignment || hasAccessAssignment,
      appRoleAssignmentCount: hasAppAssignment ? assignments.filter((assignment) => assignment.user.email === membership.user.email).length : 0,
      accessRoleAssignmentCount: hasAccessAssignment
        ? accessAssignments.filter((assignment) => assignment.user.email === membership.user.email).length
        : 0
    });

    return acc;
  }, []);

  return (
    <div className="stack">
      <section className="hero-card">
        <div className="eyebrow-row">
          <div className="eyebrow">Module 01</div>
          <span className="pill">RBAC assignment</span>
        </div>
        <h2>User role assignment</h2>
        <p>
          Search Google Workspace users, map them to internal roles, and enforce Google Group
          membership changes as the only default route to Shared Drive access.
        </p>
      </section>

      <section className="stat-strip">
        <article className="panel stat-card">
          <span>Directory results</span>
          <strong>{users.length}</strong>
        </article>
        <article className="panel stat-card">
          <span>App roles</span>
          <strong>{roles.length}</strong>
        </article>
        <article className="panel stat-card">
          <span>Access roles</span>
          <strong>{accessRoles.length}</strong>
        </article>
      </section>

      <section className="panel">
        <div className="section-head">
          <div>
            <h3>Assign app role</h3>
            <p className="muted">
              This creates the local role assignment and any derived group memberships for the selected role.
            </p>
          </div>
          <span className="pill warn">Write action</span>
        </div>
        <form action={assignUserRole} className="form-grid">
          <label className="field">
            <span>User email</span>
            <input
              type="email"
              name="userEmail"
              defaultValue={typeof users[0]?.primaryEmail === "string" ? users[0].primaryEmail : ""}
              placeholder="user@company.com"
              required
            />
          </label>
          <label className="field">
            <span>Display name</span>
            <input
              type="text"
              name="displayName"
              defaultValue={typeof users[0]?.name?.fullName === "string" ? users[0].name.fullName : ""}
              placeholder="Full name"
            />
          </label>
          <label className="field field-full">
            <span>App role</span>
            <select name="roleId" required defaultValue="">
              <option value="" disabled>
                Select role
              </option>
              {assignableRoles.map((role) => (
                <option key={role.id} value={role.id}>
                  {roleLabels[role.name]}
                </option>
              ))}
            </select>
          </label>
          <div className="form-actions">
            <button type="submit">Assign role</button>
          </div>
        </form>
        <p className="card-note">
          App roles can remain app-only, or they can inherit non-restricted Shared Drive visibility when the role matrix maps
          them to Google Groups. Legacy `ACCESS_ADMIN` is hidden for new assignments.
        </p>
      </section>

      <section className="panel">
        <div className="section-head">
          <div>
            <h3>Assign business access role</h3>
            <p className="muted">
              This stores the company-facing access role separately from the administrative role that operates the app.
            </p>
          </div>
          <span className="pill">Business role</span>
        </div>
        <form action={assignUserAccessRole} className="form-grid">
          <label className="field">
            <span>User email</span>
            <input
              type="email"
              name="userEmail"
              defaultValue={typeof users[0]?.primaryEmail === "string" ? users[0].primaryEmail : ""}
              placeholder="user@company.com"
              required
            />
          </label>
          <label className="field">
            <span>Display name</span>
            <input
              type="text"
              name="displayName"
              defaultValue={typeof users[0]?.name?.fullName === "string" ? users[0].name.fullName : ""}
              placeholder="Full name"
            />
          </label>
          <label className="field field-full">
            <span>Access role</span>
            <select name="accessRoleId" required defaultValue="">
              <option value="" disabled>
                Select business access role
              </option>
              {accessRoles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.displayName}
                </option>
              ))}
            </select>
          </label>
          <div className="form-actions">
            <button type="submit">Assign access role</button>
          </div>
        </form>
        <p className="card-note">
          This first implementation stores the business-role catalog and assignment state in the app so we can separate policy from admin permissions cleanly.
        </p>
      </section>

      <section className="panel">
        <div className="section-head">
          <div>
            <h3>Search directory users</h3>
            <p className="muted">
              {env.GOOGLE_INTEGRATION_MODE === "google"
                ? "Live Directory API search is active for Google Workspace users."
                : "Mock Directory search is active until live Google integration is enabled."}
            </p>
          </div>
          <span className="pill">User -&gt; Role -&gt; Group</span>
        </div>
        <form className="search-bar" action="/users">
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search by email or name"
            aria-label="Search users"
          />
          <button type="submit">Search</button>
        </form>
        <div className="two-up">
          <article className="panel inset-panel">
            <h3>Directory results</h3>
            <ul className="clean">
              {users.map((user) => (
                <li key={user.id}>
                  <strong>{user.name?.fullName || user.primaryEmail}</strong>
                  <div className="muted">{user.primaryEmail}</div>
                </li>
              ))}
            </ul>
          </article>
          <article className="panel inset-panel">
            <h3>Role impact preview</h3>
            <ul className="clean">
              {roleCatalog.map((role) => (
                <li key={role.id}>
                  <strong>{role.label}</strong>
                  <div className="muted">{role.description}</div>
                  <div className="muted">
                    {role.grantsInheritedAccess
                      ? `${role.drives.length} drive(s), ${role.mappedGroups.length} group mapping(s)`
                      : "No drive mappings configured yet; app-only by default"}
                  </div>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <section className="panel">
        <div className="section-head">
          <div>
            <h3>Business access role catalog</h3>
            <p className="muted">This is the company-facing access vocabulary we are now storing separately.</p>
          </div>
          <span className="pill warn">Policy model</span>
        </div>
        <table className="table-tight">
          <thead>
            <tr>
              <th>Access role</th>
              <th>Department</th>
              <th>Inherited drives</th>
              <th>Mapped groups</th>
              <th>Restricted mode</th>
            </tr>
          </thead>
          <tbody>
            {accessRoleCatalog.map((role) => (
              <tr key={role.id}>
                <td>
                  <strong>{role.label}</strong>
                  <div className="muted">{role.description}</div>
                </td>
                <td>{role.department}</td>
                <td>{role.drives.length > 0 ? role.drives.join(", ") : "None"}</td>
                <td>{role.mappedGroups.length > 0 ? role.mappedGroups.join(", ") : "None"}</td>
                <td>{role.restrictedAccessMode.replaceAll("_", " ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <div className="section-head">
          <div>
            <h3>Role-to-drive coverage</h3>
            <p className="muted">Preview the exact Shared Drive blast radius before assigning a role.</p>
          </div>
          <span className="pill">Least privilege</span>
        </div>
        <table className="table-tight">
          <thead>
            <tr>
              <th>Role</th>
              <th>Inherited drives</th>
              <th>Mapped groups</th>
              <th>Grant mode</th>
            </tr>
          </thead>
          <tbody>
            {roleCatalog.map((role) => (
              <tr key={role.id}>
                <td>{role.label}</td>
                <td>{role.drives.length > 0 ? role.drives.join(", ") : "None"}</td>
                <td>{role.mappedGroups.length > 0 ? role.mappedGroups.join(", ") : "None"}</td>
                <td>{role.grantsInheritedAccess ? "Derived group membership" : "App-only permission"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <div className="section-head">
          <div>
            <h3>Current business access role assignments</h3>
            <p className="muted">These assignments represent company roles like Quality Manager or Software Developer.</p>
          </div>
          <span className="pill">Business access state</span>
        </div>
        <table className="table-tight">
          <thead>
            <tr>
              <th>User</th>
              <th>Access role</th>
              <th>Department</th>
              <th>Assigned by</th>
              <th>Assigned at</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {accessAssignments.length > 0 ? (
              accessAssignments.map((assignment) => (
                <tr key={assignment.id}>
                  <td>
                    <strong>{assignment.user.displayName}</strong>
                    <div className="muted">{assignment.user.email}</div>
                  </td>
                  <td>{assignment.accessRole.displayName}</td>
                  <td>{assignment.accessRole.department}</td>
                  <td>{assignment.assignedBy}</td>
                  <td>{assignment.assignedAt.toISOString().slice(0, 10)}</td>
                  <td>
                    <form action={removeUserAccessRole}>
                      <input type="hidden" name="userAccessRoleId" value={assignment.id} />
                      <button type="submit" className="button-ghost">
                        Remove access role
                      </button>
                    </form>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="muted">
                  No business access role assignments have been created yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <div className="section-head">
          <div>
            <h3>Policy-mapped Google Groups</h3>
            <p className="muted">
              This is policy configuration only: role-to-group mappings that define the intended path to Shared Drive access.
              It does not mean those roles are currently assigned to users.
            </p>
          </div>
          <span className={`pill ${env.GOOGLE_INTEGRATION_MODE === "google" ? "" : "warn"}`}>
            {env.GOOGLE_INTEGRATION_MODE === "google" ? "Live integration" : "Mock integration"}
          </span>
        </div>
        <table className="table-tight">
          <thead>
            <tr>
              <th>Role</th>
              <th>Google Group</th>
              <th>Shared Drive</th>
              <th>Restricted folder</th>
            </tr>
          </thead>
          <tbody>
            {groupedMappings.map((mapping) => (
                <tr key={mapping.id}>
                <td>{roleLabels[mapping.role.name]}</td>
                <td>{mapping.groupEmail}</td>
                <td>{mapping.sharedDrive.name}</td>
                <td>{mapping.restrictedFolder?.path ?? "Inherited drive access"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <div className="section-head">
          <div>
            <h3>Current app role assignments</h3>
            <p className="muted">
              This is the real local RBAC state. Only users listed here currently hold app roles in the application.
            </p>
          </div>
          <span className="pill">Local RBAC state</span>
        </div>
        <table className="table-tight">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Assigned by</th>
              <th>Assigned at</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {assignments.length > 0 ? (
              assignments.map((assignment) => (
                <tr key={assignment.id}>
                  <td>
                    <strong>{assignment.user.displayName}</strong>
                    <div className="muted">{assignment.user.email}</div>
                  </td>
                  <td>{roleLabels[assignment.role.name]}</td>
                  <td>{assignment.assignedBy}</td>
                  <td>{assignment.assignedAt.toISOString().slice(0, 10)}</td>
                  <td>
                    <form action={removeUserRole}>
                      <input type="hidden" name="userRoleId" value={assignment.id} />
                      <button type="submit" className="button-ghost">
                        Remove role
                      </button>
                    </form>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="muted">
                  No app role assignments have been created yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <div className="section-head">
          <div>
            <h3>Active derived memberships by user</h3>
            <p className="muted">
              This section shows active `GroupMembership` records currently in force. These may exist without a current app
              role or business access role assignment if legacy data, seed data, or incomplete cleanup left memberships in
              place.
            </p>
          </div>
          <span className="pill warn">Operational view</span>
        </div>
        <div className="two-up">
          {membershipsByUser.length > 0 ? (
            membershipsByUser.map((entry) => (
              <article key={entry.email} className="panel inset-panel">
                <div className="section-head">
                  <div>
                    <h3>{entry.displayName}</h3>
                    <p className="muted">{entry.email}</p>
                  </div>
                  <span className={`pill ${entry.hasLocalAssignments ? "" : "warn"}`}>
                    {entry.hasLocalAssignments ? "Backed by local assignment" : "Membership without local assignment"}
                  </span>
                </div>
                <p className="muted">
                  {entry.appRoleAssignmentCount} app role assignment(s), {entry.accessRoleAssignmentCount} business access
                  role assignment(s)
                </p>
                {!entry.hasLocalAssignments ? (
                  <OrphanedMembershipCleanupForm userEmail={entry.email} />
                ) : null}
                <ul className="clean">
                  {entry.memberships.map((membership) => (
                    <li key={membership.id}>
                      <strong>{membership.groupMapping?.groupEmail ?? membership.accessRoleMapping?.groupEmail}</strong>
                      <div className="muted">
                        {membership.groupMapping?.sharedDrive.name ?? membership.accessRoleMapping?.sharedDrive.name}
                      </div>
                      <div className="muted">
                        {membership.groupMapping?.restrictedFolder?.path ??
                          membership.accessRoleMapping?.restrictedFolder?.path ??
                          "Inherited drive access"}
                      </div>
                      <div className="muted">
                        {membership.accessRoleMapping
                          ? `Business access role: ${membership.accessRoleMapping.accessRole.displayName}`
                          : "Administrative app role mapping"}
                      </div>
                    </li>
                  ))}
                </ul>
              </article>
            ))
          ) : (
            <article className="panel inset-panel">
              <p className="muted">No active memberships found yet.</p>
            </article>
          )}
        </div>
      </section>
    </div>
  );
}
