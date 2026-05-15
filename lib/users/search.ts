import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getManagedDirectoryStatus } from "@/lib/users/directory-status";
import type { UserSearchResponse, UserSuggestion } from "@/lib/users/types";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 20;

function getSuggestionScore(
  user: Pick<UserSuggestion, "email" | "displayName" | "givenName" | "familyName" | "aliases" | "status">,
  query: string
) {
  const normalizedQuery = query.trim().toLowerCase();
  const email = user.email.toLowerCase();
  const displayName = user.displayName.toLowerCase();
  const givenName = user.givenName?.toLowerCase() ?? "";
  const familyName = user.familyName?.toLowerCase() ?? "";
  const aliases = (user.aliases ?? []).map((alias) => alias.toLowerCase());

  let score = 0;

  if (email === normalizedQuery) {
    score += 100;
  } else if (email.startsWith(normalizedQuery)) {
    score += 60;
  } else if (email.includes(normalizedQuery)) {
    score += 35;
  }

  if (displayName === normalizedQuery) {
    score += 90;
  } else if (displayName.startsWith(normalizedQuery)) {
    score += 55;
  } else if (displayName.includes(normalizedQuery)) {
    score += 30;
  }

  if (givenName.startsWith(normalizedQuery)) {
    score += 25;
  } else if (givenName.includes(normalizedQuery)) {
    score += 10;
  }

  if (familyName.startsWith(normalizedQuery)) {
    score += 20;
  } else if (familyName.includes(normalizedQuery)) {
    score += 10;
  }

  if (aliases.some((alias) => alias === normalizedQuery)) {
    score += 25;
  } else if (aliases.some((alias) => alias.startsWith(normalizedQuery))) {
    score += 15;
  } else if (aliases.some((alias) => alias.includes(normalizedQuery))) {
    score += 10;
  }

  if (user.status === "active") {
    score += 10;
  }

  return score;
}

export function mapUserRecordToSuggestion(user: {
  id: string;
  email: string;
  displayName: string;
  givenName: string | null;
  familyName: string | null;
  directoryStatus: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  directorySource: "GOOGLE_GROUP" | "GOOGLE_DIRECTORY" | "MANUAL";
  department: string | null;
  title: string | null;
  orgUnitPath: string | null;
  aliases: string[];
  lastSyncedAt: Date | null;
}): UserSuggestion {
  return {
    id: user.id,
    email: user.email.toLowerCase(),
    displayName: user.displayName,
    givenName: user.givenName,
    familyName: user.familyName,
    status:
      user.directoryStatus === "ACTIVE"
        ? "active"
        : user.directoryStatus === "SUSPENDED"
          ? "suspended"
          : "inactive",
    department: user.department,
    title: user.title,
    orgUnitPath: user.orgUnitPath,
    aliases: user.aliases.map((alias) => alias.trim().toLowerCase()),
    source: user.directorySource.toLowerCase() as UserSuggestion["source"],
    lastSyncedAt: user.lastSyncedAt?.toISOString() ?? null
  };
}

export function rankUserSuggestions(
  suggestions: UserSuggestion[],
  query: string,
  {
    excludeEmails = [],
    includeInactive = false,
    limit = DEFAULT_LIMIT
  }: {
    excludeEmails?: string[];
    includeInactive?: boolean;
    limit?: number;
  } = {}
) {
  const normalizedExcludedEmails = new Set(excludeEmails.map((email) => email.trim().toLowerCase()).filter(Boolean));
  const cappedLimit = Math.min(Math.max(limit, 1), MAX_LIMIT);

  return suggestions
    .filter((suggestion) => (includeInactive ? true : suggestion.status === "active"))
    .filter((suggestion) => !normalizedExcludedEmails.has(suggestion.email))
    .map((suggestion) => ({
      suggestion,
      score: getSuggestionScore(suggestion, query)
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.suggestion.email.localeCompare(right.suggestion.email);
    })
    .slice(0, cappedLimit)
    .map((entry) => entry.suggestion);
}

export async function searchManagedUsers(
  query: string,
  {
    excludeEmails = [],
    includeInactive = false,
    limit = DEFAULT_LIMIT
  }: {
    excludeEmails?: string[];
    includeInactive?: boolean;
    limit?: number;
  } = {}
) {
  const normalizedQuery = query.trim().toLowerCase();

  if (normalizedQuery.length === 0) {
    return [];
  }

  const where: Prisma.UserWhereInput = {
    OR: [
      {
        email: {
          contains: normalizedQuery,
          mode: "insensitive"
        }
      },
      {
        displayName: {
          contains: normalizedQuery,
          mode: "insensitive"
        }
      },
      {
        givenName: {
          contains: normalizedQuery,
          mode: "insensitive"
        }
      },
      {
        familyName: {
          contains: normalizedQuery,
          mode: "insensitive"
        }
      },
      {
        aliases: {
          hasSome: [normalizedQuery]
        }
      }
    ]
  };

  if (!includeInactive) {
    where.directoryStatus = "ACTIVE";
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      email: true,
      displayName: true,
      givenName: true,
      familyName: true,
      directoryStatus: true,
      directorySource: true,
      department: true,
      title: true,
      orgUnitPath: true,
      aliases: true,
      lastSyncedAt: true
    },
    take: Math.max(limit * 3, 20),
    orderBy: [{ displayName: "asc" }, { email: "asc" }]
  });

  return rankUserSuggestions(
    users.map(mapUserRecordToSuggestion),
    normalizedQuery,
    {
      excludeEmails,
      includeInactive,
      limit
    }
  );
}

export async function searchManagedUsersWithStatus(
  query: string,
  {
    excludeEmails = [],
    includeInactive = false,
    limit = DEFAULT_LIMIT
  }: {
    excludeEmails?: string[];
    includeInactive?: boolean;
    limit?: number;
  } = {}
): Promise<UserSearchResponse> {
  const status = await getManagedDirectoryStatus();
  const results = await searchManagedUsers(query, {
    excludeEmails,
    includeInactive,
    limit
  });

  const emptyState =
    results.length > 0
      ? "none"
      : status.lastSyncStatus === "failed"
        ? "sync_error"
        : status.activeUsersCount === 0
          ? "sync_empty"
          : "no_match";

  return {
    results,
    meta: {
      source: "local",
      usedLiveDirectoryFallback: false,
      emptyState,
      ...status
    }
  };
}
