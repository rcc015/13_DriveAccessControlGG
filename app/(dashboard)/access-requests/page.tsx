import { AccessDenied } from "@/components/dashboard/access-denied";
import {
  approveRestrictedAccessRequest,
  createRestrictedAccessRequest,
  rejectRestrictedAccessRequest
} from "@/app/(dashboard)/access-requests/actions";
import { adminAssignmentRoles, hasAnyRole } from "@/lib/auth/authorization";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export default async function AccessRequestsPage() {
  const session = await requireSession();

  if (!hasAnyRole(session, adminAssignmentRoles)) {
    return (
      <AccessDenied
        title="Access Requests restricted"
        description="Only Super Admin and Access Admin can request, approve, or reject restricted access."
      />
    );
  }

  const [requests, restrictedFolders] = await Promise.all([
    prisma.accessRequest.findMany({
      include: {
        user: true,
        restrictedFolder: true
      },
      orderBy: [{ createdAt: "desc" }]
    }),
    prisma.restrictedFolder.findMany({
      orderBy: [{ path: "asc" }]
    })
  ]);

  const requestedCount = requests.filter((request) => request.status === "REQUESTED").length;
  const approvedCount = requests.filter((request) => request.status === "APPROVED").length;
  const rejectedCount = requests.filter((request) => request.status === "REJECTED").length;

  return (
    <div className="stack">
      <section className="hero-card">
        <div className="eyebrow-row">
          <div className="eyebrow">Module 03</div>
          <span className="pill danger">Exception workflow</span>
        </div>
        <h2>Restricted access workflow</h2>
        <p>
          The only place where special-case access can be requested. Every request must carry
          justification, approver identity, dates, and a reviewable audit trail.
        </p>
      </section>

      <section className="stat-strip">
        <article className="panel stat-card">
          <span>Open requests</span>
          <strong>{requestedCount}</strong>
        </article>
        <article className="panel stat-card">
          <span>Approved exceptions</span>
          <strong>{approvedCount}</strong>
        </article>
        <article className="panel stat-card">
          <span>Rejected requests</span>
          <strong>{rejectedCount}</strong>
        </article>
      </section>

      <section className="panel">
        <div className="section-head">
          <div>
            <h3>Create restricted access request</h3>
            <p className="muted">Use this only for approved exception paths.</p>
          </div>
          <span className="pill">Create request</span>
        </div>
        <form action={createRestrictedAccessRequest} className="form-grid">
          <label className="field">
            <span>Target user email</span>
            <input type="email" name="targetUserEmail" placeholder="user@company.com" required />
          </label>
          <label className="field">
            <span>Restricted folder</span>
            <select name="restrictedFolderId" required defaultValue="">
              <option value="" disabled>
                Select restricted folder
              </option>
              {restrictedFolders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.path}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Start date</span>
            <input type="date" name="startDate" />
          </label>
          <label className="field">
            <span>End date</span>
            <input type="date" name="endDate" />
          </label>
          <label className="field field-full">
            <span>Justification</span>
            <textarea
              name="justification"
              rows={4}
              placeholder="Why is this exception needed, and for how long?"
              required
            />
          </label>
          <div className="form-actions">
            <button type="submit">Create request</button>
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="section-head">
          <div>
            <h3>Restricted folder requests</h3>
            <p className="muted">Exception-only path, never the default operating model.</p>
          </div>
          <span className="pill warn">Reviewable evidence</span>
        </div>
        <table className="table-tight">
          <thead>
            <tr>
              <th>Requested at</th>
              <th>User</th>
              <th>Restricted path</th>
              <th>Status</th>
              <th>Approval</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((request) => (
              <tr key={request.id}>
                <td>{request.createdAt.toISOString().slice(0, 10)}</td>
                <td>
                  <strong>{request.user.displayName}</strong>
                  <div className="muted">{request.user.email}</div>
                </td>
                <td>{request.restrictedFolder?.path ?? "Unknown restricted folder"}</td>
                <td>
                  <span className={`status-pill ${request.status.toLowerCase()}`}>
                    {request.status}
                  </span>
                </td>
                <td>
                  {request.approverEmail ? (
                    <>
                      <strong>{request.approverEmail}</strong>
                      <div className="muted">{request.approvalReference ?? "No reference"}</div>
                    </>
                  ) : (
                    <span className="muted">Pending decision</span>
                  )}
                </td>
                <td>
                  {request.status === "REQUESTED" ? (
                    <div className="inline-actions">
                      <form action={approveRestrictedAccessRequest}>
                        <input type="hidden" name="requestId" value={request.id} />
                        <button type="submit" className="button-secondary">
                          Approve
                        </button>
                      </form>
                      <form action={rejectRestrictedAccessRequest}>
                        <input type="hidden" name="requestId" value={request.id} />
                        <button type="submit" className="button-ghost">
                          Reject
                        </button>
                      </form>
                    </div>
                  ) : (
                    <span className="muted">Closed</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
