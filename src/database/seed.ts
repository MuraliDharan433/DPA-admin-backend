import 'dotenv/config';
import mongoose from 'mongoose';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { permissionService } from '../services/permission.service';
import { roleService } from '../services/role.service';
import { userService } from '../services/user.service';
import { RoleName } from '../constants/roles.constant';

async function seed() {
  await mongoose.connect(env.mongodbUri);
  logger.log(`Connected to MongoDB -> ${mongoose.connection.name}`);

  try {
    logger.log('Seeding permissions...');
    await permissionService.ensureSeeded();

    logger.log('Seeding default roles (OWNER, ADMIN, COUNSELOR, TRAINER, PLACEMENT_OFFICER, STAFF)...');
    await roleService.ensureSeeded();

    const ownerRole = await roleService.findByName(RoleName.OWNER);
    if (!ownerRole) throw new Error('Owner role failed to seed');

    logger.log(`Seeding Owner account (${env.seed.ownerEmail})...`);
    await userService.createOwnerIfNotExists({
      firstName: env.seed.ownerFirstName,
      lastName: env.seed.ownerLastName,
      email: env.seed.ownerEmail,
      mobile: env.seed.ownerMobile,
      password: env.seed.ownerPassword,
      roleId: ownerRole._id as any,
    });

    logger.log('Seed complete.');
    logger.log(`Owner login -> email: ${env.seed.ownerEmail}  password: (from SEED_OWNER_PASSWORD in .env)`);
  } catch (err) {
    logger.error('Seed failed', err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seed();
