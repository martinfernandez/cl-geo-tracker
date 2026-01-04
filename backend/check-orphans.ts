import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkOrphans() {
  const participants = await prisma.conversationParticipant.findMany({
    include: {
      conversation: true,
      user: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });

  console.log(`Found ${participants.length} conversation participants`);
  participants.forEach(p => {
    console.log(`  - User: ${p.user.name} (${p.userId}), ConversationID: ${p.conversationId}, Has conversation: ${!!p.conversation}`);
  });

  const conversations = await prisma.conversation.findMany();
  console.log(`\nFound ${conversations.length} conversations`);
  conversations.forEach(c => {
    console.log(`  - ID: ${c.id}, EventID: ${c.eventId}`);
  });

  await prisma.$disconnect();
}

checkOrphans().catch(console.error);
