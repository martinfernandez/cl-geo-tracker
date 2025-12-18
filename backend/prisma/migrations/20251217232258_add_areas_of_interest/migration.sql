-- CreateEnum
CREATE TYPE "AreaVisibility" AS ENUM ('PUBLIC', 'PRIVATE_SHAREABLE', 'PRIVATE');

-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "InvitationType" AS ENUM ('INVITATION', 'JOIN_REQUEST');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'AREA_INVITATION';
ALTER TYPE "NotificationType" ADD VALUE 'AREA_JOIN_REQUEST';
ALTER TYPE "NotificationType" ADD VALUE 'AREA_EVENT_NOTIFICATION';

-- CreateTable
CREATE TABLE "AreaOfInterest" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "radius" DOUBLE PRECISION NOT NULL,
    "visibility" "AreaVisibility" NOT NULL DEFAULT 'PUBLIC',
    "creatorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AreaOfInterest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AreaMembership" (
    "id" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "MemberRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AreaMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AreaInvitation" (
    "id" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "senderId" TEXT,
    "receiverId" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "type" "InvitationType" NOT NULL DEFAULT 'INVITATION',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AreaInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AreaOfInterest_creatorId_idx" ON "AreaOfInterest"("creatorId");

-- CreateIndex
CREATE INDEX "AreaOfInterest_visibility_idx" ON "AreaOfInterest"("visibility");

-- CreateIndex
CREATE INDEX "AreaOfInterest_name_idx" ON "AreaOfInterest"("name");

-- CreateIndex
CREATE INDEX "AreaOfInterest_latitude_longitude_idx" ON "AreaOfInterest"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "AreaMembership_areaId_idx" ON "AreaMembership"("areaId");

-- CreateIndex
CREATE INDEX "AreaMembership_userId_idx" ON "AreaMembership"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AreaMembership_areaId_userId_key" ON "AreaMembership"("areaId", "userId");

-- CreateIndex
CREATE INDEX "AreaInvitation_areaId_idx" ON "AreaInvitation"("areaId");

-- CreateIndex
CREATE INDEX "AreaInvitation_receiverId_status_idx" ON "AreaInvitation"("receiverId", "status");

-- CreateIndex
CREATE INDEX "AreaInvitation_senderId_idx" ON "AreaInvitation"("senderId");

-- CreateIndex
CREATE UNIQUE INDEX "AreaInvitation_areaId_receiverId_status_key" ON "AreaInvitation"("areaId", "receiverId", "status");

-- AddForeignKey
ALTER TABLE "AreaOfInterest" ADD CONSTRAINT "AreaOfInterest_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AreaMembership" ADD CONSTRAINT "AreaMembership_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "AreaOfInterest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AreaMembership" ADD CONSTRAINT "AreaMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AreaInvitation" ADD CONSTRAINT "AreaInvitation_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "AreaOfInterest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AreaInvitation" ADD CONSTRAINT "AreaInvitation_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AreaInvitation" ADD CONSTRAINT "AreaInvitation_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
