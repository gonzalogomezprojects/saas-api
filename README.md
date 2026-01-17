# SaaS API – Multi-tenant Backend (NestJS)

API backend profesional para una plataforma **SaaS multi-tenant**, construida con **NestJS**, enfocada en buenas prácticas de arquitectura, seguridad y mantenibilidad.

Este proyecto está pensado como **base real de producción** y a disposición de todos los que quieran utilizarlo y agregar mejoras.

---

## Features principales 🚀 

- **NestJS** (arquitectura modular y escalable)
- **Multi-tenant** por `tenantId`
- **Autenticación JWT + Refresh Tokens**
- **RBAC** (roles: ADMIN / STAFF / USER)
- **PostgreSQL + Prisma**
- **Validación global** con DTOs (`class-validator`)
- **Logger profesional** con Pino (`nestjs-pino`)
- **Swagger (OpenAPI)** documentado
- **Seguridad básica** (Helmet + CORS)
- **Docker-ready**
- **Config por entorno** (`@nestjs/config` + Joi)

---

## Arquitectura general 🧱 

- Cada request autenticado contiene un `tenantId`
- Todas las entidades de negocio están asociadas a un tenant
- El tenant se obtiene **desde el JWT**, no desde el body
- El acceso a datos se filtra siempre por tenant

```text
Client → Auth (JWT) → Guards → Controllers → Services → Prisma → PostgreSQL
```

## Autenticación 🔐

- **Access Token:** JWT corto (Authorization: Bearer)
- **Refresh Token:** pensado para HttpOnly Cookie
- **Autenticación JWT + Refresh Tokens**
- **Rotación de refresh tokens**
- *Logout con revocación**

---

##  Roles (RBAC) 🧑‍🤝‍🧑

- **ADMIN, STAFF, USER**
- Los roles se **validan** mediante guards y decoradores (@Roles()).


---

## Seguridad 🔒 

- **Helmet** (headers de seguridad)
- **CORS** configurado
- **ValidationPipe global**: whitelist, forbidNonWhitelisted, transform.

## Configuración por entorno ⚙️

- **La aplicación utiliza un archivo de plantilla de variables de entorno para garantizar una configuración consistente entre desarrollo, staging y producción.**

## Docker y entorno local 🐳

**¿Qué resuelve Docker en este proyecto?**
- Evita instalar PostgreSQL localmente
- Garantiza la misma versión de servicios para todo el equipo
- Simplifica el onboarding y el deploy**

***Secrets*** 🔐 

El proyecto utiliza una carpeta `secrets/` para almacenar información sensible
(claves, tokens, certificados).

Por razones de seguridad:

- La carpeta `secrets/` **no se versiona**
- Está incluida en `.gitignore`
- Solo se provee una plantilla (`secrets.template/`) como referencia

Cada entorno debe crear su propia carpeta `secrets/` localmente o configurar
los secretos mediante variables de entorno o el proveedor de infraestructura.

## Objetivo del proyecto 📌 

### Este proyecto sirve como:

- Base real para un SaaS multi-tenant

- Ejemplo de backend production-ready

- Portfolio técnico para posiciones Backend / Full Stack

## Autor 🧠

Gonzalo Gómez
Backend Developer – NestJS / PostgreSQL / SaaS Architecture

2026 - This project arose from the inspiration to climb in order to be able to do even more

(>‿◠)✌

---
