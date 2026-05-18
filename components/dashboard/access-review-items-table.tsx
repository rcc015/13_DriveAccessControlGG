import React from "react";
import { bulkReviewAccessReviewItems, reviewAccessReviewItem } from "@/app/(dashboard)/access-reviews/actions";
import { normalizeAccessReviewDecision } from "@/lib/access-reviews/workflow";

export interface AccessReviewTableItem {
  id: string;
  memberName: string | null;
  memberEmail: string;
  roleLabel: string | null;
  groupEmail: string | null;
  decision: string | null;
  actionRequired: string | null;
  reviewedAt: Date | null;
  reviewedByEmail: string | null;
  decisionNotes: string | null;
  accessJustified: boolean | null;
}

interface AccessReviewItemsTableViewProps {
  reviewerEmail: string;
  items: AccessReviewTableItem[];
  canEdit: boolean;
  returnTo: string;
  bulkAction: string | ((formData: FormData) => void | Promise<void>);
  rowAction: string | ((formData: FormData) => void | Promise<void>);
}

function formatReviewedAt(value: Date | null) {
  return value ? value.toISOString().slice(0, 19).replace("T", " ") : "Not reviewed";
}

function formatAccessJustified(value: boolean | null) {
  if (value === true) {
    return "true";
  }

  if (value === false) {
    return "false";
  }

  return "";
}

function getDecisionButtonClassName(decision: string) {
  return decision === "REVOKE" ? "button-ghost" : "button-secondary";
}

export function AccessReviewItemsTableView({
  reviewerEmail,
  items,
  canEdit,
  returnTo,
  bulkAction,
  rowAction
}: AccessReviewItemsTableViewProps) {
  return (
    <>
      <form id="bulk-review-form" action={bulkAction} className="panel review-bulk-form">
        <input type="hidden" name="returnTo" value={returnTo} />
        <div className="section-head">
          <div>
            <h3>Bulk review actions</h3>
            <p className="muted">Select visible rows, optionally add shared notes, then set a non-destructive review decision.</p>
          </div>
          <span className="pill warn">No Google Group changes are applied here</span>
        </div>
        <div className="review-bulk-grid">
          <label>
            Access justified
            <select name="accessJustified" defaultValue="">
              <option value="">Leave blank</option>
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          </label>
          <label className="review-bulk-notes">
            Decision notes
            <textarea
              name="decisionNotes"
              rows={2}
              placeholder="Optional note applied to all selected items."
            />
          </label>
        </div>
        <div className="inline-actions">
          <button type="submit" name="decision" value="APPROVED" className="button-secondary" disabled={!canEdit}>
            Bulk approve selected
          </button>
          <button type="submit" name="decision" value="REVOKE" className="button-ghost" disabled={!canEdit}>
            Bulk mark selected as revoke
          </button>
        </div>
      </form>

      <table className="table-tight">
        <thead>
          <tr>
            <th>Select</th>
            <th>Member</th>
            <th>Role</th>
            <th>Group</th>
            <th>Reviewer</th>
            <th>Decision</th>
            <th>Action required</th>
            <th>Reviewed at</th>
            <th>Reviewed by</th>
            <th>Review action</th>
          </tr>
        </thead>
        <tbody>
          {items.length > 0 ? (
            items.map((item) => {
              const normalizedDecision = normalizeAccessReviewDecision(item.decision);

              return (
                <tr key={item.id}>
                  <td>
                    {canEdit ? (
                      <input type="checkbox" name="selectedItemIds" value={item.id} form="bulk-review-form" />
                    ) : (
                      <span className="muted">Read-only</span>
                    )}
                  </td>
                  <td>
                    <strong>{item.memberName ?? item.memberEmail}</strong>
                    <div className="muted">{item.memberEmail}</div>
                  </td>
                  <td>{item.roleLabel ?? "Mapped membership"}</td>
                  <td>{item.groupEmail ?? "No mapped group"}</td>
                  <td>{reviewerEmail}</td>
                  <td>
                    <span className={`status-pill ${normalizedDecision.toLowerCase()}`}>{normalizedDecision}</span>
                    {item.decisionNotes ? <div className="muted">{item.decisionNotes}</div> : null}
                    {item.accessJustified !== null ? (
                      <div className="muted">access_justified: {String(item.accessJustified)}</div>
                    ) : null}
                  </td>
                  <td>{item.actionRequired ?? "Review required"}</td>
                  <td>{formatReviewedAt(item.reviewedAt)}</td>
                  <td>{item.reviewedByEmail ?? "Not reviewed"}</td>
                  <td>
                    {canEdit ? (
                      <form action={rowAction} className="review-item-form">
                        <input type="hidden" name="itemId" value={item.id} />
                        <input type="hidden" name="returnTo" value={returnTo} />
                        <label>
                          Access justified
                          <select name="accessJustified" defaultValue={formatAccessJustified(item.accessJustified)}>
                            <option value="">Unset</option>
                            <option value="true">true</option>
                            <option value="false">false</option>
                          </select>
                        </label>
                        <label>
                          Decision notes
                          <textarea
                            name="decisionNotes"
                            rows={2}
                            defaultValue={item.decisionNotes ?? ""}
                            placeholder="Optional reviewer note"
                          />
                        </label>
                        <div className="inline-actions">
                          <button
                            type="submit"
                            name="decision"
                            value="APPROVED"
                            className={getDecisionButtonClassName("APPROVED")}
                          >
                            Approve / Keep Access
                          </button>
                          <button
                            type="submit"
                            name="decision"
                            value="REVOKE"
                            className={getDecisionButtonClassName("REVOKE")}
                          >
                            Revoke Access
                          </button>
                          <button
                            type="submit"
                            name="decision"
                            value="NEEDS_UPDATE"
                            className={getDecisionButtonClassName("NEEDS_UPDATE")}
                          >
                            Needs Update
                          </button>
                        </div>
                      </form>
                    ) : (
                      <span className="muted">Read-only</span>
                    )}
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={10} className="muted">
                No access review items match the current filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </>
  );
}

interface AccessReviewItemsTableProps {
  reviewerEmail: string;
  items: AccessReviewTableItem[];
  canEdit: boolean;
  returnTo: string;
}

export function AccessReviewItemsTable(props: AccessReviewItemsTableProps) {
  return (
    <AccessReviewItemsTableView
      {...props}
      bulkAction={bulkReviewAccessReviewItems}
      rowAction={reviewAccessReviewItem}
    />
  );
}
