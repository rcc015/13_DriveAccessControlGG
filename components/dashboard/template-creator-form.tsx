"use client";

import { useActionState, useMemo, useState } from "react";
import { createFolderTemplate, type TemplateActionState } from "@/app/(dashboard)/templates/actions";
import type { FolderTemplateKind } from "@/types/domain";

interface TemplateOption {
  kind: FolderTemplateKind;
  name: string;
  basePath: string;
  details: string;
}

const initialState: TemplateActionState = {
  status: "idle"
};

export function TemplateCreatorForm({ templates }: { templates: TemplateOption[] }) {
  const [state, formAction, isPending] = useActionState(createFolderTemplate, initialState);
  const defaultTemplate = templates[0];
  const [selectedTemplate, setSelectedTemplate] = useState<FolderTemplateKind>(defaultTemplate.kind);

  const helperText = useMemo(() => {
    return templates.reduce<Record<string, string>>((acc, template) => {
      acc[template.kind] = `${template.basePath} · ${template.details}`;
      return acc;
    }, {});
  }, [templates]);

  return (
    <section className="panel">
      <div className="section-head">
        <div>
          <h3>Create template instance</h3>
          <p className="muted">Creates the approved folder tree under the mapped Google Drive base path.</p>
        </div>
        <span className="pill warn">Writes to Drive</span>
      </div>

      <form action={formAction} className="form-grid">
        <label className="field">
          <span>Template</span>
          <select
            name="template"
            value={selectedTemplate}
            onChange={(event) => setSelectedTemplate(event.target.value as FolderTemplateKind)}
            required
          >
            {templates.map((template) => (
              <option key={template.kind} value={template.kind}>
                {template.name}
              </option>
            ))}
          </select>
        </label>

        <label className="field field-full">
          <span>Root folder name</span>
          <input
            type="text"
            name="rootFolderName"
            defaultValue={defaultTemplate.name}
            placeholder="EXP-014_NewProject"
            required
          />
        </label>

        <label className="field field-full">
          <span>Base path</span>
          <select name="parentFolderPath" defaultValue={defaultTemplate.basePath} required>
            {templates.map((template) => (
              <option key={`${template.kind}-${template.basePath}`} value={template.basePath}>
                {template.basePath}
              </option>
            ))}
          </select>
        </label>

        <div className="card-note field-full">
          {helperText[selectedTemplate]}
        </div>

        <div className="form-actions">
          <button type="submit" disabled={isPending}>
            {isPending ? "Creating template..." : "Create folder template"}
          </button>
        </div>
      </form>

      {state.status !== "idle" ? (
        <div className={`card-note ${state.status === "error" ? "warn" : ""}`}>
          {state.message}
          {state.folderUrl ? (
            <>
              {" "}
              <a href={state.folderUrl} target="_blank" rel="noreferrer">
                Open folder
              </a>
            </>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
