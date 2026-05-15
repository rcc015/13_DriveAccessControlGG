import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { canSearchManagedUsers } from "@/lib/users/search-access";
import { getManagedDirectoryStatus } from "@/lib/users/directory-status";

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canSearchManagedUsers(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const status = await getManagedDirectoryStatus();

  return NextResponse.json(status, {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
