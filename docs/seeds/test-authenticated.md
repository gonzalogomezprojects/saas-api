# 🔐 Test de Autenticación (Multi-Tenant por Subdominio)

## 1️⃣ Ejecutar Seed de Usuarios de Prueba

Antes de probar la autenticación, ejecutar el seed:

``` bash
npx tsx prisma/seed/user-test.ts
```

Esto creará los tenants y usuarios de prueba necesarios.

------------------------------------------------------------------------

## 2️⃣ Login por Subdominio

El sistema es **multi-tenant por subdominio**, por lo tanto el tenant se
resuelve automáticamente desde el `host`.

### 📌 Ejemplo con tenant `acme`

    POST http://acme.localhost:3002/api/v1/auth/login

### Body (JSON)

``` json
{
  "email": "admin@acme.com",
  "password": "admin123"
}
```

### Resultado esperado

``` json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR..."
}
```

Además:

-   Se setea automáticamente la cookie httpOnly `rt` (refresh token).
-   El `accessToken` debe enviarse en endpoints protegidos:

```{=html}
<!-- -->
```
    Authorization: Bearer ACCESS_TOKEN

------------------------------------------------------------------------

## 3️⃣ Refresh Token

Permite rotar el refresh token y obtener un nuevo access token.

    POST http://acme.localhost:3002/api/v1/auth/refresh

No requiere body si la cookie `rt` está presente.

### Respuesta esperada

``` json
{
  "accessToken": "nuevo_access_token"
}
```

El servidor: - Valida el refresh token - Genera nuevo access token -
Rota el refresh token - Actualiza la cookie

------------------------------------------------------------------------

## 4️⃣ Logout

Revoca el refresh token actual y limpia la cookie.

    POST http://acme.localhost:3002/api/v1/auth/logout

### Respuesta

``` json
{
  "ok": true
}
```

------------------------------------------------------------------------

# ⚙️ Notas Importantes

-   En entorno local, `AUTH_COOKIE_SECURE` debe estar en `false`.
-   El sistema depende del subdominio para resolver el tenant.
-   La cookie `rt` tiene como path:

```{=html}
<!-- -->
```
    /api/v1/auth/refresh

Por lo tanto, solo viaja al endpoint de refresh.
