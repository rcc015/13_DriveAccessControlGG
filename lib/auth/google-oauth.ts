import { randomBytes } from "node:crypto";
import { env, getAllowedAppEmails } from "@/lib/config/env";

export function buildGoogleLoginUrl(state: string) {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", env.GOOGLE_CLIENT_ID ?? "");
  url.searchParams.set("redirect_uri", env.GOOGLE_REDIRECT_URI ?? "");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("access_type", "online");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("prompt", "select_account");

  if (env.GOOGLE_HOSTED_DOMAIN) {
    url.searchParams.set("hd", env.GOOGLE_HOSTED_DOMAIN);
  }

  return url.toString();
}

export function generateOAuthState() {
  return randomBytes(24).toString("hex");
}

export async function exchangeCodeForProfile(code: string) {
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID ?? "",
      client_secret: env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: env.GOOGLE_REDIRECT_URI ?? "",
      grant_type: "authorization_code"
    })
  });

  if (!tokenResponse.ok) {
    throw new Error("Google token exchange failed.");
  }

  const tokenJson = (await tokenResponse.json()) as {
    access_token?: string;
  };

  if (!tokenJson.access_token) {
    throw new Error("Google access token missing.");
  }

  const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: {
      Authorization: `Bearer ${tokenJson.access_token}`
    }
  });

  if (!profileResponse.ok) {
    throw new Error("Google userinfo request failed.");
  }

  const profile = (await profileResponse.json()) as {
    email?: string;
    name?: string | null;
    hd?: string;
  };

  if (!profile.email) {
    throw new Error("Google profile email missing.");
  }

  const allowedEmails = getAllowedAppEmails();
  const normalizedEmail = profile.email.toLowerCase();

  if (allowedEmails.length > 0 && !allowedEmails.includes(normalizedEmail)) {
    throw new Error(`Email ${normalizedEmail} is not allowed to access the app.`);
  }

  if (env.GOOGLE_HOSTED_DOMAIN && !normalizedEmail.endsWith(`@${env.GOOGLE_HOSTED_DOMAIN}`)) {
    throw new Error(`Email ${normalizedEmail} is not in hosted domain ${env.GOOGLE_HOSTED_DOMAIN}.`);
  }

  return {
    email: normalizedEmail,
    name: profile.name ?? normalizedEmail.split("@")[0]
  };
}
