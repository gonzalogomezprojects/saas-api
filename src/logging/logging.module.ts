import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { pino } from 'pino';

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

        const logLevel =
          config.get<string>('LOG_LEVEL') ?? (isProd ? 'info' : 'debug');
        const logToFile =
          (config.get<string>('LOG_TO_FILE') ?? 'false') === 'true';
        const logFile = config.get<string>('LOG_FILE') ?? 'logs/app.log';

        const targets: Array<{
          target: string;
          level?: string;
          options?: Record<string, unknown>;
        }> = [];

        // Dev: consola legible
        if (!isProd) {
          targets.push({
            target: 'pino-pretty',
            level: logLevel,
            options: {
              colorize: true,
              singleLine: true,
              translateTime: 'SYS:standard', // 2026-01-17 16:27:44.123 -0300
              ignore: 'pid,hostname', // limpia ruido
            },
          });
        }

        // Archivo: JSON (ideal para parsear/grep)
        if (logToFile) {
          targets.push({
            target: 'pino/file',
            level: logLevel,
            options: {
              destination: logFile,
              mkdir: true,
            },
          });
        }

        return {
          pinoHttp: {
            level: logLevel,
            transport: targets.length ? { targets } : undefined,
            timestamp: pino.stdTimeFunctions.isoTime,

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
        };
      },
    }),
  ],
})
export class LoggingModule {}
