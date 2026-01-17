import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';

type ReqWithUser = IncomingMessage & {
  user?: {
    tenantId?: string;
    sub?: string;
  };
};

@Module({
  imports: [
    // Asegura que ConfigService esté disponible (aunque ya sea global)
    ConfigModule,
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const env = config.get<string>('app.env') ?? 'development';
        const isProd = env === 'production';

        return {
          pinoHttp: {
            genReqId: (req: IncomingMessage, res: ServerResponse) => {
              const hdr = req.headers['x-request-id'];
              const id = (Array.isArray(hdr) ? hdr[0] : hdr) ?? randomUUID();
              res.setHeader('X-Request-Id', id);
              return id;
            },

            customLogLevel: (_req, res, err) => {
              if (err || res.statusCode >= 500) return 'error';
              if (res.statusCode >= 400) return 'warn';
              return 'info';
            },

            autoLogging: {
              ignore: (req: IncomingMessage) =>
                (req.url?.startsWith('/docs') ?? false) ||
                (req.url?.startsWith('/api/v1/health') ?? false) ||
                (req.url?.startsWith('/favicon.ico') ?? false),
            },

            redact: [
              'req.headers.authorization',
              'req.headers.cookie',
              'res.headers["set-cookie"]',
            ],

            customProps: (req: IncomingMessage) => {
              const r = req as ReqWithUser;
              return r.user
                ? { tenantId: r.user.tenantId, userId: r.user.sub }
                : {};
            },
          },

          transport: isProd
            ? undefined
            : {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  singleLine: true,
                  translateTime: 'SYS:standard',
                },
              },
        };
      },
    }),
  ],
})
export class LoggingModule {}
