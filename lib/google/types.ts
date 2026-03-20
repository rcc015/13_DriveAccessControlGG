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

export interface DrivePrincipalRef {
  id: string;
  type: string;
  role: string;
  emailAddress: string | null;
  displayName: string | null;
  inherited: boolean;
}

export interface RestrictedFolderAccessSnapshot {
  path: string;
  limitedAccess: boolean;
  principals: DrivePrincipalRef[];
}

export interface DriveProvider {
  uploadReport(name: string, mimeType: string, content: Buffer): Promise<GeneratedFileRef>;
  createFolder(parentId: string, name: string): Promise<DriveFolderRef>;
  ensureFolderGroupAccess(folderPath: string, groupEmail: string, role: string): Promise<void>;
  ensureFolderUserAccess(folderPath: string, userEmail: string, role: string): Promise<void>;
  listSharedDrivePrincipals(sharedDriveName: string): Promise<DrivePrincipalRef[]>;
  getRestrictedFolderAccess(folderPath: string): Promise<RestrictedFolderAccessSnapshot>;
}
