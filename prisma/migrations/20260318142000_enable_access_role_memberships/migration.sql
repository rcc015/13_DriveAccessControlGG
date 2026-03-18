-- AlterTable
ALTER TABLE "GroupMembership" ALTER COLUMN "groupMappingId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "GroupMembership" ADD COLUMN "accessRoleMappingId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "GroupMembership_userId_accessRoleMappingId_key" ON "GroupMembership"("userId", "accessRoleMappingId");

-- AddForeignKey
ALTER TABLE "GroupMembership" ADD CONSTRAINT "GroupMembership_accessRoleMappingId_fkey" FOREIGN KEY ("accessRoleMappingId") REFERENCES "AccessRoleMapping"("id") ON DELETE CASCADE ON UPDATE CASCADE;
