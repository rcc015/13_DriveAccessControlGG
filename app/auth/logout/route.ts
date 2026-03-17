import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth/session";
import { env } from "@/lib/config/env";

export async function GET() {
  await clearSessionCookie();
  return NextResponse.redirect(new URL("/", env.APP_BASE_URL ?? "http://localhost:3000"));
}
