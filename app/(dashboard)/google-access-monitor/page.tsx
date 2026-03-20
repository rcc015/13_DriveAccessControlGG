import { AccessDenied } from "@/components/dashboard/access-denied";
import { ReconcilePanel } from "@/components/dashboard/reconcile-panel";
import { adminAndReadRoles, hasAnyRole } from "@/lib/auth/authorization";
import { requireSession } from "@/lib/auth/session";
import { GoogleAccessMonitorService } from "@/lib/services/google-access-monitor-service";

function formatGroupLabel(groupEmail: string) {
  return groupEmail.replace("@conceivable.life", "");
}

function formatStatus(status: "ALIGNED" | "MISSING" | "UNEXPECTED" | "ROLE_MISMATCH" | "LIMITED_ACCESS_DISABLED") {
  switch (status) {
    case "ALIGNED":
      return { label: "Aligned", className: "pill" };
    case "LIMITED_ACCESS_DISABLED":
      return { label: "Limited access disabled", className: "pill warn" };
    case "MISSING":
      return { label: "Missing expected access", className: "pill warn" };
    case "UNEXPECTED":
      return { label: "Unexpected access", className: "pill warn" };
    case "ROLE_MISMATCH":
      return { label: "Role mismatch", className: "pill warn" };
  }
}

export default async function GoogleAccessMonitorPage() {
  const session = await requireSession();

  if (!hasAnyRole(session, adminAndReadRoles)) {
    return (
      <AccessDenied
        title="Google access monitor restricted"
        description="Only admins, reviewers, and auditors can inspect Google Drive access drift."
      />
    );
  }

  const service = new GoogleAccessMonitorService();
  const snapshot = await service.getMonitorSnapshot();

  const driftItems = [...snapshot.sharedDriveRows, ...snapshot.restrictedFolderRows].flatMap((row) => {
    const items = [];

    if (row.status === "LIMITED_ACCESS_DISABLED") {
      items.push(`${row.resourceName}: limited access is disabled.`);
    }

    for (const item of row.missingGroups) {
      items.push(`${row.resourceName}: missing ${item}.`);
    }

    for (const item of row.unexpectedGroups) {
      items.push(`${row.resourceName}: unexpected ${item}.`);
    }

    for (const item of row.roleMismatches) {
      items.push(`${row.resourceName}: ${item}.`);
    }

    for (const user of row.directUsers) {
      items.push(`${row.resourceName}: direct user access for ${user}.`);
    }

    if (row.errorMessage) {
      items.push(`${row.resourceName}: ${row.errorMessage}`);
    }

    return items;
  });

  return (
    <div className="stack">
      <section className="hero-card">
        <div className="eyebrow-row">
          <div className="eyebrow">Google Drive</div>
          <span className="pill">Expected vs actual</span>
        </div>
        <h2>Google access monitor</h2>
        <p>
          Compare RBAC policy from the app with the real Google Drive ACL state for Shared Drives and
          restricted folders.
        </p>
      </section>

      <section className="stat-strip">
        <article className="panel stat-card">
          <span>Shared Drives aligned</span>
          <strong>
            {snapshot.summary.sharedDriveAlignedCount}/{snapshot.summary.sharedDriveCount}
          </strong>
        </article>
        <article className="panel stat-card">
          <span>Restricted folders aligned</span>
          <strong>
            {snapshot.summary.restrictedFolderAlignedCount}/{snapshot.summary.restrictedFolderCount}
          </strong>
        </article>
        <article className="panel stat-card">
          <span>Missing expected grants</span>
          <strong>{snapshot.summary.missingCount}</strong>
        </article>
        <article className="panel stat-card">
          <span>Unexpected direct access</span>
          <strong>{snapshot.summary.unexpectedCount}</strong>
        </article>
      </section>

      <ReconcilePanel preview={snapshot.reconcilePreview} />

      <section className="panel">
        <div className="section-head">
          <div>
            <h3>Shared Drive drift</h3>
            <p className="muted">Expected Google Groups vs actual members on each Shared Drive.</p>
          </div>
          <span className="pill">Drive ACL</span>
        </div>
        <table className="table-tight">
          <thead>
            <tr>
              <th>Shared Drive</th>
              <th>Expected groups</th>
              <th>Actual groups</th>
              <th>Direct users</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.sharedDriveRows.map((row) => {
              const status = formatStatus(row.status);

              return (
                <tr key={row.resourceName}>
                  <td>{row.resourceName}</td>
                  <td>{row.expectedGroups.map((group) => formatGroupLabel(group.email)).join(", ") || "None"}</td>
                  <td>{row.actualGroups.map((group) => formatGroupLabel(group.email)).join(", ") || "None"}</td>
                  <td>{row.errorMessage ? row.errorMessage : row.directUsers.join(", ") || "None"}</td>
                  <td>
                    <span className={status.className}>{status.label}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <div className="section-head">
          <div>
            <h3>Restricted folder drift</h3>
            <p className="muted">Checks limited access mode plus direct ACLs on restricted folders.</p>
          </div>
          <span className="pill warn">Restricted surface</span>
        </div>
        <table className="table-tight">
          <thead>
            <tr>
              <th>Restricted folder</th>
              <th>Limited access</th>
              <th>Expected groups</th>
              <th>Actual groups</th>
              <th>Direct users</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.restrictedFolderRows.map((row) => {
              const status = formatStatus(row.status);

              return (
                <tr key={row.resourceName}>
                  <td>{row.resourceName}</td>
                  <td>{row.limitedAccess ? "Yes" : "No"}</td>
                  <td>{row.expectedGroups.map((group) => formatGroupLabel(group.email)).join(", ") || "None"}</td>
                  <td>{row.actualGroups.map((group) => formatGroupLabel(group.email)).join(", ") || "None"}</td>
                  <td>{row.errorMessage ? row.errorMessage : row.directUsers.join(", ") || "None"}</td>
                  <td>
                    <span className={status.className}>{status.label}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <div className="section-head">
          <div>
            <h3>Drift findings</h3>
            <p className="muted">Concrete items to review in Google Drive or reconcile from the app.</p>
          </div>
          <span className="pill">{driftItems.length === 0 ? "No drift" : `${driftItems.length} findings`}</span>
        </div>
        <ul className="clean">
          {driftItems.length > 0 ? (
            driftItems.map((item) => <li key={item}>{item}</li>)
          ) : (
            <li className="muted">No drift detected between RBAC policy and Google Drive ACLs.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
