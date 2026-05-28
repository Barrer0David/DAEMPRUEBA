// ============================================================
// interfaces.auth.ts
// Interfaces del dominio de autenticacion.
// ============================================================

// Payload que firmamos en el login y que viaja dentro del JWT.
// IMPORTANTE: no incluir datos sensibles (passwords, tokens, etc.).
// El payload es solo base64, cualquiera lo decodifica con document.cookie + atob.
export interface JwtPayload {
  sub: number;    // id del usuario
  email: string;
  rol: string;
}
