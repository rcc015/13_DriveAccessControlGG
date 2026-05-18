import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AccessReviewItemsTableView } from "@/components/dashboard/access-review-items-table";

test("pending review items render in the access reviews table", () => {
  const html = renderToStaticMarkup(
    <AccessReviewItemsTableView
      reviewerEmail="reviewer@example.com"
      canEdit={false}
      returnTo="/access-reviews"
      bulkAction="/access-reviews"
      rowAction="/access-reviews"
      items={[
        {
          id: "item-1",
          memberName: "Alice Admin",
          memberEmail: "alice@example.com",
          roleLabel: "Finance Analyst",
          groupEmail: "grp-finance@example.com",
          decision: null,
          actionRequired: "Maintain membership",
          reviewedAt: null,
          reviewedByEmail: null,
          decisionNotes: null,
          accessJustified: null
        }
      ]}
    />
  );

  assert.match(html, /Alice Admin/);
  assert.match(html, /alice@example\.com/);
  assert.match(html, /reviewer@example\.com/);
  assert.match(html, /PENDING/);
  assert.match(html, /Maintain membership/);
});
