import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication) {
  const config = app.get(ConfigService);
  const enabled = config.get<boolean>('swagger.enabled') ?? true;
  const path = config.get<string>('swagger.path') ?? 'docs';

  if (!enabled) return;

  const swaggerConfig = new DocumentBuilder()
    .setTitle('SaaS API (Multi-tenant)')
    .setDescription('API multi-tenant con JWT, RBAC y buenas prácticas.')
    .setVersion('1.0.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .build();

  // Genera el doc al vuelo
  const documentFactory = () =>
    SwaggerModule.createDocument(app, swaggerConfig);

  SwaggerModule.setup(path, app, documentFactory, {
    customSiteTitle: 'SaaS API Docs',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      docExpansion: 'none',
    },
    jsonDocumentUrl: `${path}/json`,
  });
}
