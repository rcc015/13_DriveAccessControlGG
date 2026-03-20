import { AccessDenied } from "@/components/dashboard/access-denied";
import { TemplateCreatorForm } from "@/components/dashboard/template-creator-form";
import { adminAssignmentRoles, hasAnyRole } from "@/lib/auth/authorization";
import { requireSession } from "@/lib/auth/session";

const templates = [
  {
    kind: "EXPLORATION" as const,
    name: "EXP-###_ProjectName",
    basePath:
      "03_Operational_Working / 02_OperationalProcesses / 03_Exploration_R&D / 02_Exploration_Projects",
    details: "Creates working directory, evidence, media, and engineering handoff structure."
  },
  {
    kind: "ENGINEERING" as const,
    name: "PRJ-###_ProjectName",
    basePath:
      "03_Operational_Working / 02_OperationalProcesses / 04_Engineering / 01_EngineeringProjects",
    details: "Creates regulated engineering folders and ready-for-handoff branch."
  }
];

export default async function TemplatesPage() {
  const session = await requireSession();

  if (!hasAnyRole(session, adminAssignmentRoles)) {
    return (
      <AccessDenied
        title="Templates restricted"
        description="Only Super Admin and Access Admin can create standardized folder templates."
      />
    );
  }

  return (
    <div className="stack">
      <section className="hero-card">
        <div className="eyebrow-row">
          <div className="eyebrow">Module 06</div>
          <span className="pill warn">Folder automation</span>
        </div>
        <h2>Folder template creator</h2>
        <p>
          Creates standard Exploration and Engineering folder trees inside the approved Shared Drive
          paths with a single auditable action.
        </p>
      </section>

      <section className="stat-strip">
        <article className="panel stat-card">
          <span>Templates</span>
          <strong>2</strong>
        </article>
        <article className="panel stat-card">
          <span>Target domains</span>
          <strong>2</strong>
        </article>
        <article className="panel stat-card">
          <span>Audit mode</span>
          <strong>Enabled</strong>
        </article>
      </section>

      <section className="two-up">
        {templates.map((template) => (
          <article key={template.name} className="panel">
            <div className="section-head">
              <div>
                <h3>{template.name}</h3>
                <p className="muted">{template.basePath}</p>
              </div>
            </div>
            <p className="card-note">{template.details}</p>
          </article>
        ))}
      </section>

      <TemplateCreatorForm templates={templates} />
    </div>
  );
}
