import type { Metadata } from "next";
import "./globals.css";
import { DashboardShell } from "@/components/dashboard/shell";
import { RequesterShell } from "@/components/requester/shell";
import { adminAndReadRoles } from "@/lib/auth/authorization";
import { getSession } from "@/lib/auth/session";
import { env } from "@/lib/config/env";

export const metadata: Metadata = {
  title: "Drive Access Console",
  description: "Internal app for RBAC-driven Shared Drive access management and auditing."
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  const useAdminShell = session ? adminAndReadRoles.includes(session.appRole) : false;

  return (
    <html lang="en">
      <body>
        {session ? (
          useAdminShell ? (
            <DashboardShell session={session} authMode={env.AUTH_MODE}>
              {children}
            </DashboardShell>
          ) : (
            <RequesterShell session={session} authMode={env.AUTH_MODE}>
              {children}
            </RequesterShell>
          )
        ) : (
          children
        )}
      </body>
    </html>
  );
}
