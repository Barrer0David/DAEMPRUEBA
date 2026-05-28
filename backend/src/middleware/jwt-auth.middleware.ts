import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './interfaces.middleware/interfaces.middleware';
import { JwtPayload } from '../services/auth/interfaces.auth/interfaces.auth';

// Misma cookie que fija AuthController en el login.
const COOKIE_TOKEN = 'Token_jwt';

@Injectable()
export class JwtAuthMiddleware implements NestMiddleware {

  // Logger nominado para diferenciar en consola las trazas de auth.
  private readonly logger = new Logger('JwtAuth');

  constructor(private readonly jwtService: JwtService) {

  }

  /**
   * Summary: Middleware de autenticacion. Lee la cookie httpOnly con el JWT,
   * la valida y, si es correcta, adjunta el payload (sub, email, rol) a
   * req.user para que llegue tipado a los controllers. Si el token falta o
   * es invalido, delega el error al pipeline para que AllExceptionsFilter lo
   * traduzca a 401.
   *
   * Parameters:
   *   * req: AuthenticatedRequest — request de Express; este middleware
   *          completa su campo opcional `user`.
   *   * res: Response — response de Express (no se modifica aqui).
   *   * next: NextFunction — callback que continua la cadena de middlewares.
   *
   * Return: Promise<void>
   */
  async use(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try{
      req.user = await this.validarTokenCookie(req);
      next();
    }catch(error){
      this.logger.warn( `Acceso rechazado -> ${req.method} ${req.originalUrl}`);
      next(error);
    }
  }


  /**
   * Summary: Extrae el JWT de la cookie Token_jwt, lo verifica con la clave
   * configurada en JwtModule y devuelve el payload decodificado. Cualquier
   * fallo (cookie ausente, firma invalida, token expirado) se convierte en
   * UnauthorizedException con un mensaje generico.
   *
   * Parameters:
   *   * req: Request — request de Express; se lee `req.cookies[COOKIE_TOKEN]`.
   *
   * Return: Promise<JwtPayload> — payload del token (sub, email, rol).
   */
  private async validarTokenCookie(req: Request): Promise<JwtPayload> {
    const token = req.cookies?.[COOKIE_TOKEN];

    if (!token) {
      throw new UnauthorizedException('Token no proporcionado');
    }

    try {
      return await this.jwtService.verifyAsync<JwtPayload>(token.trim());
    } catch (error) {
      this.logger.warn(
        `Token rechazado: ${error instanceof Error ? error.message : 'desconocido'}`,
      );
      throw new UnauthorizedException('Token invalido o expirado');
    }
  }
}
