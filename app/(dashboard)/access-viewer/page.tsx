import { AccessDenied } from "@/components/dashboard/access-denied";
import { UserAutocomplete } from "@/components/dashboard/user-autocomplete";
import { adminAndReadRoles, hasAnyRole } from "@/lib/auth/authorization";
import { requireSession } from "@/lib/auth/session";
import { AccessViewerService } from "@/lib/services/access-viewer-service";

interface AccessViewerPageProps {
  searchParams?: Promise<{
    email?: string;
  }>;
}

export default async function AccessViewerPage({ searchParams }: AccessViewerPageProps) {
  const session = await requireSession();

  if (!hasAnyRole(session, adminAndReadRoles)) {
    return <AccessDenied />;
  }

  const params = (await searchParams) ?? {};
  const email = params.email?.trim().toLowerCase() || "";
  const accessViewer = new AccessViewerService();
  const hasSearch = email.length > 0;
  const access = hasSearch
    ? await accessViewer.getUserAccess(email)
    : {
        userFound: false,
        appRoles: [],
        accessRoles: [],
        groups: [],
        inheritedSharedDrives: [],
        restrictedFolderExceptions: []
      };

  return (
    <div className="stack">
      <section className="hero-card">
        <div className="eyebrow-row">
          <div className="eyebrow">Module 02</div>
          <span className="pill">Effective access</span>
        </div>
        <h2>User access viewer</h2>
        <p>
          Inspect effective access for a single user, separating baseline Shared Drive access from
          restricted-folder grants that have actually been approved or applied.
        </p>
      </section>

      <section className="panel">
        <div className="section-head">
          <div>
            <h3>Lookup user</h3>
            <p className="muted">This view is safe for admins, reviewers, and auditors.</p>
          </div>
          <span className="pill">Effective access</span>
        </div>
        <form className="search-bar" action="/access-viewer">
          <UserAutocomplete
            label="User"
            name="email"
            defaultEmail={email}
            placeholder="Search by name or email"
            className="field search-autocomplete"
          />
          <button type="submit">View access</button>
        </form>
      </section>

      <section className="two-up">
        <article className="panel">
          <div className="section-head">
            <div>
              <h3>App roles</h3>
              <p className="muted">Administrative roles that authorize use of the app itself.</p>
            </div>
          </div>
          <ul className="clean">
            {!hasSearch ? (
              <li className="muted">Enter an email to inspect app roles.</li>
            ) : access.appRoles.length > 0 ? (
              access.appRoles.map((role) => <li key={role}>{role.replaceAll("_", " ")}</li>)
            ) : (
              <li className="muted">{access.userFound ? "No app roles assigned." : "User not found."}</li>
            )}
          </ul>
        </article>

        <article className="panel">
          <div className="section-head">
            <div>
              <h3>Business access roles</h3>
              <p className="muted">Company-facing roles like Quality Manager or Software Developer.</p>
            </div>
          </div>
          <ul className="clean">
            {!hasSearch ? (
              <li className="muted">Enter an email to inspect business access roles.</li>
            ) : access.accessRoles.length > 0 ? (
              access.accessRoles.map((role) => <li key={role}>{role}</li>)
            ) : (
              <li className="muted">
                {access.userFound ? "No business access roles assigned." : "User not found."}
              </li>
            )}
          </ul>
        </article>
      </section>

      <section className="two-up">
        <article className="panel">
          <div className="section-head">
            <div>
              <h3>Google Groups</h3>
              <p className="muted">Mapped memberships active for this user.</p>
            </div>
          </div>
          <ul className="clean">
            {!hasSearch ? (
              <li className="muted">Enter an email to inspect mapped memberships.</li>
            ) : access.groups.length > 0 ? (
              access.groups.map((group) => <li key={group}>{group}</li>)
            ) : (
              <li className="muted">
                {access.userFound ? "No mapped group memberships found." : "User not found."}
              </li>
            )}
          </ul>
        </article>

        <article className="panel">
          <div className="section-head">
            <div>
              <h3>Approved restricted grants</h3>
              <p className="muted">Restricted-folder access that has actually been approved or granted.</p>
            </div>
          </div>
          <ul className="clean">
            {!hasSearch ? (
              <li className="muted">Enter an email to inspect restricted-folder grants.</li>
            ) : access.restrictedFolderExceptions.length > 0 ? (
              access.restrictedFolderExceptions.map((path) => <li key={path}>{path}</li>)
            ) : (
              <li className="muted">
                {access.userFound
                  ? "No restricted-folder grants recorded for this user."
                  : "User not found."}
              </li>
            )}
          </ul>
        </article>
      </section>

      <section className="panel">
        <div className="section-head">
          <div>
            <h3>Inherited Shared Drive access</h3>
            <p className="muted">This section reflects group-based drive inheritance only. Restricted folders appear here only when access has been granted.</p>
          </div>
          <span className="pill warn">RBAC path</span>
        </div>
        <table className="table-tight">
          <thead>
            <tr>
              <th>Shared Drive</th>
              <th>Via Google Groups</th>
              <th>Granted restricted paths on this drive</th>
            </tr>
          </thead>
          <tbody>
            {!hasSearch ? (
              <tr>
                <td colSpan={3} className="muted">
                  Enter an email to inspect inherited Shared Drive access.
                </td>
              </tr>
            ) : access.inheritedSharedDrives.length > 0 ? (
              access.inheritedSharedDrives.map((summary) => (
                <tr key={summary.sharedDriveName}>
                  <td>{summary.sharedDriveName}</td>
                  <td>{summary.viaGroups.join(", ")}</td>
                  <td>
                    {access.restrictedFolderExceptions.filter((path) =>
                      path.startsWith(summary.sharedDriveName)
                    ).join(", ") || "None granted"}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="muted">
                  {access.userFound
                    ? "No inherited Shared Drive access found for this user."
                    : "User not found."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
