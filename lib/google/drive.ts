import { PassThrough } from "node:stream";
import { google } from "googleapis";
import { createDelegatedGoogleAuth } from "@/lib/google/auth";
import { env } from "@/lib/config/env";
import type { GeneratedFileRef } from "@/types/domain";
import type { DriveProvider } from "@/lib/google/types";

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
}
