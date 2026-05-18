import { AccessDenied } from "@/components/dashboard/access-denied";
import { AccessReviewItemsTable } from "@/components/dashboard/access-review-items-table";
import {
  buildAccessReviewSummary,
  isPendingAccessReviewDecision,
  normalizeAccessReviewDecision,
  normalizeAccessReviewStatus
} from "@/lib/access-reviews/workflow";
import { hasAnyRole } from "@/lib/auth/authorization";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getQuarterInfo } from "@/lib/reports/quarterly-access-review";

interface AccessReviewsPageProps {
  searchParams?: Promise<{
    quarter?: string;
    status?: string;
    decision?: string;
    reviewer?: string;
    user?: string;
    role?: string;
    group?: string;
    message?: string;
  }>;
}

function containsIgnoreCase(value: string | null | undefined, query: string) {
  return (value ?? "").toLowerCase().includes(query.trim().toLowerCase());
}

function buildReturnTo(params: Record<string, string | undefined>) {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value?.trim()) {
      query.set(key, value);
    }
  }

  const queryString = query.toString();
  return queryString ? `/access-reviews?${queryString}` : "/access-reviews";
}

export default async function AccessReviewsPage({ searchParams }: AccessReviewsPageProps) {
  const session = await requireSession();
  const params = (await searchParams) ?? {};

  if (!hasAnyRole(session, ["SUPER_ADMIN", "REVIEWER", "READ_ONLY_AUDITOR"])) {
    return (
      <AccessDenied
        title="Access Reviews restricted"
        description="Only Super Admin, Reviewer, and Read-only Auditor can access quarterly reviews."
      />
    );
  }

  const campaigns = await prisma.accessReview.findMany({
    include: {
      items: {
        orderBy: [{ memberEmail: "asc" }, { roleLabel: "asc" }, { groupEmail: "asc" }]
      }
    },
    orderBy: [{ startedAt: "desc" }]
  });

  const currentQuarter = getQuarterInfo();
  const normalizedCampaigns = campaigns.map((campaign) => {
    const status = normalizeAccessReviewStatus(campaign.status, campaign.items);
    return {
      ...campaign,
      normalizedStatus: status,
      summary: buildAccessReviewSummary(campaign.items)
    };
  });

  const campaignStatusFilter = (params.status ?? "").trim().toUpperCase();
  const filteredCampaigns = normalizedCampaigns.filter((campaign) => {
    return !campaignStatusFilter || campaign.normalizedStatus === campaignStatusFilter;
  });

  const selectedCampaign =
    filteredCampaigns.find((campaign) => campaign.quarterLabel === params.quarter) ??
    filteredCampaigns.find((campaign) =>
      [currentQuarter.label, currentQuarter.legacyLabel].includes(campaign.quarterLabel)
    ) ??
    filteredCampaigns[0] ??
    null;

  const userFilter = (params.user ?? "").trim().toLowerCase();
  const roleFilter = (params.role ?? "").trim().toLowerCase();
  const groupFilter = (params.group ?? "").trim().toLowerCase();
  const reviewerFilter = (params.reviewer ?? "").trim().toLowerCase();
  const decisionFilter = (params.decision ?? "").trim().toUpperCase();

  const filteredItems = (selectedCampaign?.items ?? []).filter((item) => {
    const normalizedDecision = normalizeAccessReviewDecision(item.decision);
    const matchesDecision =
      !decisionFilter || (decisionFilter === "PENDING" ? isPendingAccessReviewDecision(item.decision) : normalizedDecision === decisionFilter);
    const matchesUser =
      !userFilter ||
      containsIgnoreCase(item.memberEmail, userFilter) ||
      containsIgnoreCase(item.memberName, userFilter);
    const matchesRole = !roleFilter || containsIgnoreCase(item.roleLabel, roleFilter);
    const matchesGroup = !groupFilter || containsIgnoreCase(item.groupEmail, groupFilter);
    const matchesReviewer =
      !reviewerFilter ||
      containsIgnoreCase(item.reviewedByEmail, reviewerFilter) ||
      containsIgnoreCase(selectedCampaign?.reviewerEmail, reviewerFilter);

    return matchesDecision && matchesUser && matchesRole && matchesGroup && matchesReviewer;
  });

  const canEdit = hasAnyRole(session, ["SUPER_ADMIN", "REVIEWER"]);
  const returnTo = buildReturnTo({
    quarter: params.quarter,
    status: params.status,
    decision: params.decision,
    reviewer: params.reviewer,
    user: params.user,
    role: params.role,
    group: params.group
  });

  return (
    <div className="stack">
      <section className="hero-card">
        <div className="eyebrow-row">
          <div className="eyebrow">Module 04</div>
          <span className="pill">Quarterly control</span>
        </div>
        <h2>Quarterly access review</h2>
        <p>
          PENDING appears when a review item exists in the quarter snapshot but has not yet been reviewed.
          Review decisions are now managed in-app and exported to the quarterly CSV without making automatic
          Google Group removals.
        </p>
      </section>

      {params.message ? <section className="callout success">{params.message}</section> : null}

      {selectedCampaign ? (
        <section className="stat-strip">
          <article className="panel stat-card">
            <span>Current quarter review</span>
            <strong>{selectedCampaign.quarterLabel}</strong>
          </article>
          <article className="panel stat-card">
            <span>Status</span>
            <strong>{selectedCampaign.normalizedStatus}</strong>
          </article>
          <article className="panel stat-card">
            <span>Total items</span>
            <strong>{selectedCampaign.summary.totalItems}</strong>
          </article>
          <article className="panel stat-card">
            <span>Pending items</span>
            <strong>{selectedCampaign.summary.pendingItems}</strong>
          </article>
          <article className="panel stat-card">
            <span>Approved items</span>
            <strong>{selectedCampaign.summary.approvedItems}</strong>
          </article>
          <article className="panel stat-card">
            <span>Revocation requested</span>
            <strong>{selectedCampaign.summary.revokeItems}</strong>
          </article>
          <article className="panel stat-card">
            <span>Updated items</span>
            <strong>{selectedCampaign.summary.needsUpdateItems}</strong>
          </article>
        </section>
      ) : null}

      <section className="two-up">
        <article className="panel">
          <div className="section-head">
            <div>
              <h3>Review campaigns</h3>
              <p className="muted">Choose a quarter, then review items inside that campaign.</p>
            </div>
          </div>
          <ul className="clean">
            {filteredCampaigns.length > 0 ? (
              filteredCampaigns.map((campaign) => (
                <li key={campaign.id}>
                  <strong>{campaign.name}</strong>
                  <div className="muted">
                    {campaign.quarterLabel} · {campaign.summary.totalItems} items · {campaign.normalizedStatus}
                  </div>
                  <div className="muted">
                    Pending {campaign.summary.pendingItems} · Approved {campaign.summary.approvedItems} · Revoke{" "}
                    {campaign.summary.revokeItems} · Needs update {campaign.summary.needsUpdateItems}
                  </div>
                </li>
              ))
            ) : (
              <li className="muted">No campaigns match the selected status.</li>
            )}
          </ul>
        </article>

        <article className="panel">
          <div className="section-head">
            <div>
              <h3>Decision workflow</h3>
              <p className="muted">Review decisions are audit logged and safe by default.</p>
            </div>
          </div>
          <ul className="clean">
            <li>`APPROVED` keeps access and documents justification.</li>
            <li>`REVOKE` requests follow-up remediation but does not remove Google Group access automatically.</li>
            <li>`NEEDS_UPDATE` flags incorrect or incomplete access data for follow-up.</li>
            <li>Generating the quarterly CSV after review includes the latest decisions and notes.</li>
          </ul>
        </article>
      </section>

      <section className="panel">
        <div className="section-head">
          <div>
            <h3>Filters</h3>
            <p className="muted">Filter by quarter, campaign status, decision, reviewer, user, role, or group.</p>
          </div>
          <span className="pill">{filteredItems.length} visible item(s)</span>
        </div>
        <form method="get" className="review-filter-grid">
          <label>
            Quarter
            <select name="quarter" defaultValue={params.quarter ?? ""}>
              <option value="">Current / latest</option>
              {normalizedCampaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.quarterLabel}>
                  {campaign.quarterLabel}
                </option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select name="status" defaultValue={params.status ?? ""}>
              <option value="">All</option>
              <option value="PENDING">PENDING</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="COMPLETED">COMPLETED</option>
            </select>
          </label>
          <label>
            Decision
            <select name="decision" defaultValue={params.decision ?? ""}>
              <option value="">All</option>
              <option value="PENDING">PENDING</option>
              <option value="APPROVED">APPROVED</option>
              <option value="REVOKE">REVOKE</option>
              <option value="NEEDS_UPDATE">NEEDS_UPDATE</option>
            </select>
          </label>
          <label>
            Reviewer
            <input type="text" name="reviewer" defaultValue={params.reviewer ?? ""} placeholder="reviewer@example.com" />
          </label>
          <label>
            User
            <input type="text" name="user" defaultValue={params.user ?? ""} placeholder="name or email" />
          </label>
          <label>
            Role
            <input type="text" name="role" defaultValue={params.role ?? ""} placeholder="Finance Analyst" />
          </label>
          <label>
            Group
            <input type="text" name="group" defaultValue={params.group ?? ""} placeholder="grp-finance" />
          </label>
          <div className="inline-actions">
            <button type="submit" className="button-secondary">
              Apply filters
            </button>
            <a href="/access-reviews" className="button-ghost review-reset-link">
              Reset
            </a>
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="section-head">
          <div>
            <h3>{selectedCampaign?.name ?? "Access review items"}</h3>
            <p className="muted">
              Each row shows reviewer assignment, current decision, action required, and latest review metadata.
            </p>
          </div>
          {selectedCampaign ? (
            <span className={`status-pill ${selectedCampaign.normalizedStatus.toLowerCase()}`}>
              {selectedCampaign.normalizedStatus}
            </span>
          ) : null}
        </div>

        {selectedCampaign ? (
          <AccessReviewItemsTable
            reviewerEmail={selectedCampaign.reviewerEmail}
            items={filteredItems}
            canEdit={canEdit}
            returnTo={returnTo}
          />
        ) : (
          <div className="muted">No access review campaign found for the selected filters.</div>
        )}
      </section>
    </div>
  );
}
