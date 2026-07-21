import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('Starting database seed...');

  const adminPassword = await bcrypt.hash('Admin@123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@clearspot.com' },
    update: {},
    create: {
      email: 'admin@clearspot.com',
      passwordHash: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: Role.ADMIN,
      isActive: true,
    },
  });

  console.log('Created admin user:', admin.email);

  const officerPassword = await bcrypt.hash('Officer@123', 10);

  const officer = await prisma.user.upsert({
    where: { email: 'officer@clearspot.com' },
    update: {},
    create: {
      email: 'officer@clearspot.com',
      passwordHash: officerPassword,
      firstName: 'Environmental',
      lastName: 'Officer',
      role: Role.OFFICER,
      isActive: true,
    },
  });

  console.log('Created officer user:', officer.email);

  console.log('Seed completed successfully!');
}

main()
  .catch((error) => {
    console.error('Error during seeding:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
