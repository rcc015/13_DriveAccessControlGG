import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/config/env";
import { buildSessionCookie, createSessionFromGoogleProfile, consumeOAuthStateCookie } from "@/lib/auth/session";
import { exchangeCodeForProfile } from "@/lib/auth/google-oauth";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
    return NextResponse.redirect(new URL("/auth/error?reason=missing_code_or_state", env.APP_BASE_URL ?? request.url));
  }

  const storedState = await consumeOAuthStateCookie();

  if (!storedState || storedState !== state) {
    return NextResponse.redirect(new URL("/auth/error?reason=invalid_oauth_state", env.APP_BASE_URL ?? request.url));
  }

  try {
    const profile = await exchangeCodeForProfile(code);
    const response = NextResponse.redirect(new URL("/", env.APP_BASE_URL ?? request.url));
    const cookie = buildSessionCookie(createSessionFromGoogleProfile(profile));
    response.cookies.set(cookie.name, cookie.value, cookie.options);

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    const reason = message.includes("not allowed") || message.includes("hosted domain")
      ? "domain_not_allowed"
      : "token_exchange_failed";

    return NextResponse.redirect(new URL(`/auth/error?reason=${reason}`, env.APP_BASE_URL ?? request.url));
  }
}
