import { AccessDenied } from "@/components/dashboard/access-denied";
import { markAccessReviewItem } from "@/app/(dashboard)/access-reviews/actions";
import { hasAnyRole } from "@/lib/auth/authorization";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export default async function AccessReviewsPage() {
  const session = await requireSession();

  if (!hasAnyRole(session, ["SUPER_ADMIN", "REVIEWER", "READ_ONLY_AUDITOR"])) {
    return (
      <AccessDenied
        title="Access Reviews restricted"
        description="Only Super Admin, Reviewer, and Read-only Auditor can access quarterly reviews."
      />
    );
  }

  const [campaigns, latestCampaign] = await Promise.all([
    prisma.accessReview.findMany({
      include: {
        items: true
      },
      orderBy: [{ startedAt: "desc" }]
    }),
    prisma.accessReview.findFirst({
      include: {
        items: {
          orderBy: [{ memberEmail: "asc" }]
        }
      },
      orderBy: [{ startedAt: "desc" }]
    })
  ]);

  const items = latestCampaign?.items ?? [];
  const keepCount = items.filter((item) => item.decision === "KEEP").length;
  const removeCount = items.filter((item) => item.decision === "REMOVE").length;
  const pendingCount = items.filter((item) => !item.decision).length;

  return (
    <div className="stack">
      <section className="hero-card">
        <div className="eyebrow-row">
          <div className="eyebrow">Module 04</div>
          <span className="pill">Quarterly control</span>
        </div>
        <h2>Quarterly access review</h2>
        <p>
          Reviewers can inspect mapped groups, mark keep or remove, and export evidence that is
          uploaded to Google Drive and linked back to the local database.
        </p>
      </section>

      <section className="stat-strip">
        <article className="panel stat-card">
          <span>Review campaigns</span>
          <strong>{campaigns.length}</strong>
        </article>
        <article className="panel stat-card">
          <span>Pending decisions</span>
          <strong>{pendingCount}</strong>
        </article>
        <article className="panel stat-card">
          <span>Remove flags</span>
          <strong>{removeCount}</strong>
        </article>
      </section>

      <section className="two-up">
        <article className="panel">
          <div className="section-head">
            <div>
              <h3>Review campaigns</h3>
              <p className="muted">Quarterly review headers currently stored in the database.</p>
            </div>
          </div>
          <ul className="clean">
            {campaigns.map((campaign) => (
              <li key={campaign.id}>
                <strong>{campaign.name}</strong>
                <div className="muted">
                  {campaign.quarterLabel} · {campaign.items.length} items · {campaign.status}
                </div>
              </li>
            ))}
          </ul>
        </article>

        <article className="panel">
          <div className="section-head">
            <div>
              <h3>Decision summary</h3>
              <p className="muted">Current state of the latest campaign.</p>
            </div>
          </div>
          <ul className="clean">
            <li>Keep decisions: {keepCount}</li>
            <li>Remove decisions: {removeCount}</li>
            <li>Pending review: {pendingCount}</li>
            <li>Reviewer: {latestCampaign?.reviewerEmail ?? "Not set"}</li>
          </ul>
        </article>
      </section>

      <section className="panel">
        <div className="section-head">
          <div>
            <h3>Latest review items</h3>
            <p className="muted">Review group memberships and mark keep or remove.</p>
          </div>
          <span className="pill warn">Quarterly evidence</span>
        </div>
        <table className="table-tight">
          <thead>
            <tr>
              <th>Group</th>
              <th>Member</th>
              <th>Role</th>
              <th>Decision</th>
              <th>Reviewed by</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length > 0 ? (
              items.map((item) => (
                <tr key={item.id}>
                  <td>{item.groupEmail ?? "Unknown group"}</td>
                  <td>
                    <strong>{item.memberName ?? item.memberEmail}</strong>
                    <div className="muted">{item.memberEmail}</div>
                  </td>
                  <td>{item.roleLabel ?? "Mapped membership"}</td>
                  <td>
                    {item.decision ? (
                      <span className={`status-pill ${item.decision.toLowerCase()}`}>{item.decision}</span>
                    ) : (
                      <span className="muted">Pending</span>
                    )}
                  </td>
                  <td>{item.reviewedByEmail ?? "Not reviewed"}</td>
                  <td>
                    {hasAnyRole(session, ["SUPER_ADMIN", "REVIEWER"]) ? (
                      <div className="inline-actions">
                        <form action={markAccessReviewItem}>
                          <input type="hidden" name="itemId" value={item.id} />
                          <input type="hidden" name="decision" value="KEEP" />
                          <button type="submit" className="button-secondary">
                            Keep
                          </button>
                        </form>
                        <form action={markAccessReviewItem}>
                          <input type="hidden" name="itemId" value={item.id} />
                          <input type="hidden" name="decision" value="REMOVE" />
                          <button type="submit" className="button-ghost">
                            Remove
                          </button>
                        </form>
                      </div>
                    ) : (
                      <span className="muted">Read-only</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="muted">
                  No access review items found yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
