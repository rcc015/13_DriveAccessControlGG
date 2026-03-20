import { PassThrough } from "node:stream";
import { google } from "googleapis";
import { createDelegatedGoogleAuth } from "@/lib/google/auth";
import { env } from "@/lib/config/env";
import type { GeneratedFileRef } from "@/types/domain";
import type { DrivePrincipalRef, DriveProvider, RestrictedFolderAccessSnapshot } from "@/lib/google/types";

const DRIVE_SCOPES = ["https://www.googleapis.com/auth/drive"];

export class GoogleDriveProvider implements DriveProvider {
  private client = google.drive({
    version: "v3",
    auth: createDelegatedGoogleAuth(DRIVE_SCOPES)
  });

  async uploadReport(name: string, mimeType: string, content: Buffer): Promise<GeneratedFileRef> {
    const body = new PassThrough();
    body.end(content);

    const response = await this.client.files.create({
      supportsAllDrives: true,
      requestBody: {
        name,
        parents: env.GOOGLE_REPORTS_FOLDER_ID ? [env.GOOGLE_REPORTS_FOLDER_ID] : undefined
      },
      media: {
        mimeType,
        body
      },
      fields: "id,name,webViewLink"
    });

    return {
      fileId: response.data.id ?? "",
      name: response.data.name ?? name,
      webViewLink: response.data.webViewLink ?? ""
    };
  }

  async createFolder(parentId: string, name: string) {
    const response = await this.client.files.create({
      supportsAllDrives: true,
      requestBody: {
        name,
        mimeType: "application/vnd.google-apps.folder",
        parents: [parentId]
      },
      fields: "id,name"
    });

    return response.data;
  }

  async ensureFolderGroupAccess(folderPath: string, groupEmail: string, role: string) {
    const folderId = await this.resolveFolderIdByPath(folderPath);
    await this.ensurePermission(folderId, "group", groupEmail, role);
  }

  async ensureFolderUserAccess(folderPath: string, userEmail: string, role: string) {
    const folderId = await this.resolveFolderIdByPath(folderPath);
    await this.ensurePermission(folderId, "user", userEmail, role);
  }

  async listSharedDrivePrincipals(sharedDriveName: string): Promise<DrivePrincipalRef[]> {
    const driveId = await this.resolveDriveIdByName(sharedDriveName);
    return this.listPermissions(driveId);
  }

  async getRestrictedFolderAccess(folderPath: string): Promise<RestrictedFolderAccessSnapshot> {
    const folderId = await this.resolveFolderIdByPath(folderPath);
    const [file, principals] = await Promise.all([
      this.client.files.get({
        fileId: folderId,
        supportsAllDrives: true,
        fields: "id,name,inheritedPermissionsDisabled"
      }),
      this.listPermissions(folderId)
    ]);

    const inheritedPermissionsDisabled = (
      file.data as typeof file.data & { inheritedPermissionsDisabled?: boolean | null }
    ).inheritedPermissionsDisabled;

    return {
      path: folderPath,
      limitedAccess: Boolean(inheritedPermissionsDisabled),
      principals
    };
  }

  private async ensurePermission(fileId: string, type: "group" | "user", emailAddress: string, role: string) {
    const permissions = await this.listPermissions(fileId);
    const existing = permissions.find(
      (permission) => permission.type === type && permission.emailAddress === emailAddress
    );

    if (!existing) {
      await this.client.permissions.create({
        fileId,
        supportsAllDrives: true,
        sendNotificationEmail: false,
        requestBody: {
          type,
          role,
          emailAddress
        }
      });
      return;
    }

    if (existing.role === role) {
      return;
    }

    await this.client.permissions.update({
      fileId,
      permissionId: existing.id,
      supportsAllDrives: true,
      requestBody: { role }
    });
  }

  private async listPermissions(fileId: string): Promise<DrivePrincipalRef[]> {
    const permissions = await this.client.permissions.list({
      fileId,
      supportsAllDrives: true,
      fields:
        "permissions(id,emailAddress,displayName,type,role,permissionDetails)"
    });

    return (permissions.data.permissions ?? []).map((permission) => ({
      id: permission.id ?? "",
      type: permission.type ?? "",
      role: permission.role ?? "",
      emailAddress: permission.emailAddress ?? null,
      displayName: permission.displayName ?? null,
      inherited: (permission.permissionDetails ?? []).every((detail) => detail.inherited === true)
    }));
  }

  private async resolveFolderIdByPath(path: string) {
    const segments = path
      .split(" / ")
      .map((segment) => segment.trim())
      .filter(Boolean);

    if (segments.length < 2) {
      throw new Error(`Restricted folder path is invalid: ${path}`);
    }

    const [sharedDriveName, ...folderSegments] = segments;
    const driveId = await this.resolveDriveIdByName(sharedDriveName);

    let parentId = driveId;

    for (let index = 0; index < folderSegments.length; index += 1) {
      const segment = folderSegments[index];
      const folderId = await this.findFolderIdInDrive(driveId, parentId, segment, index === 0);

      if (!folderId) {
        throw new Error(`Google Drive folder not found for restricted path: ${path}`);
      }

      parentId = folderId;
    }

    return parentId;
  }

  private async resolveDriveIdByName(sharedDriveName: string) {
    const response = await this.client.drives.list({
      q: `name = '${escapeDriveQueryValue(sharedDriveName)}'`,
      useDomainAdminAccess: true,
      pageSize: 10
    });

    const drive = (response.data.drives ?? []).find((candidate) => candidate.name === sharedDriveName);

    if (!drive?.id) {
      throw new Error(`Shared Drive not found in Google Drive: ${sharedDriveName}`);
    }

    return drive.id;
  }

  private async findFolderIdInDrive(
    driveId: string,
    parentId: string,
    folderName: string,
    allowTopLevelFallback: boolean
  ) {
    const exactMatch = await this.client.files.list({
      corpora: "drive",
      driveId,
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
      pageSize: 10,
      q: [
        `name = '${escapeDriveQueryValue(folderName)}'`,
        "mimeType = 'application/vnd.google-apps.folder'",
        `'${parentId}' in parents`,
        "trashed = false"
      ].join(" and "),
      fields: "files(id,name)"
    });

    const exactFolder = exactMatch.data.files?.[0];
    if (exactFolder?.id) {
      return exactFolder.id;
    }

    if (!allowTopLevelFallback) {
      return null;
    }

    const fallback = await this.client.files.list({
      corpora: "drive",
      driveId,
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
      pageSize: 10,
      q: [
        `name = '${escapeDriveQueryValue(folderName)}'`,
        "mimeType = 'application/vnd.google-apps.folder'",
        "trashed = false"
      ].join(" and "),
      fields: "files(id,name,parents)"
    });

    return fallback.data.files?.[0]?.id ?? null;
  }
}

function escapeDriveQueryValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}
