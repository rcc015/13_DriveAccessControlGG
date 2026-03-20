"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { applyReconcile, type ApplyReconcileState } from "@/app/(dashboard)/google-access-monitor/actions";
import type { ReconcilePreviewAction } from "@/lib/services/google-access-monitor-service";

interface ReconcilePanelProps {
  preview: {
    actions: ReconcilePreviewAction[];
    summary: {
      total: number;
      addCount: number;
      removeCount: number;
      updateCount: number;
      limitedAccessCount: number;
      manualReviewCount: number;
    };
  };
}

const initialState: ApplyReconcileState = {
  ok: true,
  message: ""
};

function ApplyButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button className="button-ghost" type="submit" disabled={disabled || pending}>
      {pending ? "Applying..." : "Apply reconcile"}
    </button>
  );
}

export function ReconcilePanel({ preview }: ReconcilePanelProps) {
  const [state, formAction] = useActionState(applyReconcile, initialState);

  return (
    <section className="panel">
      <div className="section-head">
        <div>
          <h3>Reconcile preview</h3>
          <p className="muted">Proposed corrective actions based on the current drift snapshot.</p>
        </div>
        <div className="inline-actions">
          <span className="pill">Preview only</span>
          <form action={formAction}>
            <ApplyButton disabled={preview.summary.total === 0} />
          </form>
        </div>
      </div>
      <div className="stat-strip">
        <article className="panel stat-card">
          <span>Total actions</span>
          <strong>{preview.summary.total}</strong>
        </article>
        <article className="panel stat-card">
          <span>Add groups</span>
          <strong>{preview.summary.addCount}</strong>
        </article>
        <article className="panel stat-card">
          <span>Remove access</span>
          <strong>{preview.summary.removeCount}</strong>
        </article>
        <article className="panel stat-card">
          <span>Update roles</span>
          <strong>{preview.summary.updateCount}</strong>
        </article>
        <article className="panel stat-card">
          <span>Enable limited access</span>
          <strong>{preview.summary.limitedAccessCount}</strong>
        </article>
        <article className="panel stat-card">
          <span>Manual review</span>
          <strong>{preview.summary.manualReviewCount}</strong>
        </article>
      </div>
      {state.message ? (
        <div className={`callout ${state.ok ? "success" : "error"}`}>
          <strong>{state.ok ? "Reconcile result" : "Reconcile needs review"}</strong>
          <p>{state.message}</p>
          {state.summary ? (
            <p className="muted">
              Applied: {state.summary.applied} · Skipped: {state.summary.skipped} · Failed: {state.summary.failed}
            </p>
          ) : null}
        </div>
      ) : null}
      {state.results && state.results.length > 0 ? (
        <ul className="clean">
          {state.results.map((result, index) => (
            <li key={`${result.action.resourceName}-${result.action.kind}-${result.action.principal ?? index}`}>
              <span className={`status-pill ${mapResultState(result.status)}`}>{result.status}</span>{" "}
              {result.message}
            </li>
          ))}
        </ul>
      ) : preview.actions.length > 0 ? (
        <ul className="clean">
          {preview.actions.map((action, index) => (
            <li key={`${action.resourceName}-${action.kind}-${action.principal ?? index}`}>{action.summary}</li>
          ))}
        </ul>
      ) : (
        <p className="muted">No reconcile actions proposed for the current snapshot.</p>
      )}
    </section>
  );
}

function mapResultState(status: "APPLIED" | "SKIPPED" | "FAILED") {
  switch (status) {
    case "APPLIED":
      return "approved";
    case "SKIPPED":
      return "pending";
    case "FAILED":
      return "rejected";
  }
}
