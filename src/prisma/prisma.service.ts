import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(private readonly config: ConfigService) {
    const connectionString =
      config.get<string>('DATABASE_URL') ?? process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL is missing');
    }

    const adapter = new PrismaPg({ connectionString });

    super({
      adapter,
      // opcional pero pro (útil en dev)
      log:
        (config.get<string>('app.env') ?? 'development') === 'production'
          ? ['error', 'warn']
          : ['query', 'info', 'warn', 'error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
