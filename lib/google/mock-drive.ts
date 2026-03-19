import type { GeneratedFileRef } from "@/types/domain";
import type { DriveFolderRef, DriveProvider } from "@/lib/google/types";

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
      name
    };
  }

  async ensureFolderGroupAccess(_folderPath: string, _groupEmail: string, _role: string): Promise<void> {}

  async ensureFolderUserAccess(_folderPath: string, _userEmail: string, _role: string): Promise<void> {}
}
