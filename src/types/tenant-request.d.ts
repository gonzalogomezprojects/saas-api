import 'express';

declare module 'express-serve-static-core' {
  interface Request {
    tenant?: { id: string; slug: string; domain?: string | null };
  }
}
