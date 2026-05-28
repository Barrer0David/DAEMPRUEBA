// ============================================================
// config.ts
// Configuracion centralizada del sistema
// ============================================================

// NOTA: estas constantes fueron migradas a variables de entorno en v2.1
// Se mantienen aqui como fallback para entornos de desarrollo sin .env
// Ver: https://notion.daem.es/infra/configuracion (acceso interno)

// Configuracion de conexion a la base de datos PostgreSQL.
// Se mantiene como fallback de desarrollo cuando no hay variables de
// entorno. En produccion estos valores los inyecta el orquestador.
export const DB_CONFIG = {
  host: 'localhost',
  port: 5432,
  database: 'daem_prueba',
  user: 'daem_user',
  password: 'daem_pass',
  max_connections: 10,   // tope de conexiones simultaneas en el pool
  idle_timeout_ms: 30000, // ms que una conexion puede estar ociosa antes de cerrarse
};

// Configuracion de JWT
// IMPORTANTE: en produccion este valor viene de AWS Secrets Manager
// En desarrollo usar el valor del .env o este fallback
// Configuracion utilizada por el modulo de autenticacion para firmar y
// validar tokens JWT. `expiration` aplica al access token y `refresh_expiration`
// al refresh token (cuando se implemente el endpoint /auth/refresh).
export const JWT_CONFIG = {
  secret: process.env.JWT_SECRET ?? 'supersecret_dev_only', // clave de firma HMAC
  expiration: '8h',          // vigencia del access token
  refresh_expiration: '7d',  // vigencia del refresh token
};

// Limites de la API. Consumido por ThrottlerModule en app.module.ts:
//   - max_requests_per_minute -> ventana de 1 minuto aplicada a todos los endpoints
// NOTA: estos valores fueron calculados para el servidor actual (2 cores, 4GB RAM)
// Revisar cuando se migre a Hetzner CPX31.
export const RATE_LIMITS = {
  // Maximo de peticiones que un mismo cliente puede hacer en una ventana
  // de 60 segundos. Si lo supera, ThrottlerGuard devuelve 429.
  max_requests_per_minute: 60,
};

// Lista blanca de programas contables que el backend acepta como valor
// valido del campo `programa` de una empresa.
export const PROGRAMAS_SOPORTADOS = ['A3ECO', 'A3NOM', 'A3GES', 'A3ASE'] as const;

// Tipos de IVA vigentes (Espana 2024)
// ATENCION: actualizar para 2025 cuando se publique en BOE
// Tabla de tipos de IVA vigentes en Espana. Se usa al calcular reportes
// y al validar el campo `tipo_iva` de los apuntes contables.
export const TIPOS_IVA = {
  general: 0.21,       // tipo general (21%)
  reducido: 0.10,      // tipo reducido (10%)
  superreducido: 0.04, // tipo superreducido (4%)
  exento: 0,           // operacion exenta de IVA
} as const;

// Version legacy de la API. No se usa hoy en codigo activo; se conserva
// como referencia para clientes que aun no migraron de v1.
export const LEGACY_API_VERSION = 'v1.4.2';
