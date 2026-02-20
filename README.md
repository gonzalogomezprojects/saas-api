# SaaS API – Multi-tenant Backend (NestJS)

Professional backend API for a **multi-tenant SaaS platform**, built with **NestJS**, following clean architecture principles, strong tenant isolation, and production-ready practices.

This project serves as a solid backend foundation designed for scalability, security, and maintainability.

---

## Overview

The system is built around strict **tenant isolation** and modular architecture.

Each authenticated request:

- Contains a `tenantId`
- Is validated via JWT
- Is filtered at the service/data layer level
- Never trusts tenant input from the request body

Architecture flow:
---

## Core Features

- Modular and scalable NestJS architecture
- Multi-tenant support via `tenantId`
- JWT authentication + refresh tokens
- Refresh token rotation strategy
- Role-Based Access Control (ADMIN / STAFF / USER)
- PostgreSQL + Prisma ORM
- Global DTO validation (`class-validator`)
- Structured logging with Pino (`nestjs-pino`)
- OpenAPI documentation (Swagger)
- Security hardening (Helmet + CORS)
- Environment configuration validation with Joi
- Docker-ready setup

---

## Authentication

- Short-lived Access Token (Bearer)
- Refresh Token support (HttpOnly cookie strategy ready)
- Token rotation implemented
- Logout with token revocation
- Guards and decorators protect secured routes

---

## Role-Based Access Control (RBAC)

Roles implemented:

- `ADMIN`
- `STAFF`
- `USER`

Roles are enforced using:

- Custom decorators (`@Roles()`)
- Guard-based validation
- Route-level protection

---

## Multi-Tenant Strategy

- Every business entity is scoped by `tenantId`
- Tenant context extracted from JWT
- Database queries always filtered by tenant
- No cross-tenant data access allowed

---

## Security

- Helmet for HTTP headers security
- CORS configuration
- Global `ValidationPipe`
  - `whitelist: true`
  - `forbidNonWhitelisted: true`
  - `transform: true`

Sensitive data is never committed to the repository.

---

## Environment Configuration

- `@nestjs/config`
- Joi schema validation
- Environment-based configuration
- Secrets managed via environment variables

A template file is provided for reference, but actual secrets must be defined per environment.

---

## Docker Setup

Docker is used to:

- Avoid local PostgreSQL installation
- Guarantee consistent service versions
- Simplify onboarding
- Mirror production-like environments

---

## Project Purpose

This repository serves as:

- A production-ready SaaS backend foundation
- A reference implementation of multi-tenant architecture
- A technical portfolio project for Backend / Full Stack positions

Extended modules and advanced business workflows may be maintained separately.

---

## Stack

- NestJS
- PostgreSQL
- Prisma ORM
- JWT Authentication
- Pino Logger
- Swagger (OpenAPI)
- Docker

---

## Author

Gonzalo S. A. Gómez  
Backend Engineer · SaaS Architect  

Engineering scalable systems with intention.
