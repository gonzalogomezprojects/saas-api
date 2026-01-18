import type { Config } from 'jest';

const config: Config = {
  displayName: 'integration',
  testEnvironment: 'node',
  rootDir: '.',
  preset: 'ts-jest',
  testMatch: ['<rootDir>/test/integration/**/*.int-spec.ts'],
  clearMocks: true,
  restoreMocks: true,

  globalSetup: '<rootDir>/test/integration/setup/global-setup.ts',
  globalTeardown: '<rootDir>/test/integration/setup/global-teardown.ts',

  testTimeout: 60_000,
};

export default config;
