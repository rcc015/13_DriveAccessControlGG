import { AccessDenied } from "@/components/dashboard/access-denied";
import { adminAndReadRoles, hasAnyRole } from "@/lib/auth/authorization";
import { requireSession } from "@/lib/auth/session";
import { AccessViewerService } from "@/lib/services/access-viewer-service";

interface AccessViewerPageProps {
  searchParams?: Promise<{
    email?: string;
  }>;
}

const demoEmails = ["ana@company.com", "miguel@company.com", "lucia@company.com"];

export default async function AccessViewerPage({ searchParams }: AccessViewerPageProps) {
  const session = await requireSession();

  if (!hasAnyRole(session, adminAndReadRoles)) {
    return <AccessDenied />;
  }

  const params = (await searchParams) ?? {};
  const email = params.email?.trim() || demoEmails[0];
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
          Inspect effective access for a single user, keeping inherited Shared Drive access and
          restricted-folder exceptions clearly separated.
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
        <div className="quick-links">
          {demoEmails.map((demoEmail) => (
            <a key={demoEmail} href={`/access-viewer?email=${encodeURIComponent(demoEmail)}`} className="pill">
              {demoEmail}
            </a>
          ))}
        </div>
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
              <h3>Restricted exceptions</h3>
              <p className="muted">Approved exception-only paths.</p>
            </div>
          </div>
          <ul className="clean">
            {access.restrictedFolderExceptions.length > 0 ? (
              access.restrictedFolderExceptions.map((path) => <li key={path}>{path}</li>)
            ) : (
              <li className="muted">No approved restricted-folder exceptions.</li>
            )}
          </ul>
        </article>
      </section>

      <section className="panel">
        <div className="section-head">
          <div>
            <h3>Inherited Shared Drive access</h3>
            <p className="muted">This section reflects group-based drive inheritance only.</p>
          </div>
          <span className="pill warn">RBAC path</span>
        </div>
        <table className="table-tight">
          <thead>
            <tr>
              <th>Shared Drive</th>
              <th>Via Google Groups</th>
              <th>Restricted paths on this drive</th>
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
                    ).join(", ") || "None"}
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
