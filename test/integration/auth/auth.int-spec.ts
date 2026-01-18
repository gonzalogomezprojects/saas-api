/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../src/app.module';

describe('Auth (integration/e2e)', () => {
  let app: INestApplication;

  const tenantId = process.env.TEST_TENANT_ID ?? 't1';
  const email = process.env.TEST_EMAIL ?? 'a@a.com';
  const password = process.env.TEST_PASSWORD ?? 'pass';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('login -> devuelve accessToken y refreshToken', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ tenantId, email, password })
      .expect((r) => {
        if (![200, 201].includes(r.status)) {
          throw new Error(`Expected 200/201, got ${r.status}`);
        }
      });

    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
  });

  it('refresh -> rota refresh token y reuse del viejo falla', async () => {
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ tenantId, email, password })
      .expect((r) => {
        if (![200, 201].includes(r.status)) {
          throw new Error(`Expected 200/201, got ${r.status}`);
        }
      });

    const oldRefresh = login.body.refreshToken as string;

    const refreshed = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: oldRefresh })
      .expect((r) => {
        if (![200, 201].includes(r.status)) {
          throw new Error(`Expected 200/201, got ${r.status}`);
        }
      });

    expect(refreshed.body).toHaveProperty('accessToken');
    expect(refreshed.body).toHaveProperty('refreshToken');

    const newRefresh = refreshed.body.refreshToken as string;
    expect(newRefresh).not.toBe(oldRefresh);

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: oldRefresh })
      .expect((r) => {
        if (![401, 403].includes(r.status)) {
          throw new Error(`Expected 401/403, got ${r.status}`);
        }
      });
  });

  it('logout -> revoca refresh y luego refresh falla', async () => {
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ tenantId, email, password })
      .expect((r) => {
        if (![200, 201].includes(r.status)) {
          throw new Error(`Expected 200/201, got ${r.status}`);
        }
      });

    const refreshToken = login.body.refreshToken as string;

    await request(app.getHttpServer())
      .post('/auth/logout')
      .send({ refreshToken })
      .expect((r) => {
        if (![200, 201].includes(r.status)) {
          throw new Error(`Expected 200/201, got ${r.status}`);
        }
      });

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken })
      .expect((r) => {
        if (![401, 403].includes(r.status)) {
          throw new Error(`Expected 401/403, got ${r.status}`);
        }
      });
  });
});
