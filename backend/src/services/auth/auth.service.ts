import {
  Injectable,
  Inject,
  UnauthorizedException,
  InternalServerErrorException,
  HttpException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import { PG_POOL } from '../../common/db.module';

// Forma de cada fila de la tabla `usuarios` tal y como la consume este
// servicio. No se exporta porque es un detalle interno de AuthService.
interface UsuarioRow {
  id: number;
  email: string;
  password_hash: string;
  rol: string;
}

@Injectable()
export class AuthService {
  // Logger nominado para distinguir las trazas del servicio de auth en consola.
  private readonly logger = new Logger('AuthService');

  constructor(
    private jwtService: JwtService,
    @Inject(PG_POOL) private pool: Pool,
  ) {}

  /**
   * Summary: Autentica un usuario por email + password contra la tabla
   * `usuarios` y devuelve un access token JWT firmado con la informacion
   * minima necesaria (id, email y rol). Si las credenciales son incorrectas
   * lanza UnauthorizedException (401); cualquier otro fallo (DB caida,
   * error firmando el token) se convierte en InternalServerErrorException (500).
   *
   * Parameters:
   *   * email: string — correo electronico introducido por el usuario.
   *   * password: string — contrasena en claro recibida del frontend
   *                        (viaja sobre HTTPS).
   *
   * Return: Promise<{ access_token: string }> — objeto con el JWT listo
   *         para ser fijado en la cookie httpOnly por el controller.
   */
  async login(email: string, password: string): Promise<{ access_token: string }> {
    try {
      // `password` viene en claro desde el front (sobre HTTPS) y se compara
      // contra el valor guardado en `usuarios.password_hash`.
      const result = await this.pool.query<UsuarioRow>(
        'SELECT id, email, password_hash, rol FROM usuarios WHERE email = $1',
        [email],
      );

      const usuario = result.rows[0];
      if (!usuario || !(await bcrypt.compare(password, usuario.password_hash))) {
        throw new UnauthorizedException('Credenciales incorrectas');
      }

      const payload = {
        sub: usuario.id,
        email: usuario.email,
        rol: usuario.rol,
      };

      return { access_token: this.jwtService.sign(payload) };
    } catch (error) {
      // HTTP ya tipadas (401 de credenciales) se relanzan tal cual.
      if (error instanceof HttpException) throw error;

      // Cualquier otra cosa (DB caida, fallo firmando el JWT, etc.) -> 500.
      this.logger.error('Fallo en login', error as Error);
      throw new InternalServerErrorException('Error al iniciar sesion');
    }
  }
}
