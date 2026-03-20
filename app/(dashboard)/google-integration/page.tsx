import { AccessDenied } from "@/components/dashboard/access-denied";
import {
  applyActiveEmployeeSync,
  applyOffboardingHygiene,
  runDirectorySearchProbe,
  runGroupMembersProbe
} from "@/app/(dashboard)/google-integration/actions";
import { hasAnyRole } from "@/lib/auth/authorization";
import { requireSession } from "@/lib/auth/session";
import { env } from "@/lib/config/env";
import { prisma } from "@/lib/db/prisma";
import { getDirectoryProvider } from "@/lib/google/provider-factory";
import { ActiveEmployeeSyncService, getAllEmployeesGroupEmail } from "@/lib/services/active-employee-sync-service";
import { OffboardingHygieneService } from "@/lib/services/offboarding-hygiene-service";

function formatProbeError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown Google API error.";
}

export default async function GoogleIntegrationPage() {
  const session = await requireSession();

  if (!hasAnyRole(session, ["SUPER_ADMIN"])) {
    return (
      <AccessDenied
        title="Google integration restricted"
        description="Only Super Admin can validate Google Workspace connectivity and delegated access."
      />
    );
  }

  const directory = getDirectoryProvider();
  const mappedGroups = await prisma.groupMapping.findMany({
    select: { groupEmail: true },
    distinct: ["groupEmail"],
    orderBy: { groupEmail: "asc" }
  });

  const defaultProbeQuery = session.email;
  const defaultGroupEmail = mappedGroups[0]?.groupEmail ?? "";
  const activeEmployeeSync = new ActiveEmployeeSyncService(directory);
  const offboardingHygiene = new OffboardingHygieneService(directory);

  const [directoryProbe, groupProbe, activeEmployeePreview, offboardingPreview] = await Promise.all([
    directory
      .searchUsers(defaultProbeQuery)
      .then((users) => ({
        ok: true as const,
        count: users.length,
        firstResult: users[0]?.primaryEmail ?? null
      }))
      .catch((error) => ({
        ok: false as const,
        error: formatProbeError(error)
      })),
    defaultGroupEmail
      ? directory
          .listGroupMembers(defaultGroupEmail)
          .then((members) => ({
            ok: true as const,
            count: members.length,
            firstMember: members[0]?.email ?? null
          }))
          .catch((error) => ({
            ok: false as const,
            error: formatProbeError(error)
          }))
      : Promise.resolve({
          ok: false as const,
          error: "No mapped groups found in the database."
        }),
    activeEmployeeSync.previewSync().catch((error) => ({
      activeCount: 0,
      currentMemberCount: 0,
      addEmails: [],
      removeEmails: [],
      error: formatProbeError(error)
    })),
    offboardingHygiene.previewOffboarding().catch((error) => ({
      inactiveUserCount: 0,
      appRoleAssignmentCount: 0,
      accessRoleAssignmentCount: 0,
      membershipRemovalCount: 0,
      exceptionRevokeCount: 0,
      directFolderRemovalCount: 0,
      users: [],
      error: formatProbeError(error)
    }))
  ]);

  const configChecks = [
    { label: "Integration mode", value: env.GOOGLE_INTEGRATION_MODE },
    { label: "Impersonated admin", value: env.GOOGLE_IMPERSONATED_ADMIN ?? "Missing" },
    { label: "Service account JSON", value: env.GOOGLE_SERVICE_ACCOUNT_JSON ? "Configured" : "Missing" },
    { label: "Reports folder ID", value: env.GOOGLE_REPORTS_FOLDER_ID ?? "Missing" }
  ];

  return (
    <div className="stack">
      <section className="hero-card">
        <div className="eyebrow-row">
          <div className="eyebrow">Google Workspace</div>
          <span className={`pill ${env.GOOGLE_INTEGRATION_MODE === "google" ? "" : "warn"}`}>
            {env.GOOGLE_INTEGRATION_MODE === "google" ? "Live integration" : "Mock integration"}
          </span>
        </div>
        <h2>Google integration verification</h2>
        <p>
          Validate delegated access to Directory API before using membership writes. This page uses
          read-only probes first so you can confirm impersonation, scopes, and group visibility safely.
        </p>
      </section>

      <section className="stat-strip">
        {configChecks.map((item) => (
          <article key={item.label} className="panel stat-card">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </article>
        ))}
      </section>

      <section className="two-up">
        <article className="panel inset-panel">
          <div className="section-head">
            <div>
              <h3>Directory search probe</h3>
              <p className="muted">Confirms `users.list` works with the delegated admin context.</p>
            </div>
            <span className={`pill ${directoryProbe.ok ? "" : "warn"}`}>
              {directoryProbe.ok ? "Probe passed" : "Probe failed"}
            </span>
          </div>
          <form action={runDirectorySearchProbe} className="form-grid">
            <label className="field field-full">
              <span>Query</span>
              <input type="text" name="query" defaultValue={defaultProbeQuery} required />
            </label>
            <div className="form-actions">
              <button type="submit">Run probe</button>
            </div>
          </form>
          <div className="card-note">
            {directoryProbe.ok ? (
              <>
                <strong>{directoryProbe.count}</strong> results returned.
                {directoryProbe.firstResult ? ` First result: ${directoryProbe.firstResult}.` : ""}
              </>
            ) : (
              directoryProbe.error
            )}
          </div>
        </article>

        <article className="panel inset-panel">
          <div className="section-head">
            <div>
              <h3>Group membership probe</h3>
              <p className="muted">Confirms the delegated admin can read members from a managed group.</p>
            </div>
            <span className={`pill ${groupProbe.ok ? "" : "warn"}`}>
              {groupProbe.ok ? "Probe passed" : "Probe failed"}
            </span>
          </div>
          <form action={runGroupMembersProbe} className="form-grid">
            <label className="field field-full">
              <span>Managed group</span>
              <select name="groupEmail" defaultValue={defaultGroupEmail} required>
                {mappedGroups.map((group) => (
                  <option key={group.groupEmail} value={group.groupEmail}>
                    {group.groupEmail}
                  </option>
                ))}
              </select>
            </label>
            <div className="form-actions">
              <button type="submit">Run probe</button>
            </div>
          </form>
          <div className="card-note">
            {groupProbe.ok ? (
              <>
                <strong>{groupProbe.count}</strong> members returned.
                {groupProbe.firstMember ? ` First member: ${groupProbe.firstMember}.` : ""}
              </>
            ) : (
              groupProbe.error
            )}
          </div>
        </article>
      </section>

      <section className="panel">
        <div className="section-head">
          <div>
            <h3>Offboarding hygiene</h3>
            <p className="muted">
              Detect inactive Directory users with RBAC-managed access and prepare cleanup.
            </p>
          </div>
          <span className="pill warn">Preview before apply</span>
        </div>
        {"error" in offboardingPreview ? (
          <div className="card-note">{offboardingPreview.error}</div>
        ) : (
          <>
            <div className="stat-strip">
              <article className="panel stat-card">
                <span>Inactive users detected</span>
                <strong>{offboardingPreview.inactiveUserCount}</strong>
              </article>
              <article className="panel stat-card">
                <span>Membership removals</span>
                <strong>{offboardingPreview.membershipRemovalCount}</strong>
              </article>
              <article className="panel stat-card">
                <span>Assignments to clear</span>
                <strong>
                  {offboardingPreview.appRoleAssignmentCount + offboardingPreview.accessRoleAssignmentCount}
                </strong>
              </article>
              <article className="panel stat-card">
                <span>Exceptions to revoke</span>
                <strong>{offboardingPreview.exceptionRevokeCount}</strong>
              </article>
              <article className="panel stat-card">
                <span>Direct folder access removals</span>
                <strong>{offboardingPreview.directFolderRemovalCount}</strong>
              </article>
            </div>
            <article className="panel inset-panel">
              <div className="section-head">
                <div>
                  <h3>Inactive users with managed access</h3>
                  <p className="muted">
                    Only users outside the active Directory set and within <code>@conceivable.life</code> are included.
                  </p>
                </div>
                <span className="pill warn">{offboardingPreview.users.length}</span>
              </div>
              <ul className="clean">
                {offboardingPreview.users.length > 0 ? (
                  offboardingPreview.users.map((user) => (
                    <li key={user.userEmail}>
                      <strong>{user.userEmail}</strong>
                      {user.displayName ? ` (${user.displayName})` : ""}: {user.membershipCount} memberships,{" "}
                      {user.appRoleCount} app roles, {user.accessRoleCount} business roles,{" "}
                      {user.exceptionCount} exceptions, {user.directFolderRemovalCount} direct folder removals
                    </li>
                  ))
                ) : (
                  <li className="muted">No offboarding actions proposed.</li>
                )}
              </ul>
            </article>
            <form action={applyOffboardingHygiene} className="form-actions">
              <button type="submit" disabled={!offboardingPreview.users.length}>
                Apply offboarding hygiene
              </button>
            </form>
          </>
        )}
      </section>

      <section className="panel">
        <div className="section-head">
          <div>
            <h3>Active employee sync</h3>
            <p className="muted">
              Sync Directory active users into <code>{getAllEmployeesGroupEmail()}</code>.
            </p>
          </div>
          <span className="pill">Directory-backed</span>
        </div>
        {"error" in activeEmployeePreview ? (
          <div className="card-note">{activeEmployeePreview.error}</div>
        ) : (
          <>
            <div className="stat-strip">
              <article className="panel stat-card">
                <span>Active Directory users</span>
                <strong>{activeEmployeePreview.activeCount}</strong>
              </article>
              <article className="panel stat-card">
                <span>Current group members</span>
                <strong>{activeEmployeePreview.currentMemberCount}</strong>
              </article>
              <article className="panel stat-card">
                <span>To add</span>
                <strong>{activeEmployeePreview.addEmails.length}</strong>
              </article>
              <article className="panel stat-card">
                <span>To remove</span>
                <strong>{activeEmployeePreview.removeEmails.length}</strong>
              </article>
            </div>
            <div className="two-up">
              <article className="panel inset-panel">
                <div className="section-head">
                  <div>
                    <h3>Preview adds</h3>
                    <p className="muted">Users active in Directory but missing from the group.</p>
                  </div>
                  <span className="pill">{activeEmployeePreview.addEmails.length}</span>
                </div>
                <ul className="clean">
                  {activeEmployeePreview.addEmails.length > 0 ? (
                    activeEmployeePreview.addEmails.map((email) => <li key={email}>{email}</li>)
                  ) : (
                    <li className="muted">No additions proposed.</li>
                  )}
                </ul>
              </article>
              <article className="panel inset-panel">
                <div className="section-head">
                  <div>
                    <h3>Preview removals</h3>
                    <p className="muted">Users in the group but no longer active in Directory.</p>
                  </div>
                  <span className="pill warn">{activeEmployeePreview.removeEmails.length}</span>
                </div>
                <ul className="clean">
                  {activeEmployeePreview.removeEmails.length > 0 ? (
                    activeEmployeePreview.removeEmails.map((email) => <li key={email}>{email}</li>)
                  ) : (
                    <li className="muted">No removals proposed.</li>
                  )}
                </ul>
              </article>
            </div>
            <form action={applyActiveEmployeeSync} className="form-actions">
              <button type="submit" disabled={!activeEmployeePreview.addEmails.length && !activeEmployeePreview.removeEmails.length}>
                Apply active employee sync
              </button>
            </form>
          </>
        )}
      </section>

      <section className="panel">
        <div className="section-head">
          <div>
            <h3>Switching checklist</h3>
            <p className="muted">Do this before using role assignment against live Google Groups.</p>
          </div>
          <span className="pill">Read-only first</span>
        </div>
        <ul className="clean">
          <li>Set `GOOGLE_INTEGRATION_MODE=google` in `.env`.</li>
          <li>Populate `GOOGLE_IMPERSONATED_ADMIN` with a real Workspace admin email.</li>
          <li>Paste the service account JSON into `GOOGLE_SERVICE_ACCOUNT_JSON` as a single-line JSON string.</li>
          <li>Confirm the service account client ID has Admin SDK and Drive scopes authorized in Workspace.</li>
          <li>Run the two probes above before using `Users` to write group membership.</li>
        </ul>
      </section>
    </div>
  );
}
