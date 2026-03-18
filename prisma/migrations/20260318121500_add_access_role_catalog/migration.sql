-- CreateEnum
CREATE TYPE "AccessRoleRestrictedMode" AS ENUM ('NONE', 'STANDARD', 'EXCEPTION_FIRST', 'POLICY_REVIEW');

-- CreateTable
CREATE TABLE "AccessRole" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "restrictedAccessMode" "AccessRoleRestrictedMode" NOT NULL DEFAULT 'NONE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccessRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAccessRole" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessRoleId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT NOT NULL,

    CONSTRAINT "UserAccessRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessRoleMapping" (
    "id" TEXT NOT NULL,
    "accessRoleId" TEXT NOT NULL,
    "sharedDriveId" TEXT NOT NULL,
    "restrictedFolderId" TEXT,
    "groupEmail" TEXT NOT NULL,
    "accessLevel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccessRoleMapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AccessRole_code_key" ON "AccessRole"("code");

-- CreateIndex
CREATE UNIQUE INDEX "AccessRole_displayName_key" ON "AccessRole"("displayName");

-- CreateIndex
CREATE UNIQUE INDEX "UserAccessRole_userId_accessRoleId_key" ON "UserAccessRole"("userId", "accessRoleId");

-- CreateIndex
CREATE INDEX "AccessRoleMapping_groupEmail_idx" ON "AccessRoleMapping"("groupEmail");

-- CreateIndex
CREATE UNIQUE INDEX "AccessRoleMapping_accessRoleId_sharedDriveId_restrictedFolderI_key" ON "AccessRoleMapping"("accessRoleId", "sharedDriveId", "restrictedFolderId", "groupEmail");

-- AddForeignKey
ALTER TABLE "UserAccessRole" ADD CONSTRAINT "UserAccessRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAccessRole" ADD CONSTRAINT "UserAccessRole_accessRoleId_fkey" FOREIGN KEY ("accessRoleId") REFERENCES "AccessRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessRoleMapping" ADD CONSTRAINT "AccessRoleMapping_accessRoleId_fkey" FOREIGN KEY ("accessRoleId") REFERENCES "AccessRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessRoleMapping" ADD CONSTRAINT "AccessRoleMapping_sharedDriveId_fkey" FOREIGN KEY ("sharedDriveId") REFERENCES "SharedDrive"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessRoleMapping" ADD CONSTRAINT "AccessRoleMapping_restrictedFolderId_fkey" FOREIGN KEY ("restrictedFolderId") REFERENCES "RestrictedFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
