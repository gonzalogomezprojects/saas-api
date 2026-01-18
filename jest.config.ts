import type { Config } from 'jest';

const config: Config = {
  projects: [
    '<rootDir>/jest.unit.config.ts',
    '<rootDir>/jest.integration.config.ts',
  ],
};

export default config;
