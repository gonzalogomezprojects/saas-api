/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import 'dotenv/config';
import * as argon2 from 'argon2';
import {
  PrismaClient,
  Role,
  OrderStatus,
  TicketStatus,
  TicketType,
} from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

function getDbUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is missing in env');
  return url;
}

function makePrisma() {
  const adapter = new PrismaPg({ connectionString: getDbUrl() });
  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === 'production'
        ? ['error', 'warn']
        : ['warn', 'error'],
  });
}

async function seedTenant(
  prisma: PrismaClient,
  tenant: { name: string; slug: string },
) {
  return prisma.tenant.upsert({
    where: { slug: tenant.slug },
    update: { name: tenant.name },
    create: { name: tenant.name, slug: tenant.slug },
  });
}

async function seedAdminUser(
  prisma: PrismaClient,
  params: { tenantId: string; email: string; passwordPlain: string },
) {
  const passwordHash = await argon2.hash(params.passwordPlain);

  // Prisma genera el unique input por @@unique([tenantId, email]) como tenantId_email
  return prisma.user.upsert({
    where: {
      tenantId_email: { tenantId: params.tenantId, email: params.email },
    },
    update: {
      passwordHash,
      role: Role.ADMIN,
      isActive: true,
    },
    create: {
      tenantId: params.tenantId,
      email: params.email,
      passwordHash,
      role: Role.ADMIN,
      isActive: true,
    },
  });
}

async function seedDemoData(
  prisma: PrismaClient,
  tenantId: string,
  adminId: string,
) {
  // Limpieza solo de data demo del tenant (idempotente)
  // Orden importante por relaciones
  await prisma.orderItem.deleteMany({ where: { tenantId } });
  await prisma.ticket.deleteMany({ where: { tenantId } });
  await prisma.order.deleteMany({ where: { tenantId } });
  await prisma.client.deleteMany({ where: { tenantId } });

  // Clients
  const client1 = await prisma.client.create({
    data: {
      tenantId,
      name: 'Juan Pérez',
      email: 'juan.perez@example.com',
      phone: '+54 376 400-0001',
    },
  });

  const client2 = await prisma.client.create({
    data: {
      tenantId,
      name: 'María Gómez',
      email: 'maria.gomez@example.com',
      phone: '+54 376 400-0002',
    },
  });

  // Order + items (monto + descripción, sin catálogo)
  const order1 = await prisma.order.create({
    data: {
      tenantId,
      clientId: client1.id,
      status: OrderStatus.PENDING,
      notes: 'Servicio personalizado - demo seed',
      items: {
        create: [
          { tenantId, description: 'Servicio base', amountCents: 150000 },
          { tenantId, description: 'Extra / adicional', amountCents: 50000 },
        ],
      },
      totalCents: 200000,
    },
    include: { items: true },
  });

  // Ticket customer ligado a cliente y orden
  await prisma.ticket.create({
    data: {
      tenantId,
      type: TicketType.CUSTOMER,
      title: 'Consulta sobre el servicio',
      description: 'El cliente quiere ajustar el alcance.',
      status: TicketStatus.OPEN,
      clientId: client1.id,
      orderId: order1.id,
      assignedToId: adminId,
    },
  });

  // Ticket interno (sin cliente)
  await prisma.ticket.create({
    data: {
      tenantId,
      type: TicketType.INTERNAL,
      title: 'Revisar SLA y tiempos',
      description: 'Validar tiempos de respuesta para este tenant.',
      status: TicketStatus.IN_PROGRESS,
      assignedToId: adminId,
    },
  });

  // Order 2 (paid)
  await prisma.order.create({
    data: {
      tenantId,
      clientId: client2.id,
      status: OrderStatus.PAID,
      notes: 'Orden pagada - demo seed',
      items: {
        create: [
          { tenantId, description: 'Servicio único', amountCents: 120000 },
        ],
      },
      totalCents: 120000,
    },
  });
}

async function main() {
  const prisma = makePrisma();

  try {
    console.log('🌱 Seeding database...');

    // Tenant A
    const tenantA = await seedTenant(prisma, {
      name: 'Acme Recruiting',
      slug: 'acme',
    });
    const adminA = await seedAdminUser(prisma, {
      tenantId: tenantA.id,
      email: process.env.SEED_ADMIN_EMAIL ?? 'admin@acme.com',
      passwordPlain: process.env.SEED_ADMIN_PASSWORD ?? 'admin123',
    });
    await seedDemoData(prisma, tenantA.id, adminA.id);

    // Tenant B (opcional pero “vende” multi-tenant)
    const tenantB = await seedTenant(prisma, {
      name: 'Globex Staffing',
      slug: 'globex',
    });
    const adminB = await seedAdminUser(prisma, {
      tenantId: tenantB.id,
      email: process.env.SEED_ADMIN_EMAIL_2 ?? 'admin@globex.com',
      passwordPlain: process.env.SEED_ADMIN_PASSWORD_2 ?? 'admin123',
    });
    await seedDemoData(prisma, tenantB.id, adminB.id);

    console.log('✅ Seed OK');
    console.log('🔑 Credenciales demo:');
    console.log('   acme  -> admin@acme.com / admin123');
    console.log('   globex-> admin@globex.com / admin123');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('❌ Seed failed:', e);
  process.exit(1);
});
