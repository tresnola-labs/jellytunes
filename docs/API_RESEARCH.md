# Jellyfin API Research: Endpoint de Usuario Actual

## Problema

El endpoint `/Users/me`(o `/Users/Me`) **NO existe** en la API de Jellyfin cuando se usa una API Key. Devuelve error 400 (Bad Request).

### Issue Confirmado
- **GitHub Issue #14559**: [Bug? /Users/Me returns a 400 when querying with an API key](https://github.com/jellyfin/jellyfin/issues/14559)
- Estado: Confirmado como bug/comportamiento no documentado
- Versión afectada: Jellyfin 10.10.0+

### Comportamiento
```
GET /Users/Me con API Key → HTTP 400 Bad Request
```

El servidor busca el token en la tabla `ApiKeys` en lugar de `Users`, y como las API Keys no tienen un usuario asociado, falla.

---

## Solución Recomendada

### Para API Keys (sin usuario autenticado)

**No existe un endpoint "current user" para API Keys.** Las API Keys son tokens administrativos sin usuario asociado.

**Workaround oficial:** Usar `/Users` para listar usuarios y seleccionar el apropiado.

```typescript
// Endpoint correcto para listar usuarios
GET /Users
Headers: { 'X-MediaBrowser-Token': apiKey }

// Response: Array de usuarios
{
  "Items": [
    {
      "Id": "23ea021636224deeb6d8b761c7703b79",
      "Name": "admin",
      "ServerId": "...",
      "HasPassword": true,
      "HasConfiguredPassword": true,
      "HasConfiguredEasyPassword": false,
      "PrimaryImageTag": null,
      "LastLoginDate": "2025-03-13T10:00:00Z",
      "LastActivityDate": "2025-03-13T15:00:00Z",
      "Policy": {
        "IsAdministrator": true,
        "IsHidden": false,
        "IsDisabled": false,...
      }
    },
    ...
  ]
}
```

### ParaUsuarios Autenticados (username + password)

Usar `/Users/AuthenticateByName` para obtener el token Y el userId en la respuesta:

```typescript
POST /Users/AuthenticateByName
Headers: { 'Content-Type': 'application/json' }
Body: { "Username": "usuario", "Pw": "contraseña" }

// Response: AuthenticationResult
{
  "User": {
    "Id": "23ea021636224deeb6d8b761c7703b79",
    "Name": "usuario",...
  },
  "AccessToken": "0381cf931f9e42d79fb9c89f729167df",
  "ServerId": "..."
}
```

**El `User.Id` ya viene en la respuesta**, no necesitas llamar a `/Users/me`.

---

## Implementación Recomendada para JellyTunes

### Opción 1: Listar usuarios y tomar el admin (RECOMENDADA)

```typescript
async function getCurrentUserId(apiKey: string, baseUrl: string): Promise<string> {
  // Listar todos los usuarios
  const response = await fetch(`${baseUrl}/Users`, {
    headers: { 'X-MediaBrowser-Token': apiKey }
  })
  
  if (!response.ok) {
    throw new Error(`Failed to fetch users: ${response.status}`)
  }
  
  const data = await response.json()
  
  // Buscar el primer usuario administrador
  const adminUser = data.Items?.find(
    (user: any) => user.Policy?.IsAdministrator === true
  )
  
  // Fallback: tomar el primer usuario
  const userId = adminUser?.Id || data.Items?.[0]?.Id
  
  if (!userId) {
    throw new Error('No users found in Jellyfin server')
  }
  
  return userId
}
```

### Opción 2: Permitir configurar el userId manualmente

```typescript
interface JellyfinConfig {
  url: string
  apiKey: string
  userId?: string // Opcional: si no se proporciona, se auto-detecta
}

async function resolveUserId(config: JellyfinConfig): Promise<string> {
  // Si ya hay un userId configurado, usarlo
  if (config.userId) {
    return config.userId
  }
  
  // Auto-detectar: obtener primer admin
  return getCurrentUserId(config.apiKey, config.url)
}
```

### Opción 3: Usar authenticate().userId` desde response (solo users autenticados)

```typescript
async function authenticate(baseUrl: string, username: string, password: string): Promise<{userId: string, token: string}> {
  const response = await fetch(`${baseUrl}/Users/AuthenticateByName`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ Username: username, Pw: password })
  })
  
  const data = await response.json()
  
  return {
    userId: data.User.Id,
    token: data.AccessToken
  }
}
```

---

## Corrección para App.tsx

El código actual tiene este problema:

```typescript
// ❌ INCORRECTO - Este endpoint NO funciona con API Keys
const userRes = await fetch(`${normalizedUrl}/Users/Me`, {
  headers: { 'X-MediaBrowser-Token': apiKey }
})
```

**Corrección:**

```typescript
// ✅ CORRECTO - Listar usuarios y tomar el admin
const getUsersRes = await fetch(`${normalizedUrl}/Users`, {
  headers: { 'X-MediaBrowser-Token': apiKey }
})

if (getUsersRes.ok) {
  const usersData = await getUsersRes.json()
  // Buscar admin o tomar el primero
  const adminUser = usersData.Items?.find(
    (u: any) => u.Policy?.IsAdministrator === true
  )
  currentUserId = adminUser?.Id || usersData.Items?.[0]?.Id
}
```

---

## Endpoints Válidos para Usuario Actual

| Endpoint | Funciona con API Key | Funciona con User Token | Descripción |
|----------|---------------------|------------------------|-------------|
| `/Users/Me` | ❌ NO (400) | ✅ SÍ | Usuario autenticado actual |
| `/Users` | ✅ SÍ | ✅ SÍ | Lista todos los usuarios |
| `/Users/{userId}` | ✅ SÍ | ✅ SÍ | Usuario específico por ID |
| `/Users/AuthenticateByName` | N/A | N/A | Autenticar usuario (POST) |

---

## Headers de Autenticación

### Recomendado (Authorization header)
```typescript
headers: {
  'Authorization': 'MediaBrowser Token="TU_API_KEY"'
}
```

### Alternativa (X-MediaBrowser-Token header)
```typescript
headers: {
  'X-MediaBrowser-Token': 'TU_API_KEY'
}
```

### Alternativa (ApiKey query param - NO recomendado)
```typescript
// No recomendado por seguridad (logs, copy-paste)
fetch(`${baseUrl}/Users?ApiKey=${apiKey}`)
```

---

## Referencias

1. **GitHub Issue #14559**: `/Users/Me` con API Key devuelve 400
   - https://github.com/jellyfin/jellyfin/issues/14559

2. **Jellyfin API Authorization Gist**
   - https://gist.github.com/nielsvanvelzen/ea047d9028f676185832e51ffaf12a6f

3. **The Jellyfin API - A Broad Overview**
   - https://jmshrv.com/posts/jellyfin-api/

4. **Jellyfin Kotlin SDK - Authentication Guide**
   - https://kotlin-sdk.jellyfin.org/guide/authentication.html

---

## Resumen Ejecutivo

- **NO existe** `/Users/Me` funcional para API Keys
- Con **API Key**: usar `/Users` y filtrar por `IsAdministrator`
- Con **User Token**: el userId ya viene en `/Users/AuthenticateByName`
- Actualizar código para usar `/Users` en lugar de `/Users/Me`