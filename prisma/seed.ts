import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting EduTrack seed...');

  // ── SUPER_ADMIN ────────────────────────────────────────────────────────────
  // Created once. Belongs to Dragks Technologies.
  // Credentials come from environment variables — never hardcoded.
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD;
  const superAdminName = process.env.SUPER_ADMIN_NAME || 'Dragks Technologies';

  if (!superAdminEmail || !superAdminPassword) {
    throw new Error(
      'SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD must be set in .env before seeding',
    );
  }

  const existingSuperAdmin = await prisma.user.findUnique({
    where: { email: superAdminEmail },
  });

  if (existingSuperAdmin) {
    console.log('✅ SUPER_ADMIN already exists — skipping creation');
  } else {
    const hashedPassword = await bcrypt.hash(superAdminPassword, 12);
    await prisma.user.create({
      data: {
        fullName: superAdminName,
        email: superAdminEmail,
        password: hashedPassword,
        role: Role.SUPER_ADMIN,
        schoolId: null, // SUPER_ADMIN belongs to no school
        mustChangePassword: false,
        isActive: true,
      },
    });
    console.log(`✅ SUPER_ADMIN created: ${superAdminEmail}`);
  }

  console.log('✅ Seed complete');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
