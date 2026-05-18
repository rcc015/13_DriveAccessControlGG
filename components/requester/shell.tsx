"use client";

import type { ReactNode } from "react";

interface RequesterShellProps {
  children: ReactNode;
  session: {
    email: string;
    displayName: string;
    avatarUrl?: string | null;
  };
  authMode: "mock" | "google";
}

export function RequesterShell({ children, session, authMode }: RequesterShellProps) {
  return (
    <div className="requester-shell">
      <header className="requester-header">
        <div className="requester-brand">
          <h1>Drive Access Console</h1>
          <p>Simple request portal for Shared Drive and role-based access.</p>
        </div>
        <div className="requester-session-card">
          {session.avatarUrl ? <img src={session.avatarUrl} alt="" className="requester-avatar" /> : null}
          <div>
            <strong>{session.displayName}</strong>
            <span>{session.email}</span>
          </div>
          {authMode === "google" ? (
            <a href="/auth/logout" className="session-link">
              Sign out
            </a>
          ) : (
            <span className="session-link muted">Mock session</span>
          )}
        </div>
      </header>
      <main className="requester-main">{children}</main>
    </div>
  );
}
