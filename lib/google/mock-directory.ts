import type { DirectoryMember, DirectoryProvider, DirectoryUser } from "@/lib/google/types";

const MOCK_USERS: DirectoryUser[] = [
  {
    id: "usr_ana",
    primaryEmail: "ana@company.com",
    name: { givenName: "Ana", familyName: "Quality", fullName: "Ana Quality" }
  },
  {
    id: "usr_miguel",
    primaryEmail: "miguel@company.com",
    name: { givenName: "Miguel", familyName: "Operations", fullName: "Miguel Operations" }
  },
  {
    id: "usr_lucia",
    primaryEmail: "lucia@company.com",
    name: { givenName: "Lucia", familyName: "Auditor", fullName: "Lucia Auditor" }
  }
];

export class MockDirectoryProvider implements DirectoryProvider {
  async searchUsers(query: string): Promise<DirectoryUser[]> {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return MOCK_USERS;
    }

    return MOCK_USERS.filter((user) => {
      const fullName = user.name?.fullName?.toLowerCase() ?? "";
      return user.primaryEmail.toLowerCase().includes(normalized) || fullName.includes(normalized);
    });
  }

  async listActiveUsers(): Promise<DirectoryUser[]> {
    return MOCK_USERS;
  }

  async getUserByEmail(email: string): Promise<DirectoryUser | null> {
    return MOCK_USERS.find((user) => user.primaryEmail.toLowerCase() === email.trim().toLowerCase()) ?? null;
  }

  async listGroupMembers(groupKey: string): Promise<DirectoryMember[]> {
    return MOCK_USERS.map((user) => ({
      id: `${groupKey}:${user.id}`,
      email: user.primaryEmail,
      role: "MEMBER"
    }));
  }

  async addGroupMember(_groupKey: string, _email: string): Promise<void> {}

  async removeGroupMember(_groupKey: string, _memberKey: string): Promise<void> {}
}
