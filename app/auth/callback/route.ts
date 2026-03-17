import { NextRequest, NextResponse } from "next/server";
import { createSessionFromGoogleProfile, createSessionCookie, consumeOAuthStateCookie } from "@/lib/auth/session";
import { exchangeCodeForProfile } from "@/lib/auth/google-oauth";
import { env } from "@/lib/config/env";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
    return NextResponse.redirect(new URL("/", env.APP_BASE_URL ?? "http://localhost:3000"));
  }

  const storedState = await consumeOAuthStateCookie();

  if (!storedState || storedState !== state) {
    return NextResponse.redirect(new URL("/", env.APP_BASE_URL ?? "http://localhost:3000"));
  }

  const profile = await exchangeCodeForProfile(code);
  await createSessionCookie(createSessionFromGoogleProfile(profile));

  return NextResponse.redirect(new URL("/", env.APP_BASE_URL ?? "http://localhost:3000"));
}
