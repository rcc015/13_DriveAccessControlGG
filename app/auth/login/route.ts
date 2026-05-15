import { NextResponse } from "next/server";
import { env } from "@/lib/config/env";
import { buildGoogleLoginUrl, generateOAuthState } from "@/lib/auth/google-oauth";
import { buildOAuthStateCookie } from "@/lib/auth/session";

export async function GET(request: Request) {
  if (env.AUTH_MODE === "mock") {
    return NextResponse.redirect(new URL("/", env.APP_BASE_URL ?? request.url));
  }

  const state = generateOAuthState();
  const response = NextResponse.redirect(buildGoogleLoginUrl(state));
  const cookie = buildOAuthStateCookie(state);
  response.cookies.set(cookie.name, cookie.value, cookie.options);

  return response;
}
