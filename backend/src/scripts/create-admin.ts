import { authService } from '../modules/auth/auth.service';
import { prisma } from '../common/utils/prisma';

async function createAdmin() {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@secuaas.ca';
    const adminPassword = process.env.ADMIN_PASSWORD || 'TestForge2026!';

    // Check if admin already exists
    const existing = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (existing) {
      console.log(`✅ Admin user already exists: ${adminEmail}`);
      return;
    }

    // Create admin user
    const admin = await authService.createUser({
      email: adminEmail,
      name: 'Admin',
      password: adminPassword,
      role: 'ADMIN',
    });

    console.log('✅ Admin user created successfully!');
    console.log('Email:', admin.email);
    console.log('Password:', adminPassword);
    console.log('\n⚠️  Please change the password after first login!');
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
