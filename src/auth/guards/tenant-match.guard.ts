import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtPayload } from '../types/jwt-payload';

type AuthReq = Request & { user: JwtPayload };

@Injectable()
export class TenantMatchGuard implements CanActivate {
  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest<AuthReq>();
    const hostTenantId = req.tenant?.id;
    const jwtTenantId = req.user.tenantId;

    if (!hostTenantId || !jwtTenantId) return true; // públicas o antes de auth
    if (hostTenantId !== jwtTenantId)
      throw new ForbiddenException('Tenant mismatch');

    return true;
  }
}
