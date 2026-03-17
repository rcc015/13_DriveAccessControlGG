import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "drive-access-console",
    timestamp: new Date().toISOString()
  });
}
