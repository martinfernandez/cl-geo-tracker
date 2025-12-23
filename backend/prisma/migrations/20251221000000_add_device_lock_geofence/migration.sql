-- AlterTable
ALTER TABLE "Device" ADD COLUMN     "isLocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lockLatitude" DOUBLE PRECISION,
ADD COLUMN     "lockLongitude" DOUBLE PRECISION,
ADD COLUMN     "lockRadius" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "lockedAt" TIMESTAMP(3),
ADD COLUMN     "lastAlertAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Device_isLocked_idx" ON "Device"("isLocked");

-- Add DEVICE_MOVEMENT_ALERT to NotificationType enum if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'DEVICE_MOVEMENT_ALERT' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'NotificationType')) THEN
        ALTER TYPE "NotificationType" ADD VALUE 'DEVICE_MOVEMENT_ALERT';
    END IF;
END
$$;
