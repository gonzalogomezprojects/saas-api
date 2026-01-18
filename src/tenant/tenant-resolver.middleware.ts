import {
  BadRequestException,
  Injectable,
  NestMiddleware,
} from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TenantResolverMiddleware implements NestMiddleware {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private hostname(req: Request): string {
    const raw =
      (req.headers['x-forwarded-host'] as string | undefined) ??
      req.headers.host ??
      '';
    const first = raw.split(',')[0]?.trim() ?? '';
    return first.split(':')[0] ?? '';
  }

  private tenantSlugFromHost(hostname: string): string | null {
    // local: acme.localhost
    if (hostname.endsWith('.localhost'))
      return hostname.replace('.localhost', '');

    const root = this.config.get<string>('APP_ROOT_DOMAIN') ?? '';
    if (root && hostname.endsWith(`.${root}`)) {
      // acme.tuapp.com -> "acme"
      return hostname.slice(0, -(root.length + 1)).split('.')[0] ?? null;
    }

    return null;
  }

  async use(req: Request, _res: Response, next: NextFunction) {
    const host = this.hostname(req);
    if (!host) return next();

    // 1) dominio custom (si lo usás)
    const byDomain = await this.prisma.tenant.findFirst({
      where: { domain: host },
      select: { id: true, slug: true, domain: true },
    });

    if (byDomain) {
      req.tenant = byDomain;
      return next();
    }

    // 2) subdominio (slug)
    const slug = this.tenantSlugFromHost(host);
    if (!slug) return next(); // rutas públicas / docs

    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
      select: { id: true, slug: true, domain: true },
    });

    if (!tenant)
      throw new BadRequestException(`Unknown tenant for host: ${host}`);

    req.tenant = tenant;
    return next();
  }
}
