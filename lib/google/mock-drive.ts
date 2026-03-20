import type { GeneratedFileRef } from "@/types/domain";
import type { DriveFolderRef, DriveProvider, DrivePrincipalRef, RestrictedFolderAccessSnapshot } from "@/lib/google/types";

export class MockDriveProvider implements DriveProvider {
  async uploadReport(name: string, _mimeType: string, _content: Buffer): Promise<GeneratedFileRef> {
    return {
      fileId: `mock-file-${Date.now()}`,
      name,
      webViewLink: `https://mock.drive.local/reports/${encodeURIComponent(name)}`
    };
  }

  async createFolder(parentId: string, name: string): Promise<DriveFolderRef> {
    return {
      id: `mock-folder-${parentId}-${name}`.replace(/\s+/g, "-"),
      name,
      webViewLink: `https://mock.drive.local/folders/${encodeURIComponent(
        `${parentId}-${name}`.replace(/\s+/g, "-")
      )}`
    };
  }

  async resolveFolder(path: string): Promise<DriveFolderRef> {
    return {
      id: `mock-folder-${path}`.replace(/[\/\s]+/g, "-"),
      name: path.split(" / ").at(-1) ?? path,
      webViewLink: `https://mock.drive.local/folders/${encodeURIComponent(path)}`
    };
  }

  async ensureSharedDriveGroupAccess(_sharedDriveName: string, _groupEmail: string, _role: string): Promise<void> {}

  async ensureFolderGroupAccess(_folderPath: string, _groupEmail: string, _role: string): Promise<void> {}

  async ensureFolderUserAccess(_folderPath: string, _userEmail: string, _role: string): Promise<void> {}

  async removeSharedDrivePrincipal(_sharedDriveName: string, _principalEmail: string): Promise<void> {}

  async removeFolderPrincipal(_folderPath: string, _principalEmail: string): Promise<void> {}

  async enableLimitedAccess(_folderPath: string): Promise<void> {}

  async listSharedDrivePrincipals(_sharedDriveName: string): Promise<DrivePrincipalRef[]> {
    return [];
  }

  async getRestrictedFolderAccess(folderPath: string): Promise<RestrictedFolderAccessSnapshot> {
    return {
      path: folderPath,
      limitedAccess: false,
      principals: []
    };
  }
}
