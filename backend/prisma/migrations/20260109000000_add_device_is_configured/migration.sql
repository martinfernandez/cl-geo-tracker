-- AlterTable
ALTER TABLE "Device" ADD COLUMN "isConfigured" BOOLEAN NOT NULL DEFAULT false;

-- Update existing devices to be configured (they were already working)
UPDATE "Device" SET "isConfigured" = true WHERE "imei" IS NOT NULL;
