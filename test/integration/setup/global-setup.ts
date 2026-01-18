/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { PrismaPg } from '@prisma/adapter-pg';

type State = { id: string; dbUrl: string };

export default async function globalSetup() {
  const container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('testdb')
    .withUsername('test')
    .withPassword('test')
    .start();

  const dbUrl = container.getConnectionUri();
  process.env.DATABASE_URL = dbUrl;

  // Guardamos estado para teardown (se ejecuta en otro proceso)
  const statePath = join(
    process.cwd(),
    'test/integration/setup/.container-state.json',
  );
  const state: State = { id: container.getId(), dbUrl };
  writeFileSync(statePath, JSON.stringify(state), 'utf-8');

  // Migraciones Prisma
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: dbUrl },
  });

  // Seed mínimo (TS directo, sin JS)
  const adapter = new PrismaPg({ connectionString: dbUrl });
  const prisma = new PrismaClient({ adapter });
  try {
    const tenantId = 't1';
    const email = 'a@a.com';
    const passwordPlain = 'pass';
    const passwordHash = await argon2.hash(passwordPlain);

    /**
     * Ajustá ESTA parte según tu schema.
     * - Si tenés unique compuesto (tenantId+email), dejá como está.
     * - Si no, cambiá el where a { email } o el unique correcto.
     */

    // Ejemplo A: unique compuesto email+tenantId => @@unique([tenantId, email])

    await prisma.tenant.upsert({
      where: { id: tenantId },
      update: {
        // si tenés campos requeridos extras, setealos acá
      },
      create: {
        id: tenantId,
        slug: 'tenant-1',
        name: 'Tenant Test',
        // si tu Tenant tiene campos obligatorios (ej: domain), agregalos
        // domain: "test.local",
      },
    });

    const existing = await prisma.user.findFirst({
      where: { tenantId, email },
    });

    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { isActive: true, passwordHash, role: 'ADMIN' },
      });
    } else {
      await prisma.user.create({
        data: { tenantId, email, isActive: true, role: 'ADMIN', passwordHash },
      });
    }

    // Exponemos credenciales para los tests
    process.env.TEST_TENANT_ID = tenantId;
    process.env.TEST_EMAIL = email;
    process.env.TEST_PASSWORD = passwordPlain;
  } finally {
    await prisma.$disconnect();
  }
}
