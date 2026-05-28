import {
  PaginatedEmpresas,
  ResumenFinanciero,
} from '../../services/empresas/interfaces.empresas/interfaces.empresas';
import { JwtPayload } from '../../services/auth/interfaces.auth/interfaces.auth';

// =========================
// auth
// =========================

// Formato estandar de respuesta del backend: toda la API responde con
// esta forma para que el cliente la consuma de manera uniforme.
// Generico: cada endpoint declara en interfaces.routes que mete en `output`.
export interface ResponseApi<T = unknown> {
  codigo: number;   // codigo de estado (HTTP o interno)
  message: string;  // mensaje legible para el cliente
  status: boolean;  // true = exito, false = error
  output?: T;       // payload de la respuesta (tipado por endpoint)
}

// POST /auth/login   -> setea cookie httpOnly Token_jwt
export type LoginResponse = ResponseApi<{ ok: true }>;

// POST /auth/logout  -> limpia cookie Token_jwt
export type LogoutResponse = ResponseApi<{ ok: true }>;

// GET /auth/me      -> datos del usuario autenticado (sondeo de sesion del front)
export type MeResponse = ResponseApi<JwtPayload>;

// =========================
// empresas
// =========================

// GET /empresas              -> lista de empresas activas (paginada)
export type FindAllEmpresasResponse = ResponseApi<PaginatedEmpresas>;

// GET /empresas/:id/resumen  -> resumen financiero del mes
export type GetResumenResponse = ResponseApi<ResumenFinanciero>;
