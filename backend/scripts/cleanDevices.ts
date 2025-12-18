import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanDevices() {
  console.log('Cleaning incorrect devices...');

  // Get all devices
  const devices = await prisma.device.findMany();

  console.log('Current devices:');
  devices.forEach((device) => {
    console.log(`- ${device.name} (IMEI: ${device.imei})`);
  });

  // Delete devices that were auto-created with wrong IMEI
  // Keep only devices with IMEI that look valid (15 digits starting with 864943)
  const toDelete = devices.filter(
    (d) => !d.imei.startsWith('864943') || d.imei.length !== 15
  );

  if (toDelete.length > 0) {
    console.log(`\nDeleting ${toDelete.length} incorrect devices...`);

    for (const device of toDelete) {
      // Delete positions first
      await prisma.position.deleteMany({
        where: { deviceId: device.id },
      });

      // Then delete device
      await prisma.device.delete({
        where: { id: device.id },
      });

      console.log(`Deleted device: ${device.name} (${device.imei})`);
    }
  }

  const remaining = await prisma.device.findMany();
  console.log(`\n✅ Cleanup complete. Remaining devices: ${remaining.length}`);
  remaining.forEach((device) => {
    console.log(`- ${device.name} (IMEI: ${device.imei})`);
  });

  await prisma.$disconnect();
}

cleanDevices().catch((error) => {
  console.error('Error cleaning devices:', error);
  process.exit(1);
});
