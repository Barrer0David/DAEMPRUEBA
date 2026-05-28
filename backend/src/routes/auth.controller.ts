import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  HttpException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from '../services/auth/auth.service';
import { AuthenticatedRequest } from '../middleware/interfaces.middleware/interfaces.middleware';
import {
  LoginResponse,
  LogoutResponse,
  MeResponse,
} from './interfaces.routes/interfaces.routes';
import { LoginDto } from './dtos.route/dtos.route';

// Unica cookie: el JWT en httpOnly (JS del navegador NO la puede leer ->
// mitiga el robo de token por XSS). El front nunca toca el token directamente.
const COOKIE_TOKEN = 'Token_jwt';
// Cookie obsoleta de una version anterior del backend; la borramos en cada
// login/logout para limpiar navegadores que la tengan guardada.
const COOKIE_LEGACY = 'access_token';
// Debe ir alineado con el expiresIn del JwtModule (8h en app.module.ts).
const OCHO_HORAS_MS = 8 * 60 * 60 * 1000;

@Controller('auth')
export class AuthController {
  // Logger nominado para distinguir en consola los eventos del controller de auth.
  private readonly logger = new Logger('AuthController');

  constructor(private authService: AuthService) {}

  /**
   * Summary: Endpoint POST /auth/login. Recibe email + password, delega la
   * validacion en AuthService.login y, si las credenciales son correctas,
   * fija la cookie httpOnly Token_jwt con el access token (8h) y limpia la
   * cookie legacy. Errores de credenciales suben como 401; errores no
   * controlados como 500.
   *
   * Parameters:
   *   * body: LoginDto — body validado por ValidationPipe (email + password).
   *   * res: Response — response de Express en modo passthrough para poder
   *          fijar cookies sin perder el flujo de retorno de Nest.
   *
   * Return: Promise<LoginResponse> — ResponseApi con `output: { ok: true }`.
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: LoginDto, @Res({ passthrough: true }) res: Response,): Promise<LoginResponse> {
    try {
      const { access_token } = await this.authService.login(body.email, body.password);

      res.cookie(COOKIE_TOKEN, access_token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: OCHO_HORAS_MS,
      });
      res.clearCookie(COOKIE_LEGACY, { path: '/' });

      return {
        codigo: HttpStatus.OK,
        message: 'Sesion iniciada',
        status: true,
        output: { ok: true },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error('Fallo inesperado en login', error as Error);
      throw new InternalServerErrorException('Error al iniciar sesion');
    }
  }

  /**
   * Summary: Endpoint POST /auth/logout. Borra la cookie httpOnly Token_jwt
   * y la cookie legacy. Es idempotente: no exige sesion previa para que el
   * front siempre pueda llamarlo (limpia el navegador aunque ya no hubiese
   * sesion).
   *
   * Parameters:
   *   * res: Response — response de Express en modo passthrough para poder
   *          limpiar las cookies sin perder el retorno de Nest.
   *
   * Return: LogoutResponse — ResponseApi con `output: { ok: true }`.
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) res: Response): LogoutResponse {
    try {
      res.clearCookie(COOKIE_TOKEN, { path: '/' });
      // Borra tambien la cookie legacy por si el navegador todavia la tenia.
      res.clearCookie(COOKIE_LEGACY, { path: '/' });

      return {
        codigo: HttpStatus.OK,
        message: 'Sesion cerrada',
        status: true,
        output: { ok: true },
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Fallo inesperado en logout', error as Error);
      throw new InternalServerErrorException('Error al cerrar sesion');
    }
  }

  /**
   * Summary: Endpoint GET /auth/me. Sondeo de sesion para el front: si el
   * JwtAuthMiddleware ha validado la cookie y poblado `req.user`, devuelve
   * los datos del usuario autenticado (sub, email, rol). Si no hay sesion
   * valida, el middleware ya habria respondido con 401 antes de llegar aqui.
   *
   * Parameters:
   *   * req: AuthenticatedRequest — request con `user` poblado por el
   *          middleware JWT (se asume presente: `req.user!`).
   *
   * Return: MeResponse — ResponseApi con el JwtPayload del usuario actual.
   */
  @Get('me')
  @HttpCode(HttpStatus.OK)
  me(@Req() req: AuthenticatedRequest): MeResponse {
    try {
      const { sub, email, rol } = req.user!;

      return {
        codigo: HttpStatus.OK,
        message: 'OK',
        status: true,
        output: { sub, email, rol },
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Fallo inesperado en /auth/me', error as Error);
      throw new InternalServerErrorException('Error al obtener la sesion');
    }
  }
}
