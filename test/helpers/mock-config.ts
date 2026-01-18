import type { ConfigService } from '@nestjs/config';

export function createConfigMock(
  overrides?: Record<string, string | undefined>,
): Pick<ConfigService, 'get'> {
  const values: Record<string, string | undefined> = {
    JWT_ACCESS_TTL: '15m',
    JWT_REFRESH_TTL: '7d',
    JWT_ACCESS_SECRET: 'access_secret_test',
    JWT_REFRESH_SECRET: 'refresh_secret_test',
    ...overrides,
  };

  return {
    get: jest.fn((key: string) => values[key]),
  };
}
