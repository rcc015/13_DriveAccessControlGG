import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env, getAdminRoleOverrides, getAllowedAdminEmails, getAllowedAppEmails } from "@/lib/config/env";
import type { AppRoleName } from "@/types/domain";

const SESSION_COOKIE_NAME = "drive-access-console-session";
const STATE_COOKIE_NAME = "drive-access-console-oauth-state";

export interface AppSession {
  email: string;
  displayName: string;
  appRole: AppRoleName;
}

interface SignedSessionPayload extends AppSession {
  exp: number;
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(value: string) {
  const secret = env.SESSION_SECRET ?? "dev-only-session-secret";
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function serializeSignedValue(payload: string) {
  const encoded = base64UrlEncode(payload);
  return `${encoded}.${sign(encoded)}`;
}

function parseSignedValue(value: string) {
  const [encoded, signature] = value.split(".");

  if (!encoded || !signature) {
    return null;
  }

  const expected = sign(encoded);

  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return null;
  }

  return base64UrlDecode(encoded);
}

function getRoleForEmail(email: string): AppRoleName {
  const normalized = email.toLowerCase();
  const overrides = getAdminRoleOverrides();
  if (overrides[normalized]) {
    return overrides[normalized];
  }

  if (getAllowedAdminEmails().includes(normalized)) {
    return "SUPER_ADMIN";
  }

  return "REQUESTER";
}

function isAllowedEmail(email: string) {
  const normalized = email.toLowerCase();
  const explicitlyAllowed = getAllowedAppEmails();

  if (explicitlyAllowed.length > 0) {
    return explicitlyAllowed.includes(normalized);
  }

  if (env.GOOGLE_HOSTED_DOMAIN) {
    return normalized.endsWith(`@${env.GOOGLE_HOSTED_DOMAIN.toLowerCase()}`);
  }

  return true;
}

function shouldUseSecureCookies() {
  return (env.APP_BASE_URL ?? "").startsWith("https://");
}

export async function getSession(): Promise<AppSession | null> {
  const allowedAdminEmails = getAllowedAdminEmails();

  if (env.AUTH_MODE === "mock") {
    const email = env.MOCK_USER_EMAIL ?? allowedAdminEmails[0] ?? "admin@example.com";
    const isAllowed = isAllowedEmail(email);

    if (!isAllowed) {
      throw new Error(`Mock user ${email} is not allowed for this app session.`);
    }

    return {
      email,
      displayName: env.MOCK_USER_NAME ?? "Internal Admin",
      appRole: env.MOCK_USER_ROLE ?? getRoleForEmail(email)
    };
  }

  const cookieStore = await cookies();
  const rawSession = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!rawSession) {
    return null;
  }

  const parsed = parseSignedValue(rawSession);

  if (!parsed) {
    return null;
  }

  const payload = JSON.parse(parsed) as SignedSessionPayload;
  const isExpired = payload.exp < Date.now();
  const isAllowed = isAllowedEmail(payload.email);

  if (isExpired || !isAllowed) {
    return null;
  }

  return {
    email: payload.email,
    displayName: payload.displayName,
    appRole: payload.appRole
  };
}

export async function requireSession(): Promise<AppSession> {
  const session = await getSession();

  if (!session) {
    redirect("/auth/login");
  }

  return session;
}

export async function createSessionCookie(session: AppSession) {
  const cookieStore = await cookies();
  const payload: SignedSessionPayload = {
    ...session,
    exp: Date.now() + 1000 * 60 * 60 * 8
  };

  cookieStore.set(SESSION_COOKIE_NAME, serializeSignedValue(JSON.stringify(payload)), {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookies(),
    path: "/",
    maxAge: 60 * 60 * 8
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function setOAuthStateCookie(state: string) {
  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE_NAME, serializeSignedValue(state), {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookies(),
    path: "/",
    maxAge: 60 * 10
  });
}

export async function consumeOAuthStateCookie() {
  const cookieStore = await cookies();
  const value = cookieStore.get(STATE_COOKIE_NAME)?.value;
  cookieStore.delete(STATE_COOKIE_NAME);

  if (!value) {
    return null;
  }

  return parseSignedValue(value);
}

export function createSessionFromGoogleProfile(profile: { email: string; name?: string | null }) {
  return {
    email: profile.email.toLowerCase(),
    displayName: profile.name?.trim() || profile.email.split("@")[0],
    appRole: getRoleForEmail(profile.email)
  } satisfies AppSession;
}
