import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { canSearchManagedUsers } from "@/lib/users/search-access";
import { searchManagedUsersWithStatus } from "@/lib/users/search";

export async function GET(request: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canSearchManagedUsers(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "10");
  const includeInactive = request.nextUrl.searchParams.get("includeInactive") === "true";
  const excludeEmails = (request.nextUrl.searchParams.get("excludeEmails") ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  const results = await searchManagedUsersWithStatus(query, {
    includeInactive,
    excludeEmails,
    limit: Number.isFinite(limit) ? limit : 10
  });

  return NextResponse.json(results, {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
