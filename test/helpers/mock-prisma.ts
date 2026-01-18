import type { PrismaClient } from '@prisma/client';

type DeepMock<T> = {
  [K in keyof T]?: T[K] extends (...args: infer A) => infer R
    ? jest.Mock<Awaited<R>, A>
    : T[K] extends object
      ? DeepMock<T[K]>
      : T[K];
};

export type PrismaMock = DeepMock<PrismaClient>;

export function createPrismaMock(): PrismaMock {
  return {
    user: {
      findFirst: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };
}
