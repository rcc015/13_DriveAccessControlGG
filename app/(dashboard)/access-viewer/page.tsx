import { AccessDenied } from "@/components/dashboard/access-denied";
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
  const email = params.email?.trim() || "";
  const accessViewer = new AccessViewerService();
  const access = await accessViewer.getUserAccess(email);

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
          <input type="email" name="email" defaultValue={email} placeholder="user@company.com" />
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
            {access.appRoles.length > 0 ? (
              access.appRoles.map((role) => <li key={role}>{role.replaceAll("_", " ")}</li>)
            ) : (
              <li className="muted">No app roles assigned.</li>
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
            {access.accessRoles.length > 0 ? (
              access.accessRoles.map((role) => <li key={role}>{role}</li>)
            ) : (
              <li className="muted">No business access roles assigned.</li>
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
            {access.groups.length > 0 ? (
              access.groups.map((group) => <li key={group}>{group}</li>)
            ) : (
              <li className="muted">No mapped group memberships found.</li>
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
            {access.restrictedFolderExceptions.length > 0 ? (
              access.restrictedFolderExceptions.map((path) => <li key={path}>{path}</li>)
            ) : (
              <li className="muted">No restricted-folder grants recorded for this user.</li>
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
            {access.inheritedSharedDrives.length > 0 ? (
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
                  No inherited Shared Drive access found for this user.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
