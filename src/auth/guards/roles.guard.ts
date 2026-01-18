import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { Request } from 'express';
import type { Role } from '@prisma/client';

type JwtUser = { sub: string; tenantId: string; role: Role };

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);

    if (!required || required.length === 0) return true;

    const req = ctx.switchToHttp().getRequest<Request>();
    const user = req.user as JwtUser | undefined;

    if (!user) throw new ForbiddenException('Missing user');
    if (!required.includes(user.role))
      throw new ForbiddenException('Insufficient role');

    return true;
  }
}
