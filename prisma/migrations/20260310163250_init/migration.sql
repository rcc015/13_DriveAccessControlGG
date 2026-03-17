-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "AppRoleName" AS ENUM ('SUPER_ADMIN', 'ACCESS_ADMIN', 'REVIEWER', 'READ_ONLY_AUDITOR');

-- CreateEnum
CREATE TYPE "AccessRequestStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('GROUP_MEMBERSHIP_SNAPSHOT', 'QUARTERLY_ACCESS_REVIEW', 'RESTRICTED_ACCESS_EXCEPTIONS', 'PERMISSION_MATRIX', 'ACCESS_CHANGE_LOG');

-- CreateEnum
CREATE TYPE "MembershipSource" AS ENUM ('APP_MANAGED', 'IMPORTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" "AppRoleName" NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT NOT NULL,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SharedDrive" (
    "id" TEXT NOT NULL,
    "googleDriveId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SharedDrive_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupMapping" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "sharedDriveId" TEXT NOT NULL,
    "restrictedFolderId" TEXT,
    "groupEmail" TEXT NOT NULL,
    "accessLevel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupMembership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "groupMappingId" TEXT NOT NULL,
    "source" "MembershipSource" NOT NULL DEFAULT 'APP_MANAGED',
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,

    CONSTRAINT "GroupMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestrictedFolder" (
    "id" TEXT NOT NULL,
    "sharedDriveId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "parentPath" TEXT,
    "isRestricted" BOOLEAN NOT NULL DEFAULT true,
    "googleFolderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RestrictedFolder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "restrictedFolderId" TEXT,
    "requestedByEmail" TEXT NOT NULL,
    "approverEmail" TEXT,
    "approvalReference" TEXT,
    "justification" TEXT NOT NULL,
    "status" "AccessRequestStatus" NOT NULL DEFAULT 'REQUESTED',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccessRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "happenedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorEmail" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "targetUserEmail" TEXT,
    "targetGroupEmail" TEXT,
    "targetDriveName" TEXT,
    "targetFolderPath" TEXT,
    "approvalReference" TEXT,
    "result" TEXT NOT NULL,
    "notes" TEXT,
    "metadataJson" JSONB,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessReview" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quarterLabel" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "reviewerEmail" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',

    CONSTRAINT "AccessReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessReviewItem" (
    "id" TEXT NOT NULL,
    "accessReviewId" TEXT NOT NULL,
    "groupMappingId" TEXT,
    "groupEmail" TEXT,
    "memberName" TEXT,
    "memberEmail" TEXT NOT NULL,
    "roleLabel" TEXT,
    "accessJustified" BOOLEAN,
    "actionRequired" TEXT,
    "decision" TEXT,
    "decisionNotes" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedByEmail" TEXT,

    CONSTRAINT "AccessReviewItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedReport" (
    "id" TEXT NOT NULL,
    "reportType" "ReportType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedByEmail" TEXT NOT NULL,
    "googleDriveFileId" TEXT NOT NULL,
    "googleDriveUrl" TEXT NOT NULL,

    CONSTRAINT "GeneratedReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FolderOwnership" (
    "id" TEXT NOT NULL,
    "sharedDriveId" TEXT NOT NULL,
    "topFolder" TEXT NOT NULL,
    "functionalOwner" TEXT NOT NULL,
    "technicalOwner" TEXT NOT NULL,
    "responsibleGroupEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FolderOwnership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_userId_roleId_key" ON "UserRole"("userId", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "SharedDrive_googleDriveId_key" ON "SharedDrive"("googleDriveId");

-- CreateIndex
CREATE UNIQUE INDEX "SharedDrive_name_key" ON "SharedDrive"("name");

-- CreateIndex
CREATE INDEX "GroupMapping_groupEmail_idx" ON "GroupMapping"("groupEmail");

-- CreateIndex
CREATE UNIQUE INDEX "GroupMapping_roleId_sharedDriveId_restrictedFolderId_groupE_key" ON "GroupMapping"("roleId", "sharedDriveId", "restrictedFolderId", "groupEmail");

-- CreateIndex
CREATE UNIQUE INDEX "GroupMembership_userId_groupMappingId_key" ON "GroupMembership"("userId", "groupMappingId");

-- CreateIndex
CREATE UNIQUE INDEX "RestrictedFolder_path_key" ON "RestrictedFolder"("path");

-- CreateIndex
CREATE UNIQUE INDEX "RestrictedFolder_googleFolderId_key" ON "RestrictedFolder"("googleFolderId");

-- CreateIndex
CREATE UNIQUE INDEX "GeneratedReport_googleDriveFileId_key" ON "GeneratedReport"("googleDriveFileId");

-- CreateIndex
CREATE UNIQUE INDEX "FolderOwnership_sharedDriveId_topFolder_key" ON "FolderOwnership"("sharedDriveId", "topFolder");

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMapping" ADD CONSTRAINT "GroupMapping_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMapping" ADD CONSTRAINT "GroupMapping_sharedDriveId_fkey" FOREIGN KEY ("sharedDriveId") REFERENCES "SharedDrive"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMapping" ADD CONSTRAINT "GroupMapping_restrictedFolderId_fkey" FOREIGN KEY ("restrictedFolderId") REFERENCES "RestrictedFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMembership" ADD CONSTRAINT "GroupMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMembership" ADD CONSTRAINT "GroupMembership_groupMappingId_fkey" FOREIGN KEY ("groupMappingId") REFERENCES "GroupMapping"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestrictedFolder" ADD CONSTRAINT "RestrictedFolder_sharedDriveId_fkey" FOREIGN KEY ("sharedDriveId") REFERENCES "SharedDrive"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessRequest" ADD CONSTRAINT "AccessRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessRequest" ADD CONSTRAINT "AccessRequest_restrictedFolderId_fkey" FOREIGN KEY ("restrictedFolderId") REFERENCES "RestrictedFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessReviewItem" ADD CONSTRAINT "AccessReviewItem_accessReviewId_fkey" FOREIGN KEY ("accessReviewId") REFERENCES "AccessReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FolderOwnership" ADD CONSTRAINT "FolderOwnership_sharedDriveId_fkey" FOREIGN KEY ("sharedDriveId") REFERENCES "SharedDrive"("id") ON DELETE CASCADE ON UPDATE CASCADE;

