import type { Metadata } from "next";
import "./globals.css";
import { DashboardShell } from "@/components/dashboard/shell";
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

  return (
    <html lang="en">
      <body>
        {session ? (
          <DashboardShell session={session} authMode={env.AUTH_MODE}>
            {children}
          </DashboardShell>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
