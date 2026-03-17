import { NextResponse } from "next/server";
import { env } from "@/lib/config/env";
import { buildGoogleLoginUrl, generateOAuthState } from "@/lib/auth/google-oauth";
import { setOAuthStateCookie } from "@/lib/auth/session";

export async function GET() {
  if (env.AUTH_MODE === "mock") {
    return NextResponse.redirect(new URL("/", env.APP_BASE_URL ?? "http://localhost:3000"));
  }

  const state = generateOAuthState();
  await setOAuthStateCookie(state);

  return NextResponse.redirect(buildGoogleLoginUrl(state));
}
