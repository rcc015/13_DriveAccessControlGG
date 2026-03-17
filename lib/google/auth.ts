import { google } from "googleapis";
import { env } from "@/lib/config/env";

function parseServiceAccountJson() {
  if (!env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not configured.");
  }

  return JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_JSON) as {
    client_email: string;
    private_key: string;
  };
}

export function createDelegatedGoogleAuth(scopes: string[]) {
  const credentials = parseServiceAccountJson();

  return new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    subject: env.GOOGLE_IMPERSONATED_ADMIN,
    scopes
  });
}
