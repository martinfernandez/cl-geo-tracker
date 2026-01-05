-- Make eventId nullable to support group chats that don't have an event
ALTER TABLE "Conversation" ALTER COLUMN "eventId" DROP NOT NULL;
