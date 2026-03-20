import type { DirectoryMember, DirectoryProvider, DirectoryUser } from "@/lib/google/types";

const MOCK_USERS: DirectoryUser[] = [
  {
    id: "usr_ana",
    primaryEmail: "ana@company.com",
    name: { fullName: "Ana Quality" }
  },
  {
    id: "usr_miguel",
    primaryEmail: "miguel@company.com",
    name: { fullName: "Miguel Operations" }
  },
  {
    id: "usr_lucia",
    primaryEmail: "lucia@company.com",
    name: { fullName: "Lucia Auditor" }
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
