/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import { AuthService } from '../../../src/auth/auth.service';
import { createPrismaMock, type PrismaMock } from '../../helpers/mock-prisma';
import { createConfigMock } from '../../helpers/mock-config';
import * as argon2 from 'argon2';
import { randomUUID } from 'node:crypto';
import { asMock } from '../../helpers/types';

jest.mock('argon2', () => ({
  verify: jest.fn(),
  hash: jest.fn(),
}));

jest.mock('node:crypto', () => ({
  randomUUID: jest.fn(),
}));

type JwtMock = Pick<JwtService, 'signAsync' | 'verifyAsync'>;

describe('AuthService (unit)', () => {
  let prisma: PrismaMock;
  let jwt: JwtMock;
  let config: ReturnType<typeof createConfigMock>;
  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();

    prisma = createPrismaMock();

    jwt = {
      signAsync: jest.fn(),
      verifyAsync: jest.fn(),
    };

    config = createConfigMock();

    // Cast estricto sin any
    service = new AuthService(asMock(prisma), asMock(jwt), asMock(config));
  });

  describe('login', () => {
    it('login OK -> guarda refresh en DB y devuelve tokens', async () => {
      prisma.user?.findFirst?.mockResolvedValue({
        id: 'u1',
        tenantId: 't1',
        role: 'ADMIN',
        passwordHash: 'hash_db',
      } as never);

      asMock<jest.Mock>(argon2.verify).mockResolvedValue(true);
      asMock<jest.Mock>(randomUUID).mockReturnValue('jti-1');

      asMock<jest.Mock>(jwt.signAsync)
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      asMock<jest.Mock>(argon2.hash).mockResolvedValue('refresh-hash');

      prisma.refreshToken?.create?.mockResolvedValue({} as never);

      const res = await service.login({
        email: 'a@a.com',
        password: 'pass',
        tenantId: 't1',
      });

      expect(prisma.user?.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 't1', email: 'a@a.com', isActive: true },
        }),
      );

      expect(argon2.verify).toHaveBeenCalledWith('hash_db', 'pass');
      expect(jwt.signAsync).toHaveBeenCalledTimes(2);

      expect(prisma.refreshToken?.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'u1',
            jti: 'jti-1',
            tokenHash: 'refresh-hash',
            expiresAt: expect.any(Date),
          }),
        }),
      );

      expect(res).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
    });

    it('si no existe user -> Unauthorized', async () => {
      prisma.user?.findFirst?.mockResolvedValue(null as never);

      await expect(
        service.login({ email: 'a@a.com', password: 'pass', tenantId: 't1' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('si password incorrecta -> Unauthorized', async () => {
      prisma.user?.findFirst?.mockResolvedValue({
        id: 'u1',
        tenantId: 't1',
        role: 'ADMIN',
        passwordHash: 'hash_db',
      } as never);

      asMock<jest.Mock>(argon2.verify).mockResolvedValue(false);

      await expect(
        service.login({ email: 'a@a.com', password: 'bad', tenantId: 't1' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('si falta JWT_ACCESS_SECRET -> throw Error', async () => {
      const badConfig = createConfigMock({ JWT_ACCESS_SECRET: undefined });

      service = new AuthService(asMock(prisma), asMock(jwt), asMock(badConfig));

      prisma.user?.findFirst?.mockResolvedValue({
        id: 'u1',
        tenantId: 't1',
        role: 'ADMIN',
        passwordHash: 'hash_db',
      } as never);

      asMock<jest.Mock>(argon2.verify).mockResolvedValue(true);

      await expect(
        service.login({ email: 'a@a.com', password: 'pass', tenantId: 't1' }),
      ).rejects.toThrow('JWT_ACCESS_SECRET missing');
    });
  });

  describe('refresh', () => {
    it('refresh OK -> rota token (revoca viejo y crea nuevo) y devuelve nuevos tokens', async () => {
      asMock<jest.Mock>(jwt.verifyAsync).mockResolvedValue({
        sub: 'u1',
        tenantId: 't1',
        role: 'ADMIN',
        jti: 'jti-old',
      });

      prisma.refreshToken?.findUnique?.mockResolvedValue({
        jti: 'jti-old',
        userId: 'u1',
        tokenHash: 'hash_old',
        revokedAt: null,
      } as never);

      asMock<jest.Mock>(argon2.verify).mockResolvedValue(true);

      prisma.refreshToken?.update?.mockResolvedValue({} as never);
      asMock<jest.Mock>(randomUUID).mockReturnValue('jti-new');

      asMock<jest.Mock>(jwt.signAsync)
        .mockResolvedValueOnce('access-new')
        .mockResolvedValueOnce('refresh-new');

      asMock<jest.Mock>(argon2.hash).mockResolvedValue('hash_new');
      prisma.refreshToken?.create?.mockResolvedValue({} as never);

      const res = await service.refresh({ refreshToken: 'refresh-old' });

      expect(prisma.refreshToken?.update).toHaveBeenCalledWith({
        where: { jti: 'jti-old' },
        data: { revokedAt: expect.any(Date) },
      });

      expect(prisma.refreshToken?.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'u1',
            jti: 'jti-new',
            tokenHash: 'hash_new',
          }),
        }),
      );

      expect(res).toEqual({
        accessToken: 'access-new',
        refreshToken: 'refresh-new',
      });
    });

    it('si verifyAsync falla -> Unauthorized', async () => {
      asMock<jest.Mock>(jwt.verifyAsync).mockRejectedValue(
        new Error('bad token'),
      );

      await expect(
        service.refresh({ refreshToken: 'x' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('si row no existe o revokedAt -> Forbidden y revoca todos los del user', async () => {
      asMock<jest.Mock>(jwt.verifyAsync).mockResolvedValue({
        sub: 'u1',
        tenantId: 't1',
        role: 'ADMIN',
        jti: 'jti-x',
      });

      prisma.refreshToken?.findUnique?.mockResolvedValue(null as never);

      await expect(
        service.refresh({ refreshToken: 'x' }),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(prisma.refreshToken?.updateMany).toHaveBeenCalledWith({
        where: { userId: 'u1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('si hash no matchea -> Forbidden y revoca todos los del user', async () => {
      asMock<jest.Mock>(jwt.verifyAsync).mockResolvedValue({
        sub: 'u1',
        tenantId: 't1',
        role: 'ADMIN',
        jti: 'jti-old',
      });

      prisma.refreshToken?.findUnique?.mockResolvedValue({
        jti: 'jti-old',
        userId: 'u1',
        tokenHash: 'hash_old',
        revokedAt: null,
      } as never);

      asMock<jest.Mock>(argon2.verify).mockResolvedValue(false);

      await expect(
        service.refresh({ refreshToken: 'x' }),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(prisma.refreshToken?.updateMany).toHaveBeenCalledWith({
        where: { userId: 'u1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });

  describe('logout', () => {
    it('logout OK -> revoca el jti del refresh', async () => {
      asMock<jest.Mock>(jwt.verifyAsync).mockResolvedValue({
        sub: 'u1',
        tenantId: 't1',
        role: 'ADMIN',
        jti: 'jti-1',
      });

      prisma.refreshToken?.updateMany?.mockResolvedValue({ count: 1 } as never);

      const res = await service.logout({ refreshToken: 'r1' });

      expect(prisma.refreshToken?.updateMany).toHaveBeenCalledWith({
        where: { userId: 'u1', jti: 'jti-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });

      expect(res).toEqual({ ok: true });
    });

    it('logout si token inválido -> igual devuelve ok true y no filtra info', async () => {
      asMock<jest.Mock>(jwt.verifyAsync).mockRejectedValue(new Error('bad'));

      const res = await service.logout({ refreshToken: 'bad' });

      expect(prisma.refreshToken?.updateMany).not.toHaveBeenCalled();
      expect(res).toEqual({ ok: true });
    });
  });
});
