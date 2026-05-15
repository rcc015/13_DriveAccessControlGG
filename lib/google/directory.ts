import { google } from "googleapis";
import { env } from "@/lib/config/env";
import { createDelegatedGoogleAuth } from "@/lib/google/auth";
import type { DirectoryMember, DirectoryProvider, DirectoryUser } from "@/lib/google/types";

const DIRECTORY_SCOPES = [
  "https://www.googleapis.com/auth/admin.directory.group",
  "https://www.googleapis.com/auth/admin.directory.group.member.readonly",
  "https://www.googleapis.com/auth/admin.directory.user.readonly"
];

export class GoogleDirectoryProvider implements DirectoryProvider {
  private client = google.admin({
    version: "directory_v1",
    auth: createDelegatedGoogleAuth(DIRECTORY_SCOPES)
  });

  private customerId = env.GOOGLE_DIRECTORY_CUSTOMER_ID ?? "my_customer";
  private hostedDomain = env.GOOGLE_HOSTED_DOMAIN?.toLowerCase();

  async searchUsers(query: string) {
    const normalized = query.trim();

    if (!normalized) {
      return [];
    }

    const clauses = buildDirectorySearchClauses(normalized);
    const results = new Map<string, DirectoryUser>();

    for (const clause of clauses) {
      const response = await this.client.users.list({
        customer: this.customerId,
        query: clause,
        maxResults: 20,
        orderBy: "email"
      });

      for (const user of response.data.users ?? []) {
        const primaryEmail = user.primaryEmail ?? "";

        if (!primaryEmail) {
          continue;
        }

        results.set(primaryEmail.toLowerCase(), mapGoogleUser(user));
      }
    }

    return Array.from(results.values()).slice(0, 20);
  }

  async listActiveUsers() {
    const users: DirectoryUser[] = [];
    let pageToken: string | undefined;

    do {
      const response = await this.client.users.list({
        customer: this.customerId,
        query: "isSuspended=false",
        maxResults: 500,
        orderBy: "email",
        pageToken
      });

      for (const user of response.data.users ?? []) {
        const primaryEmail = user.primaryEmail ?? "";
        if (!primaryEmail || (this.hostedDomain && !primaryEmail.toLowerCase().endsWith(`@${this.hostedDomain}`))) {
          continue;
        }

        users.push(mapGoogleUser(user));
      }

      pageToken = response.data.nextPageToken ?? undefined;
    } while (pageToken);

    return users;
  }

  async getUserByEmail(email: string) {
    try {
      const response = await this.client.users.get({
        userKey: email
      });

      const primaryEmail = response.data.primaryEmail ?? email;
      return mapGoogleUser({
        ...response.data,
        primaryEmail
      });
    } catch (error) {
      if (isNotFoundError(error)) {
        return null;
      }

      throw error;
    }
  }

  async listGroupMembers(groupKey: string) {
    const members: DirectoryMember[] = [];
    let pageToken: string | undefined;

    do {
      const response = await this.client.members.list({ groupKey, pageToken, maxResults: 200 });

      members.push(
        ...(response.data.members ?? []).map<DirectoryMember>((member) => ({
          id: member.id ?? member.email ?? crypto.randomUUID(),
          email: member.email ?? "",
          role: member.role ?? "MEMBER"
        }))
      );

      pageToken = response.data.nextPageToken ?? undefined;
    } while (pageToken);

    return members;
  }

  async addGroupMember(groupKey: string, email: string) {
    try {
      await this.client.members.insert({
        groupKey,
        requestBody: {
          email,
          role: "MEMBER"
        }
      });
    } catch (error) {
      if (isAlreadyExistsError(error)) {
        return;
      }

      throw error;
    }
  }

  async removeGroupMember(groupKey: string, memberKey: string) {
    try {
      await this.client.members.delete({
        groupKey,
        memberKey
      });
    } catch (error) {
      if (isNotFoundError(error)) {
        return;
      }

      throw error;
    }
  }
}

function buildDirectorySearchClauses(query: string) {
  const safeValue = query.replace(/"/g, "");
  const tokens = safeValue
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
  const clauses = new Set<string>();

  clauses.add(`email:${safeValue}*`);

  for (const token of tokens) {
    clauses.add(`email:${token}*`);
    clauses.add(`givenName:${token}*`);
    clauses.add(`familyName:${token}*`);
  }

  return Array.from(clauses);
}

function mapGoogleUser(user: {
  id?: string | null;
  primaryEmail?: string | null;
  suspended?: boolean | null;
  orgUnitPath?: string | null;
  aliases?: string[] | null;
  organizations?: Array<{ department?: string | null; title?: string | null }> | null;
  name?: {
    givenName?: string | null;
    familyName?: string | null;
    fullName?: string | null;
  } | null;
}): DirectoryUser {
  return {
    id: user.id ?? user.primaryEmail ?? crypto.randomUUID(),
    primaryEmail: user.primaryEmail ?? "",
    suspended: user.suspended ?? false,
    orgUnitPath: user.orgUnitPath ?? null,
    department: user.organizations?.find((entry) => entry.department)?.department ?? null,
    title: user.organizations?.find((entry) => entry.title)?.title ?? null,
    aliases: (user.aliases ?? []).filter(Boolean),
    name: {
      givenName: user.name?.givenName ?? null,
      familyName: user.name?.familyName ?? null,
      fullName: user.name?.fullName ?? null
    }
  };
}

function isAlreadyExistsError(error: unknown) {
  return getGoogleStatus(error) === 409;
}

function isNotFoundError(error: unknown) {
  return getGoogleStatus(error) === 404;
}

function getGoogleStatus(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }

  const maybeStatus = (error as { status?: number }).status;
  if (typeof maybeStatus === "number") {
    return maybeStatus;
  }

  const maybeResponseStatus = (error as { response?: { status?: number } }).response?.status;
  return typeof maybeResponseStatus === "number" ? maybeResponseStatus : undefined;
}
