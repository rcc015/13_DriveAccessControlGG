import { z } from "zod";
import type { AppRoleName } from "@/types/domain";

const optionalNonEmptyString = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}, z.string().min(1).optional());

const optionalUrl = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}, z.string().url().optional());

const optionalEmail = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}, z.string().email().optional());

const appRoleNameValues = [
  "REQUESTER",
  "SUPER_ADMIN",
  "ACCESS_ADMIN",
  "QMS_ACCESS_ADMIN",
  "STRATEGIC_ACCESS_ADMIN",
  "OPERATIONAL_ACCESS_ADMIN",
  "SUPPORT_ACCESS_ADMIN",
  "REVIEWER",
  "READ_ONLY_AUDITOR"
] as const;

const envSchema = z
  .object({
    AUTH_MODE: z.enum(["mock", "google"]).default("mock"),
    GOOGLE_INTEGRATION_MODE: z.enum(["mock", "google"]).default("mock"),
    MOCK_USER_EMAIL: optionalEmail,
    MOCK_USER_NAME: optionalNonEmptyString,
    MOCK_USER_ROLE: z
      .enum(appRoleNameValues)
      .optional(),
    GOOGLE_CLIENT_ID: optionalNonEmptyString,
    GOOGLE_CLIENT_SECRET: optionalNonEmptyString,
    GOOGLE_REDIRECT_URI: optionalUrl,
    GOOGLE_HOSTED_DOMAIN: optionalNonEmptyString,
    GOOGLE_IMPERSONATED_ADMIN: optionalEmail,
    GOOGLE_SERVICE_ACCOUNT_JSON: optionalNonEmptyString,
    GOOGLE_REPORTS_FOLDER_ID: optionalNonEmptyString,
    GOOGLE_REPORTS_SHARED_DRIVE_ID: optionalNonEmptyString,
    DATABASE_URL: optionalNonEmptyString,
    APP_BASE_URL: optionalUrl,
    SESSION_SECRET: optionalNonEmptyString,
    ALLOWED_ADMIN_EMAILS: z.string().optional(),
    ALLOWED_REQUESTER_EMAILS: z.string().optional(),
    ADMIN_ROLE_OVERRIDES: z.string().optional()
  })
  .superRefine((value, ctx) => {
    if (value.AUTH_MODE === "google") {
      if (!value.GOOGLE_CLIENT_ID) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["GOOGLE_CLIENT_ID"],
          message: "GOOGLE_CLIENT_ID is required when AUTH_MODE=google."
        });
      }

      if (!value.GOOGLE_CLIENT_SECRET) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["GOOGLE_CLIENT_SECRET"],
          message: "GOOGLE_CLIENT_SECRET is required when AUTH_MODE=google."
        });
      }

      if (!value.GOOGLE_REDIRECT_URI) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["GOOGLE_REDIRECT_URI"],
          message: "GOOGLE_REDIRECT_URI is required when AUTH_MODE=google."
        });
      }
    }

    if (value.AUTH_MODE === "google" || value.GOOGLE_INTEGRATION_MODE === "google") {
      if (!value.SESSION_SECRET) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["SESSION_SECRET"],
          message: "SESSION_SECRET is required when Google auth or integration is enabled."
        });
      }

      if (!value.APP_BASE_URL) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["APP_BASE_URL"],
          message: "APP_BASE_URL is required when Google auth or integration is enabled."
        });
      }
    }

    if (value.GOOGLE_INTEGRATION_MODE === "google") {
      if (!value.GOOGLE_IMPERSONATED_ADMIN) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["GOOGLE_IMPERSONATED_ADMIN"],
          message: "GOOGLE_IMPERSONATED_ADMIN is required when GOOGLE_INTEGRATION_MODE=google."
        });
      }

      if (!value.GOOGLE_SERVICE_ACCOUNT_JSON) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["GOOGLE_SERVICE_ACCOUNT_JSON"],
          message: "GOOGLE_SERVICE_ACCOUNT_JSON is required when GOOGLE_INTEGRATION_MODE=google."
        });
      }
    }
  });

export const env = envSchema.parse(process.env);

export function getAllowedAdminEmails(): string[] {
  return (env.ALLOWED_ADMIN_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export function getAllowedRequesterEmails(): string[] {
  return (env.ALLOWED_REQUESTER_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export function getAllowedAppEmails(): string[] {
  return Array.from(
    new Set([...getAllowedAdminEmails(), ...getAllowedRequesterEmails(), ...Object.keys(getAdminRoleOverrides())])
  );
}

export function getAdminRoleOverrides(): Record<string, AppRoleName> {
  return (env.ADMIN_ROLE_OVERRIDES ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce<Record<string, AppRoleName>>((acc, entry) => {
      const [email, role] = entry.split(":").map((part) => part.trim());

      if (email && role && appRoleNameValues.includes(role as (typeof appRoleNameValues)[number])) {
        acc[email.toLowerCase()] = role as AppRoleName;
      }

      return acc;
    }, {});
}
