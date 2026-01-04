import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const group = await prisma.group.findFirst({
    where: { name: 'Familia' },
    include: {
      members: {
        where: { locationSharingEnabled: true },
        include: {
          user: {
            include: {
              phoneDevice: {
                include: {
                  positions: {
                    take: 1,
                    orderBy: { timestamp: 'desc' }
                  }
                }
              }
            }
          }
        }
      }
    }
  });

  console.log('Group:', group?.name);
  console.log('\nMembers with locationSharingEnabled=true:');

  for (const member of group?.members || []) {
    console.log('\n---', member.user.name, '---');
    console.log('PhoneDevice exists:', !!member.user.phoneDevice);
    if (member.user.phoneDevice) {
      console.log('PhoneDevice isActive:', member.user.phoneDevice.isActive);
      console.log('Positions found:', member.user.phoneDevice.positions.length);
      if (member.user.phoneDevice.positions.length > 0) {
        const pos = member.user.phoneDevice.positions[0];
        console.log('Position lat:', pos.latitude, 'lon:', pos.longitude);
      }
    }
  }

  await prisma.$disconnect();
}
check();
