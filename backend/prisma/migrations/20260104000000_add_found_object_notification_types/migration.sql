-- Add new values to NotificationType enum for found object chat notifications
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'FOUND_OBJECT';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'FOUND_OBJECT_MESSAGE';
