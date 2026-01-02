-- AlterTable
ALTER TABLE "Event" ADD COLUMN "phoneDeviceId" TEXT;

-- CreateIndex
CREATE INDEX "Event_phoneDeviceId_idx" ON "Event"("phoneDeviceId");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_phoneDeviceId_fkey" FOREIGN KEY ("phoneDeviceId") REFERENCES "PhoneDevice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
