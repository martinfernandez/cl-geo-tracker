-- AlterTable
ALTER TABLE "Notification" ADD COLUMN "deviceId" TEXT;

-- CreateIndex
CREATE INDEX "Notification_deviceId_idx" ON "Notification"("deviceId");
