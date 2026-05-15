import { prisma } from "@/lib/db/prisma";

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

interface ManagedUserLookupResult {
  id: string;
  email: string;
  displayName: string;
  isActive: boolean;
}

interface ManagedUserLookup {
  findById(id: string): Promise<ManagedUserLookupResult | null>;
  findByEmail(email: string): Promise<ManagedUserLookupResult | null>;
}

const defaultUserLookup: ManagedUserLookup = {
  async findById(id) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        displayName: true,
        isActive: true
      }
    });
  },
  async findByEmail(email) {
    return prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        displayName: true,
        isActive: true
      }
    });
  }
};

export async function resolveManagedUserSelection(
  formData: FormData,
  {
    emailField,
    displayNameField,
    selectionIdField,
    allowManualEntry = true,
    requireActive = true,
    userLookup = defaultUserLookup
  }: {
    emailField: string;
    displayNameField?: string;
    selectionIdField?: string;
    allowManualEntry?: boolean;
    requireActive?: boolean;
    userLookup?: ManagedUserLookup;
  }
) {
  const email = normalizeEmail(String(formData.get(emailField) ?? ""));
  const displayName = String(displayNameField ? formData.get(displayNameField) ?? "" : "").trim();
  const selectedUserId = String(selectionIdField ? formData.get(selectionIdField) ?? "" : "").trim();

  if (!email) {
    throw new Error("User email is required.");
  }

  if (!isValidEmail(email)) {
    throw new Error("Select a valid directory user or enter a valid email address.");
  }

  if (selectedUserId) {
    const selectedUser = await userLookup.findById(selectedUserId);

    if (!selectedUser) {
      throw new Error("The selected user could not be found.");
    }

    if (normalizeEmail(selectedUser.email) !== email) {
      throw new Error("The selected user does not match the submitted email.");
    }

    if (requireActive && !selectedUser.isActive) {
      throw new Error("The selected user is inactive and cannot be used in this workflow.");
    }

    return {
      id: selectedUser.id,
      email,
      displayName: selectedUser.displayName,
      isManaged: true
    };
  }

  const managedUser = await userLookup.findByEmail(email);

  if (managedUser) {
    if (requireActive && !managedUser.isActive) {
      throw new Error("The selected user is inactive and cannot be used in this workflow.");
    }

    return {
      id: managedUser.id,
      email,
      displayName: managedUser.displayName,
      isManaged: true
    };
  }

  if (!allowManualEntry) {
    throw new Error("A valid managed user selection is required.");
  }

  return {
    id: null,
    email,
    displayName: displayName || email.split("@")[0],
    isManaged: false
  };
}
