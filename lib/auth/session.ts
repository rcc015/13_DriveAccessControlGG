import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import { env, getAdminRoleOverrides, getAllowedAdminEmails } from "@/lib/config/env";
import { getHomeRouteForRole, resolveAccessForIdentity } from "@/lib/auth/access-resolver";
import type { AppRoleName } from "@/types/domain";

const SESSION_COOKIE_NAME = "drive-access-console-session";
const STATE_COOKIE_NAME = "drive-access-console-oauth-state";

export interface AppSession {
  email: string;
  displayName: string;
  appRole: AppRoleName;
  avatarUrl?: string | null;
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

function getDeniedReasonQuery(reason: string) {
  switch (reason) {
    case "NOT_IN_ALLOWED_DOMAIN":
      return "domain_not_allowed";
    case "DIRECTORY_INACTIVE":
      return "inactive_account";
    case "NOT_SYNCED_ACTIVE_EMPLOYEE":
      return "portal_access_denied";
    default:
      return "portal_access_denied";
  }
}

function isAllowedEmail(email: string) {
  const normalized = email.toLowerCase();

  if (env.GOOGLE_HOSTED_DOMAIN) {
    return normalized.endsWith(`@${env.GOOGLE_HOSTED_DOMAIN.toLowerCase()}`);
  }

  return true;
}

function shouldUseSecureCookies() {
  return (env.APP_BASE_URL ?? "").startsWith("https://");
}

function buildCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: shouldUseSecureCookies(),
    path: "/",
    maxAge
  };
}

export async function getSession(): Promise<AppSession | null> {
  const state = await getSessionState();

  if (state.kind !== "authenticated") {
    return null;
  }

  return state.session;
}

export async function requireSession(): Promise<AppSession> {
  const state = await getSessionState();

  if (state.kind === "anonymous") {
    redirect("/auth/login");
  }

  if (state.kind === "denied") {
    redirect(`/auth/error?reason=${getDeniedReasonQuery(state.reason)}`);
  }

  return state.session;
}

export async function createSessionCookie(session: AppSession) {
  const cookieStore = await cookies();
  const cookie = buildSessionCookie(session);
  cookieStore.set(cookie.name, cookie.value, cookie.options);
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function setOAuthStateCookie(state: string) {
  const cookieStore = await cookies();
  const cookie = buildOAuthStateCookie(state);
  cookieStore.set(cookie.name, cookie.value, cookie.options);
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

export async function resolveAuthorizedSession(profile: { email: string; name?: string | null; picture?: string | null }) {
  const normalizedEmail = profile.email.toLowerCase();
  const directoryUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: {
      roleAssignments: {
        include: {
          role: true
        }
      }
    }
  });

  const explicitRole = getRoleForEmail(normalizedEmail);
  const resolution = resolveAccessForIdentity({
    email: normalizedEmail,
    hostedDomain: env.GOOGLE_HOSTED_DOMAIN,
    explicitRole: explicitRole === "REQUESTER" ? null : explicitRole,
    assignedRoles: directoryUser?.roleAssignments.map((assignment) => assignment.role.name as AppRoleName) ?? [],
    directoryUser: directoryUser
      ? {
          isActive: directoryUser.isActive,
          directoryStatus: directoryUser.directoryStatus
        }
      : null
  });

  if (!resolution.authorized || !resolution.appRole) {
    return {
      authorized: false as const,
      reason: resolution.reason
    };
  }

  return {
    authorized: true as const,
    session: {
      email: normalizedEmail,
      displayName: profile.name?.trim() || directoryUser?.displayName || normalizedEmail.split("@")[0],
      appRole: resolution.appRole,
      avatarUrl: profile.picture?.trim() || null
    } satisfies AppSession
  };
}

export function createSessionFromGoogleProfile(profile: { email: string; name?: string | null; picture?: string | null }) {
  return {
    email: profile.email.toLowerCase(),
    displayName: profile.name?.trim() || profile.email.split("@")[0],
    appRole: getRoleForEmail(profile.email),
    avatarUrl: profile.picture?.trim() || null
  } satisfies AppSession;
}

export function buildSessionCookie(session: AppSession) {
  const payload: SignedSessionPayload = {
    ...session,
    exp: Date.now() + 1000 * 60 * 60 * 8
  };

  return {
    name: SESSION_COOKIE_NAME,
    value: serializeSignedValue(JSON.stringify(payload)),
    options: buildCookieOptions(60 * 60 * 8)
  };
}

export function buildOAuthStateCookie(state: string) {
  return {
    name: STATE_COOKIE_NAME,
    value: serializeSignedValue(state),
    options: buildCookieOptions(60 * 10)
  };
}

export async function getSessionState(): Promise<
  | { kind: "anonymous" }
  | { kind: "denied"; reason: string }
  | { kind: "authenticated"; session: AppSession }
> {
  const allowedAdminEmails = getAllowedAdminEmails();

  if (env.AUTH_MODE === "mock") {
    const email = env.MOCK_USER_EMAIL ?? allowedAdminEmails[0] ?? "admin@example.com";
    const isAllowed = isAllowedEmail(email);

    if (!isAllowed) {
      throw new Error(`Mock user ${email} is not allowed for this app session.`);
    }

    return {
      kind: "authenticated",
      session: {
        email,
        displayName: env.MOCK_USER_NAME ?? "Internal Admin",
        appRole: env.MOCK_USER_ROLE ?? getRoleForEmail(email),
        avatarUrl: null
      }
    };
  }

  const cookieStore = await cookies();
  const rawSession = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!rawSession) {
    return { kind: "anonymous" };
  }

  const parsed = parseSignedValue(rawSession);

  if (!parsed) {
    return { kind: "anonymous" };
  }

  const payload = JSON.parse(parsed) as SignedSessionPayload;
  const isExpired = payload.exp < Date.now();
  const isAllowed = isAllowedEmail(payload.email);

  if (isExpired || !isAllowed) {
    return { kind: "anonymous" };
  }

  const directoryUser = await prisma.user.findUnique({
    where: { email: payload.email.toLowerCase() },
    include: {
      roleAssignments: {
        include: {
          role: true
        }
      }
    }
  });

  const explicitRole = getRoleForEmail(payload.email);
  const resolution = resolveAccessForIdentity({
    email: payload.email,
    hostedDomain: env.GOOGLE_HOSTED_DOMAIN,
    explicitRole: explicitRole === "REQUESTER" ? null : explicitRole,
    assignedRoles: directoryUser?.roleAssignments.map((assignment) => assignment.role.name as AppRoleName) ?? [],
    directoryUser: directoryUser
      ? {
          isActive: directoryUser.isActive,
          directoryStatus: directoryUser.directoryStatus
        }
      : null
  });

  if (!resolution.authorized || !resolution.appRole) {
    return {
      kind: "denied",
      reason: resolution.reason
    };
  }

  return {
    kind: "authenticated",
    session: {
      email: payload.email.toLowerCase(),
      displayName: payload.displayName,
      appRole: resolution.appRole,
      avatarUrl: payload.avatarUrl ?? null
    }
  };
}

export { getHomeRouteForRole };
