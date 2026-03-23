import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

function formatGroupLabel(groupEmail: string) {
  return groupEmail.replace("@conceivable.life", "");
}

function formatAuditDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric"
  }).format(date);
}

function humanizeActionType(actionType: string) {
  const explicit: Record<string, string> = {
    FOLDER_TEMPLATE_CREATED: "Folder template created",
    RECONCILE_APPLY: "Reconcile applied",
    GROUP_MEMBERSHIP_ADD: "Group membership added",
    GROUP_MEMBERSHIP_REMOVE: "Group membership removed",
    ACCESS_ROLE_MEMBERSHIP_ADD: "Business access membership added",
    ACCESS_ROLE_MEMBERSHIP_REMOVE: "Business access membership removed",
    RESTRICTED_ACCESS_APPROVED: "Restricted access approved",
    RESTRICTED_ACCESS_REJECTED: "Restricted access rejected",
    ACTIVE_EMPLOYEE_SYNC_COMPLETED: "Active employee sync completed",
    OFFBOARD_COMPLETED: "Offboarding completed"
  };

  if (explicit[actionType]) {
    return explicit[actionType];
  }

  return actionType
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatAuditPulse(entry: {
  actionType: string;
  targetUserEmail: string | null;
  targetGroupEmail: string | null;
  targetDriveName: string | null;
  notes: string | null;
  happenedAt: Date;
}) {
  const fragments = [
    entry.targetDriveName ? `on ${entry.targetDriveName}` : null,
    entry.targetUserEmail ? `for ${entry.targetUserEmail}` : null,
    entry.targetGroupEmail ? `via ${formatGroupLabel(entry.targetGroupEmail)}` : null
  ].filter(Boolean);

  return {
    kicker: formatAuditDate(entry.happenedAt),
    title: humanizeActionType(entry.actionType),
    detail: fragments.join(" · ") || entry.notes || null
  };
}

export default async function HomePage() {
  await requireSession();

  const now = new Date();

  const [activeMemberships, activeRestrictedExceptions, openReviewItems, sharedDrives, groupMappings, accessRoleMappings, auditLogs] =
    await Promise.all([
      prisma.groupMembership.count({
        where: { revokedAt: null }
      }),
      prisma.accessRequest.count({
        where: {
          restrictedFolderId: { not: null },
          status: "APPROVED",
          OR: [{ endDate: null }, { endDate: { gte: now } }]
        }
      }),
      prisma.accessReviewItem.count({
        where: {
          decision: null,
          accessReview: {
            status: "OPEN"
          }
        }
      }),
      prisma.sharedDrive.findMany({
        orderBy: { name: "asc" },
        include: {
          folders: {
            where: { isRestricted: true }
          }
        }
      }),
      prisma.groupMapping.findMany({
        include: { sharedDrive: true }
      }),
      prisma.accessRoleMapping.findMany({
        include: { sharedDrive: true }
      }),
      prisma.auditLog.findMany({
        orderBy: { happenedAt: "desc" },
        take: 3
      })
    ]);

  const kpis = [
    {
      label: "Active group memberships",
      value: String(activeMemberships),
      detail: "Managed through mapped Google Groups"
    },
    {
      label: "Restricted exceptions",
      value: String(activeRestrictedExceptions),
      detail: "Approved and still active"
    },
    {
      label: "Open quarterly review items",
      value: String(openReviewItems),
      detail: "Pending keep/remove decisions"
    }
  ];

  const driveCoverage = sharedDrives.map((drive) => {
    const groups = new Set<string>();

    for (const mapping of groupMappings) {
      if (mapping.sharedDriveId === drive.id) {
        groups.add(mapping.groupEmail);
      }
    }

    for (const mapping of accessRoleMappings) {
      if (mapping.sharedDriveId === drive.id) {
        groups.add(mapping.groupEmail);
      }
    }

    const restrictedBranchCount = drive.folders.length;
    const notes =
      restrictedBranchCount === 0
        ? "0 restricted branches"
        : `${restrictedBranchCount} restricted ${restrictedBranchCount === 1 ? "branch" : "branches"}`;

    return [drive.name, Array.from(groups).sort(), notes] as const;
  });

  const recentEvents =
    auditLogs.length > 0
      ? auditLogs.map(formatAuditPulse)
      : [
          {
            kicker: "",
            title: "No recent audit activity",
            detail: "This environment has not captured audit-relevant events yet."
          }
        ];

  return (
    <div className="hero">
      <section className="hero-card hero-card-compact">
        <div className="hero-copy">
          <div className="eyebrow">Working Directory Governance</div>
          <h2>RBAC-first control over Shared Drive access.</h2>
          <p>Role-managed Shared Drive access with exception-only restricted folders and auditable changes.</p>
        </div>
      </section>

      <section className="grid">
        {kpis.map((item) => (
          <article key={item.label} className="panel kpi">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <p>{item.detail}</p>
          </article>
        ))}

        <article className="panel table-panel">
          <div className="section-head">
            <div>
              <h3>Shared Drive Coverage</h3>
              <p className="muted">Mapped Google Groups are the default authority path.</p>
            </div>
            <span className="pill">RBAC enforced</span>
          </div>
          <table className="table-coverage">
            <thead>
              <tr>
                <th>Drive</th>
                <th>Mapped groups</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {driveCoverage.map(([drive, groups, notes]) => (
                <tr key={drive}>
                  <td className="cell-drive">{drive}</td>
                  <td className="cell-groups">
                    <div className="tag-list">
                      {groups.map((group) => (
                        <span key={group} className="mini-tag">
                          {formatGroupLabel(group)}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>{notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>

        <article className="panel list-panel">
          <div className="section-head">
            <div>
              <h3>Audit Pulse</h3>
              <p className="muted">Events that matter for ISO 9001 and SOC 2 evidence.</p>
            </div>
            <a href="/reports" className="section-link">
              Review weekly &rarr;
            </a>
          </div>
          <ul className="audit-list">
            {recentEvents.map((event) => (
              <li key={`${event.kicker}-${event.title}`} className="activity-item">
                {event.kicker ? <span className="activity-kicker">{event.kicker}</span> : null}
                <strong className="activity-title">{event.title}</strong>
                {event.detail ? <span className="activity-detail">{event.detail}</span> : null}
              </li>
            ))}
          </ul>
        </article>
      </section>
    </div>
  );
}
