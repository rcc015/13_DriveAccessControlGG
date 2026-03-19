import { requireSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

function formatGroupLabel(groupEmail: string) {
  return groupEmail.replace("@conceivable.life", "");
}

const kpis = [
  { label: "Active group memberships", value: "184", detail: "Managed through mapped Google Groups" },
  { label: "Restricted exceptions", value: "12", detail: "All time-bound and reviewable" },
  { label: "Open quarterly review items", value: "37", detail: "Pending keep/remove decisions" }
];

const recentEvents = [
  "Quarterly review Q1-2026 opened for Operational and Support drives.",
  "Restricted Finance access granted with expiration and approver reference.",
  "Permission Matrix report uploaded and linked in the evidence register."
];

const driveCoverage: [string, string[], string][] = [
  [
    "01_QMS_Working",
    ["grp-quality-owner@conceivable.life", "grp-quality-editor@conceivable.life"],
    "1 restricted branch"
  ],
  [
    "02_Strategic_Working",
    ["grp-strategic-owner@conceivable.life", "grp-strategic-editor@conceivable.life"],
    "0 restricted branches"
  ],
  [
    "03_Operational_Working",
    ["grp-operational-owner@conceivable.life", "grp-operational-contributor@conceivable.life"],
    "Template automation enabled"
  ],
  [
    "04_Support_Working",
    [
      "grp-support-owner@conceivable.life",
      "grp-hr@conceivable.life",
      "grp-finance@conceivable.life",
      "grp-legal@conceivable.life",
      "grp-it@conceivable.life"
    ],
    "3 restricted branches"
  ]
];

export default async function HomePage() {
  await requireSession();

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
            <span className="pill warn">Review weekly</span>
          </div>
          <ul className="clean">
            {recentEvents.map((event) => (
              <li key={event}>{event}</li>
            ))}
          </ul>
        </article>
      </section>
    </div>
  );
}
