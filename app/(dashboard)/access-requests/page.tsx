import { AccessDenied } from "@/components/dashboard/access-denied";
import { redirect } from "next/navigation";
import {
  approveAccessRequest,
  markAccessRequestInReview,
  rejectAccessRequest,
  requestMoreInfoForAccessRequest
} from "@/app/(dashboard)/access-requests/actions";
import { adminAndReadRoles, hasAnyRole } from "@/lib/auth/authorization";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

function formatRequestType(requestType: string) {
  switch (requestType) {
    case "BUSINESS_ROLE":
      return "Business role";
    case "SHARED_DRIVE":
      return "Shared Drive";
    case "RESTRICTED_FOLDER":
      return "Restricted folder";
    case "OTHER":
      return "Other";
    default:
      return requestType.replaceAll("_", " ");
  }
}

function formatTarget(request: {
  accessRole: { displayName: string } | null;
  sharedDrive: { name: string } | null;
  restrictedFolder: { path: string } | null;
  otherTargetText: string | null;
}) {
  return (
    request.accessRole?.displayName ??
    request.sharedDrive?.name ??
    request.restrictedFolder?.path ??
    request.otherTargetText ??
    "Unknown target"
  );
}

export default async function AccessRequestsPage() {
  const session = await requireSession();

  if (session.appRole === "REQUESTER") {
    redirect("/request-access");
  }

  if (!hasAnyRole(session, adminAndReadRoles)) {
    return (
      <AccessDenied
        title="Access Requests restricted"
        description="Only admin, reviewer, and auditor roles can review access requests."
      />
    );
  }

  const canReview = session.appRole !== "READ_ONLY_AUDITOR";
  const requests = await prisma.accessRequest.findMany({
    include: {
      user: true,
      accessRole: {
        select: {
          displayName: true
        }
      },
      sharedDrive: {
        select: {
          name: true
        }
      },
      restrictedFolder: {
        select: {
          path: true
        }
      }
    },
    orderBy: [{ createdAt: "desc" }]
  });

  const openCount = requests.filter((request) => ["REQUESTED", "IN_REVIEW", "NEEDS_INFO"].includes(request.status)).length;

  return (
    <div className="stack">
      <section className="hero-card">
        <div className="eyebrow-row">
          <div className="eyebrow">Module 03</div>
          <span className="pill danger">Admin review</span>
        </div>
        <h2>Access requests</h2>
        <p>
          Review end-user requests for business roles, Shared Drives, and restricted folders without
          bypassing the existing RBAC and reconcile controls.
        </p>
      </section>

      <section className="stat-strip">
        <article className="panel stat-card">
          <span>Total requests</span>
          <strong>{requests.length}</strong>
        </article>
        <article className="panel stat-card">
          <span>Open review items</span>
          <strong>{openCount}</strong>
        </article>
        <article className="panel stat-card">
          <span>Read mode</span>
          <strong>{canReview ? "Review enabled" : "Auditor"}</strong>
        </article>
      </section>

      <section className="panel">
        <div className="section-head">
          <div>
            <h3>Review queue</h3>
            <p className="muted">Approval changes request status only. It does not silently apply Google access.</p>
          </div>
          <span className="pill warn">{openCount} open</span>
        </div>
        <table className="table-tight">
          <thead>
            <tr>
              <th>Submitted</th>
              <th>Requester</th>
              <th>Type</th>
              <th>Requested access</th>
              <th>Requester justification</th>
              <th>Status</th>
              <th>Review</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((request) => (
              <tr key={request.id}>
                <td>{request.createdAt.toISOString().slice(0, 10)}</td>
                <td>
                  <strong>{request.requesterName ?? request.user.displayName}</strong>
                  <div className="muted">{request.requestedByEmail}</div>
                </td>
                <td>{formatRequestType(request.requestType)}</td>
                <td>
                  <strong>{formatTarget(request)}</strong>
                  {request.requestedAccessLevel ? <div className="muted">{request.requestedAccessLevel}</div> : null}
                </td>
                <td className="request-justification-cell">{request.justification}</td>
                <td>
                  <span className={`status-pill ${request.status.toLowerCase()}`}>{request.status}</span>
                </td>
                <td>
                  {canReview ? (
                    <form className="review-actions">
                        <input type="hidden" name="requestId" value={request.id} />
                        <textarea name="reviewerNotes" rows={2} placeholder="Reviewer notes" defaultValue={request.reviewerNotes ?? ""} />
                        <div className="inline-actions">
                          <button type="submit" formAction={markAccessRequestInReview} className="button-secondary">
                            Mark in review
                          </button>
                          <button type="submit" formAction={requestMoreInfoForAccessRequest} className="button-ghost">
                            Needs info
                          </button>
                          <button type="submit" formAction={approveAccessRequest} className="button-secondary">
                          Approve
                          </button>
                          <button type="submit" formAction={rejectAccessRequest} className="button-ghost">
                            Reject
                          </button>
                        </div>
                    </form>
                  ) : (
                    <span className="muted">{request.reviewerNotes ?? "Read-only review"}</span>
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
