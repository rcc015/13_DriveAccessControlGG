-- CreateEnum
CREATE TYPE "DirectoryUserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "DirectoryUserSourceType" AS ENUM ('GOOGLE_GROUP', 'GOOGLE_DIRECTORY', 'MANUAL');

-- CreateEnum
CREATE TYPE "DirectorySyncStatus" AS ENUM ('NEVER', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "DirectorySyncSourceType" AS ENUM ('GOOGLE_GROUP', 'GOOGLE_DIRECTORY', 'LOCAL_MANUAL');

-- AlterTable
ALTER TABLE "User"
ADD COLUMN     "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "department" TEXT,
ADD COLUMN     "directorySource" "DirectoryUserSourceType" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "directoryStatus" "DirectoryUserStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "familyName" TEXT,
ADD COLUMN     "givenName" TEXT,
ADD COLUMN     "googleUserId" TEXT,
ADD COLUMN     "lastSyncedAt" TIMESTAMP(3),
ADD COLUMN     "orgUnitPath" TEXT,
ADD COLUMN     "title" TEXT;

-- CreateTable
CREATE TABLE "DirectorySyncState" (
    "id" TEXT NOT NULL,
    "sourceType" "DirectorySyncSourceType" NOT NULL DEFAULT 'LOCAL_MANUAL',
    "sourceName" TEXT,
    "lastAttemptedSyncAt" TIMESTAMP(3),
    "lastSuccessfulSyncAt" TIMESTAMP(3),
    "lastSyncStatus" "DirectorySyncStatus" NOT NULL DEFAULT 'NEVER',
    "lastSyncError" TEXT,
    "lastFetchedCount" INTEGER NOT NULL DEFAULT 0,
    "lastCreatedCount" INTEGER NOT NULL DEFAULT 0,
    "lastUpdatedCount" INTEGER NOT NULL DEFAULT 0,
    "lastMarkedInactiveCount" INTEGER NOT NULL DEFAULT 0,
    "lastMarkedSuspendedCount" INTEGER NOT NULL DEFAULT 0,
    "lastSkippedCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DirectorySyncState_pkey" PRIMARY KEY ("id")
);

-- Update legacy records so manual-only users stay classified correctly.
UPDATE "User"
SET "directorySource" = 'MANUAL',
    "directoryStatus" = CASE
      WHEN "isActive" THEN 'ACTIVE'::"DirectoryUserStatus"
      ELSE 'INACTIVE'::"DirectoryUserStatus"
    END;

-- CreateIndex
CREATE UNIQUE INDEX "User_googleUserId_key" ON "User"("googleUserId");
