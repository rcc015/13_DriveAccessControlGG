"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { adminAndReadRoles, adminAssignmentRoles } from "@/lib/auth/authorization";
import type { AppRoleName } from "@/types/domain";

const links = [
  { href: "/", label: "Overview", roles: adminAndReadRoles },
  { href: "/users", label: "Users", roles: adminAssignmentRoles },
  { href: "/role-matrix", label: "Role Matrix", roles: adminAndReadRoles },
  { href: "/access-viewer", label: "Access Viewer", roles: adminAndReadRoles },
  { href: "/access-requests", label: "Access Requests", roles: adminAssignmentRoles },
  { href: "/access-reviews", label: "Access Reviews", roles: ["SUPER_ADMIN", "REVIEWER", "READ_ONLY_AUDITOR"] },
  { href: "/reports", label: "Reports", roles: adminAndReadRoles },
  { href: "/templates", label: "Templates", roles: adminAssignmentRoles },
  { href: "/google-integration", label: "Google", roles: ["SUPER_ADMIN"] }
].map((link) => ({
  ...link,
  roles: link.roles as AppRoleName[]
}));

interface DashboardShellProps {
  children: ReactNode;
  session: {
    email: string;
    displayName: string;
    appRole: AppRoleName;
  };
  authMode: "mock" | "google";
}

export function DashboardShell({ children, session, authMode }: DashboardShellProps) {
  const pathname = usePathname();
  const visibleLinks = links.filter((link) => link.roles.includes(session.appRole));

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <h1>Drive Access Console</h1>
          <p>RBAC control plane for Shared Drive access, exceptions, and audit evidence.</p>
        </div>
        <div className="session-card">
          <strong>{session.displayName}</strong>
          <span>{session.email}</span>
          <span className="pill">{session.appRole.replaceAll("_", " ")}</span>
          {authMode === "google" ? (
            <a href="/auth/logout" className="session-link">
              Sign out
            </a>
          ) : (
            <span className="session-link muted">Mock session</span>
          )}
        </div>
        <nav className="nav">
          {visibleLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href as Route}
              className={pathname === link.href ? "active" : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
