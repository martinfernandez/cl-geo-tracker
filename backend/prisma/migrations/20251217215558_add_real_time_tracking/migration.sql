-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "realTimeTracking" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Event_realTimeTracking_status_idx" ON "Event"("realTimeTracking", "status");
