import { redirect } from "next/navigation";
import { cancelMyAccessRequest } from "@/app/request-access/actions";
import { RequestAccessForm } from "@/components/requester/request-access-form";
import { getRequestAccessCatalog } from "@/lib/access-requests/catalog";
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

export default async function RequestAccessPage() {
  const session = await requireSession();

  if (session.appRole !== "REQUESTER") {
    redirect("/");
  }

  const [catalog, requests] = await Promise.all([
    getRequestAccessCatalog(),
    prisma.accessRequest.findMany({
      where: {
        requestedByEmail: session.email
      },
      include: {
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
    })
  ]);

  return (
    <div className="stack requester-stack">
      <section className="hero-card requester-hero">
        <div className="eyebrow-row">
          <div className="eyebrow">Drive Access Console</div>
          <span className="pill danger">Request portal</span>
        </div>
        <h2>Request access</h2>
        <p>
          Submit a request for Shared Drive, business role, or restricted folder access. An access
          administrator will review your request.
        </p>
        <div className="requester-identity">
          {session.avatarUrl ? <img src={session.avatarUrl} alt="" className="requester-avatar requester-avatar-large" /> : null}
          <div>
            <strong>{session.displayName}</strong>
            <span>{session.email}</span>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="section-head">
          <div>
            <h3>Submit a new request</h3>
            <p className="muted">
              Business justification is required for every request and becomes part of the review history.
            </p>
          </div>
          <span className="pill">Self-service</span>
        </div>
        <RequestAccessForm
          accessRoles={catalog.accessRoles}
          sharedDrives={catalog.sharedDrives}
          restrictedFolders={catalog.restrictedFolders}
        />
      </section>

      <section className="panel">
        <div className="section-head">
          <div>
            <h3>My requests</h3>
            <p className="muted">You can only see requests submitted from your authenticated Google account.</p>
          </div>
          <span className="pill warn">{requests.length} total</span>
        </div>
        {requests.length > 0 ? (
          <table className="table-tight">
            <thead>
              <tr>
                <th>Submitted</th>
                <th>Type</th>
                <th>Requested access</th>
                <th>Status</th>
                <th>Reviewer notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id}>
                  <td>{request.createdAt.toISOString().slice(0, 10)}</td>
                  <td>{formatRequestType(request.requestType)}</td>
                  <td>
                    <strong>{formatTarget(request)}</strong>
                    {request.requestedAccessLevel ? <div className="muted">{request.requestedAccessLevel}</div> : null}
                  </td>
                  <td>
                    <span className={`status-pill ${request.status.toLowerCase()}`}>{request.status}</span>
                  </td>
                  <td>{request.reviewerNotes ?? "Pending review"}</td>
                  <td>
                    {["REQUESTED", "IN_REVIEW", "NEEDS_INFO"].includes(request.status) ? (
                      <form action={cancelMyAccessRequest}>
                        <input type="hidden" name="requestId" value={request.id} />
                        <button type="submit" className="button-ghost">
                          Cancel
                        </button>
                      </form>
                    ) : (
                      <span className="muted">Closed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="card-note">You have not submitted any access requests yet.</div>
        )}
      </section>
    </div>
  );
}
