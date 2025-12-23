-- Add missing columns to Device and Notification tables

-- Add color column to Device
ALTER TABLE "Device" ADD COLUMN IF NOT EXISTS "color" TEXT DEFAULT '#007AFF';

-- Add chatId column to Notification for found object chats
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "chatId" TEXT;
