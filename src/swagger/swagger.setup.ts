// src/swagger/swagger.setup.ts
import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication) {
  const API_PREFIX = 'api/v1'; // mantenelo igual que en main.ts

  const config = new DocumentBuilder()
    .setTitle('SaaS API')
    .setDescription(
      [
        'API SaaS multi-tenant (NestJS + Prisma + Postgres).',
        '',
        'Auth:',
        '- Access token: Bearer JWT (header Authorization)',
        "- Refresh token: Cookie HttpOnly (cookie name: 'rt')",
        '',
        "Multi-tenant: enviar 'x-tenant-id' (temporal, hasta que lo resolvamos desde el usuario).",
      ].join('\n'),
    )
    .setVersion('1.0.0')

    // ✅ Esto hace que Swagger “pruebe” contra /api/v1/...
    .addServer(`/${API_PREFIX}`)

    // ✅ Access token (Bearer)
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
      'access-token',
    )

    // ✅ Refresh token por cookie
    .addCookieAuth('rt', { type: 'apiKey', in: 'cookie' }, 'refresh-cookie')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    // si Swagger te ignora el prefix, dejalo explícito
    ignoreGlobalPrefix: false,
  });

  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
}
