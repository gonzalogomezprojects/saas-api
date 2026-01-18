import 'express-serve-static-core';
import type { JwtPayload } from '../auth/types/jwt-payload';

declare module 'express-serve-static-core' {
  interface Request {
    user?: JwtPayload; // lo setea passport-jwt
    tenant?: { id: string; slug: string; domain?: string | null }; // lo setea tu middleware
  }
}
