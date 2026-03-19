import { google } from "googleapis";
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

  async searchUsers(query: string) {
    const response = await this.client.users.list({
      customer: "my_customer",
      query,
      maxResults: 20,
      orderBy: "email"
    });

    return (response.data.users ?? []).map<DirectoryUser>((user) => ({
      id: user.id ?? user.primaryEmail ?? crypto.randomUUID(),
      primaryEmail: user.primaryEmail ?? "",
      name: {
        fullName: user.name?.fullName ?? null
      }
    }));
  }

  async listGroupMembers(groupKey: string) {
    const response = await this.client.members.list({ groupKey });
    return (response.data.members ?? []).map<DirectoryMember>((member) => ({
      id: member.id ?? member.email ?? crypto.randomUUID(),
      email: member.email ?? "",
      role: member.role ?? "MEMBER"
    }));
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
