-- Add groupId column to Conversation
ALTER TABLE "Conversation" ADD COLUMN "groupId" TEXT;

-- Add isGroupChat column if not exists
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "isGroupChat" BOOLEAN NOT NULL DEFAULT false;

-- Add unique constraint on groupId
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_groupId_key" UNIQUE ("groupId");

-- Add index on groupId
CREATE INDEX "Conversation_groupId_idx" ON "Conversation"("groupId");

-- Add foreign key constraint
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
