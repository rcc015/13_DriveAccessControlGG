import type { GeneratedFileRef } from "@/types/domain";

export interface DirectoryUser {
  id: string;
  primaryEmail: string;
  name?: {
    fullName?: string | null;
  };
}

export interface DirectoryMember {
  id: string;
  email: string;
  role: string;
}

export interface DirectoryProvider {
  searchUsers(query: string): Promise<DirectoryUser[]>;
  listGroupMembers(groupKey: string): Promise<DirectoryMember[]>;
  addGroupMember(groupKey: string, email: string): Promise<void>;
  removeGroupMember(groupKey: string, memberKey: string): Promise<void>;
}

export interface DriveFolderRef {
  id?: string | null;
  name?: string | null;
}

export interface DriveProvider {
  uploadReport(name: string, mimeType: string, content: Buffer): Promise<GeneratedFileRef>;
  createFolder(parentId: string, name: string): Promise<DriveFolderRef>;
  ensureFolderGroupAccess(folderPath: string, groupEmail: string, role: string): Promise<void>;
  ensureFolderUserAccess(folderPath: string, userEmail: string, role: string): Promise<void>;
}
