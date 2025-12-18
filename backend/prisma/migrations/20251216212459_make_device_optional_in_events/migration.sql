-- DropForeignKey
ALTER TABLE "Event" DROP CONSTRAINT "Event_deviceId_fkey";

-- AlterTable
ALTER TABLE "Event" ALTER COLUMN "deviceId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;
