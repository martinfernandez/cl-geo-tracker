import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'martin.fernandez47@gmail.com';
  const password = 'Test1234!'; // Change this to your desired password
  const name = 'Martin Fernandez';

  console.log(`Creating user: ${email}`);

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      areaOfInterestLatitude: -34.6037,
      areaOfInterestLongitude: -58.3816,
      areaOfInterestRadius: 5000,
    },
  });

  console.log(`User created successfully!`);
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
  console.log(`ID: ${user.id}`);
}

main()
  .catch((e) => {
    console.error('Error creating user:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
