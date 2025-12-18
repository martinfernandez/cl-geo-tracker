-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "isUrgent" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Event_isUrgent_status_idx" ON "Event"("isUrgent", "status");
