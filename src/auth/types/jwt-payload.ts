import { Role } from '@prisma/client';

export type JwtPayload = {
  sub: string;
  tenantId: string;
  role: Role;
};

export type RefreshPayload = JwtPayload & {
  jti: string;
};
