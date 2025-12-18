-- AlterTable
ALTER TABLE "User" ADD COLUMN     "areaOfInterestLatitude" DOUBLE PRECISION,
ADD COLUMN     "areaOfInterestLongitude" DOUBLE PRECISION,
ADD COLUMN     "areaOfInterestRadius" DOUBLE PRECISION DEFAULT 5000;
