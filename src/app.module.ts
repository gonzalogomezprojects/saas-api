import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { envValidationSchema } from './config/env.validation';
import { LoggingModule } from './logging/logging.module';
import { PrismaModule } from './prisma/prisma.module';
import { HealthService } from './health/health.service';
import { HealthController } from './health/health.controller';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { TenantResolverMiddleware } from './tenant/tenant-resolver.middleware';
import { ClientsModule } from './clients/clients.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: envValidationSchema,
      cache: true,
    }),
    LoggingModule,
    PrismaModule,
    HealthModule,
    AuthModule,
    ClientsModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService, HealthService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantResolverMiddleware)
      .exclude(
        { path: 'docs', method: RequestMethod.ALL },
        { path: 'docs/*path', method: RequestMethod.ALL },
        { path: 'api/v1/health', method: RequestMethod.ALL },
        { path: 'favicon.ico', method: RequestMethod.ALL },
      )
      .forRoutes({ path: '*path', method: RequestMethod.ALL });
  }
}
