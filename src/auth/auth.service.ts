/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload, RefreshPayload } from './types/jwt-payload';
import { asStringValue } from './helper/ttl.helper';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private accessTtl() {
    const raw = this.config.get<string>('JWT_ACCESS_TTL') ?? '15m';
    return asStringValue(raw);
  }

  private refreshTtl() {
    const raw = this.config.get<string>('JWT_REFRESH_TTL') ?? '7d';
    return asStringValue(raw);
  }

  private async signAccessToken(payload: JwtPayload) {
    const secret = this.config.get<string>('JWT_ACCESS_SECRET');
    if (!secret) throw new Error('JWT_ACCESS_SECRET missing');

    return this.jwt.signAsync(payload, {
      secret,
      expiresIn: this.accessTtl(),
    });
  }

  private async signRefreshToken(payload: RefreshPayload) {
    const secret = this.config.get<string>('JWT_REFRESH_SECRET');
    if (!secret) throw new Error('JWT_REFRESH_SECRET missing');

    return this.jwt.signAsync(payload, {
      secret,
      expiresIn: this.refreshTtl(),
    });
  }

  private refreshExpiresAt(): Date {
    // simple: 7d. Si querés exactitud con ms, lo hacemos después.
    const ttl = this.refreshTtl();
    const now = new Date();
    if (ttl.endsWith('d')) {
      const days = Number(ttl.replace('d', ''));
      now.setDate(now.getDate() + days);
      return now;
    }
    // fallback: 7 días
    now.setDate(now.getDate() + 7);
    return now;
  }

  async login(params: { email: string; password: string; tenantId: string }) {
    const user = await this.prisma.user.findFirst({
      where: { tenantId: params.tenantId, email: params.email, isActive: true },
      select: { id: true, tenantId: true, role: true, passwordHash: true },
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const ok = await argon2.verify(user.passwordHash, params.password);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    const base: JwtPayload = {
      sub: user.id,
      tenantId: user.tenantId,
      role: user.role,
    };

    const accessToken = await this.signAccessToken(base);

    const jti = randomUUID();
    const refreshToken = await this.signRefreshToken({ ...base, jti });

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        jti,
        tokenHash: await argon2.hash(refreshToken),
        expiresAt: this.refreshExpiresAt(),
      },
    });

    return { accessToken, refreshToken };
  }

  async refresh(params: { refreshToken: string }) {
    const secret = this.config.get<string>('JWT_REFRESH_SECRET');
    if (!secret) throw new Error('JWT_REFRESH_SECRET missing');

    let payload: RefreshPayload;
    try {
      payload = await this.jwt.verifyAsync<RefreshPayload>(
        params.refreshToken,
        { secret },
      );
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const row = await this.prisma.refreshToken.findUnique({
      where: { jti: payload.jti },
    });

    // token reuse / revoked / not found
    if (!row || row.revokedAt) {
      // opcional pro: revocar todos los refresh del user ante reuse
      if (payload?.sub) {
        await this.prisma.refreshToken.updateMany({
          where: { userId: payload.sub, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      throw new ForbiddenException('Refresh token revoked');
    }

    const match = await argon2.verify(row.tokenHash, params.refreshToken);
    if (!match) {
      await this.prisma.refreshToken.updateMany({
        where: { userId: payload.sub, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new ForbiddenException('Refresh token mismatch');
    }

    // rotation: revocamos el jti actual
    await this.prisma.refreshToken.update({
      where: { jti: payload.jti },
      data: { revokedAt: new Date() },
    });

    const base: JwtPayload = {
      sub: payload.sub,
      tenantId: payload.tenantId,
      role: payload.role,
    };

    const accessToken = await this.signAccessToken(base);

    const newJti = randomUUID();
    const newRefreshToken = await this.signRefreshToken({
      ...base,
      jti: newJti,
    });

    await this.prisma.refreshToken.create({
      data: {
        userId: payload.sub,
        jti: newJti,
        tokenHash: await argon2.hash(newRefreshToken),
        expiresAt: this.refreshExpiresAt(),
      },
    });

    return { accessToken, refreshToken: newRefreshToken };
  }

  async logout(params: { refreshToken: string }) {
    const secret = this.config.get<string>('JWT_REFRESH_SECRET');
    if (!secret) throw new Error('JWT_REFRESH_SECRET missing');

    try {
      const payload = await this.jwt.verifyAsync<RefreshPayload>(
        params.refreshToken,
        { secret },
      );
      await this.prisma.refreshToken.updateMany({
        where: { userId: payload.sub, jti: payload.jti, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } catch {
      // no filtramos info
    }

    return { ok: true };
  }
}
