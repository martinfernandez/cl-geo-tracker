-- AlterTable
ALTER TABLE "Device" ADD COLUMN     "activeInterval" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "currentInterval" INTEGER,
ADD COLUMN     "idleInterval" INTEGER NOT NULL DEFAULT 600;
