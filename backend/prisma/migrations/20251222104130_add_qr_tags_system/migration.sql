-- CreateEnum
CREATE TYPE "DeviceType" AS ENUM ('GPS_TRACKER', 'TAGGED_OBJECT');

-- CreateEnum
CREATE TYPE "FoundChatStatus" AS ENUM ('ACTIVE', 'RESOLVED', 'CLOSED');

-- AlterTable: Add new columns to Device
ALTER TABLE "Device" ADD COLUMN "type" "DeviceType" NOT NULL DEFAULT 'GPS_TRACKER';
ALTER TABLE "Device" ADD COLUMN "qrCode" TEXT;
ALTER TABLE "Device" ADD COLUMN "qrEnabled" BOOLEAN NOT NULL DEFAULT true;

-- Make imei optional (already nullable in some cases, but ensure it)
ALTER TABLE "Device" ALTER COLUMN "imei" DROP NOT NULL;

-- Generate unique qrCode for existing devices
UPDATE "Device" SET "qrCode" = gen_random_uuid()::text WHERE "qrCode" IS NULL;

-- Make qrCode NOT NULL after populating
ALTER TABLE "Device" ALTER COLUMN "qrCode" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Device_qrCode_key" ON "Device"("qrCode");

-- CreateIndex
CREATE INDEX "Device_qrCode_idx" ON "Device"("qrCode");

-- CreateIndex
CREATE INDEX "Device_type_idx" ON "Device"("type");

-- CreateTable
CREATE TABLE "FoundObjectChat" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "finderId" TEXT,
    "finderSessionId" TEXT,
    "finderName" TEXT,
    "status" "FoundChatStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FoundObjectChat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FoundObjectMessage" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "isOwner" BOOLEAN NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FoundObjectMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FoundObjectChat_deviceId_idx" ON "FoundObjectChat"("deviceId");

-- CreateIndex
CREATE INDEX "FoundObjectChat_ownerId_idx" ON "FoundObjectChat"("ownerId");

-- CreateIndex
CREATE INDEX "FoundObjectChat_finderId_idx" ON "FoundObjectChat"("finderId");

-- CreateIndex
CREATE INDEX "FoundObjectChat_finderSessionId_idx" ON "FoundObjectChat"("finderSessionId");

-- CreateIndex
CREATE INDEX "FoundObjectChat_status_idx" ON "FoundObjectChat"("status");

-- CreateIndex
CREATE INDEX "FoundObjectMessage_chatId_idx" ON "FoundObjectMessage"("chatId");

-- CreateIndex
CREATE INDEX "FoundObjectMessage_createdAt_idx" ON "FoundObjectMessage"("createdAt");

-- AddForeignKey
ALTER TABLE "FoundObjectChat" ADD CONSTRAINT "FoundObjectChat_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoundObjectChat" ADD CONSTRAINT "FoundObjectChat_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoundObjectChat" ADD CONSTRAINT "FoundObjectChat_finderId_fkey" FOREIGN KEY ("finderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoundObjectMessage" ADD CONSTRAINT "FoundObjectMessage_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "FoundObjectChat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
