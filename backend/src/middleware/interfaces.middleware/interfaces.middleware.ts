// ============================================================
// interfaces.middleware.ts
// Interfaces propias del middleware + formato global de respuesta.
// JwtPayload vive en auth/interfaces.auth (es del dominio de auth, no del middleware).
// ============================================================
import { Request } from 'express';
import { JwtPayload } from '../../services/auth/interfaces.auth/interfaces.auth';

// Request con el usuario ya autenticado adjunto por el middleware JWT.
export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}
