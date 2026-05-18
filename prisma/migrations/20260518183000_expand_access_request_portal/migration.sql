ALTER TYPE "AccessRequestStatus" ADD VALUE IF NOT EXISTS 'IN_REVIEW';
ALTER TYPE "AccessRequestStatus" ADD VALUE IF NOT EXISTS 'NEEDS_INFO';
ALTER TYPE "AccessRequestStatus" ADD VALUE IF NOT EXISTS 'FULFILLED';
ALTER TYPE "AccessRequestStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

CREATE TYPE "AccessRequestType" AS ENUM ('BUSINESS_ROLE', 'SHARED_DRIVE', 'RESTRICTED_FOLDER', 'OTHER');

ALTER TABLE "AccessRequest"
ADD COLUMN "requestType" "AccessRequestType" NOT NULL DEFAULT 'RESTRICTED_FOLDER',
ADD COLUMN "accessRoleId" TEXT,
ADD COLUMN "sharedDriveId" TEXT,
ADD COLUMN "requesterName" TEXT,
ADD COLUMN "requestedAccessLevel" TEXT,
ADD COLUMN "otherTargetText" TEXT,
ADD COLUMN "neededByDate" TIMESTAMP(3),
ADD COLUMN "reviewerNotes" TEXT,
ADD COLUMN "reviewedAt" TIMESTAMP(3),
ADD COLUMN "fulfilledAt" TIMESTAMP(3);

ALTER TABLE "AccessRequest"
ADD CONSTRAINT "AccessRequest_accessRoleId_fkey" FOREIGN KEY ("accessRoleId") REFERENCES "AccessRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AccessRequest"
ADD CONSTRAINT "AccessRequest_sharedDriveId_fkey" FOREIGN KEY ("sharedDriveId") REFERENCES "SharedDrive"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "AccessRequest_requestedByEmail_idx" ON "AccessRequest"("requestedByEmail");
CREATE INDEX "AccessRequest_status_idx" ON "AccessRequest"("status");
