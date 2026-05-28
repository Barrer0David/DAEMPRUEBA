// ============================================================
// logger.middleware.ts
// Middleware de logging de requests HTTP
// ============================================================
import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  // Logger nominado: agrupa en consola todas las trazas HTTP del backend.
  private logger = new Logger('HTTP');

  /**
   * Summary: Middleware de logging HTTP. Anota el instante de entrada de la
   * peticion y, cuando la respuesta termina, escribe una linea con metodo,
   * URL, status, duracion (ms), IP y user-agent. El nivel del log (log/warn/
   * error) depende del codigo de estado de la respuesta.
   *
   * Parameters:
   *   * req: Request — request entrante; se leen metodo, URL, IP y UA.
   *   * res: Response — response saliente; se suscribe a `finish` y `error`
   *          para emitir el log cuando termina el ciclo.
   *   * next: NextFunction — callback que continua la cadena de middlewares.
   *
   * Return: void
   */
  use(req: Request, res: Response, next: NextFunction): void {
    // Marca de tiempo de entrada de la peticion; sirve para calcular la
    // duracion total una vez la respuesta dispara el evento `finish`.
    const start = Date.now();
    const { method, originalUrl, ip } = req;
    const userAgent = req.get('user-agent') ?? '';

    res.on('finish', () => {
      try {
        const { statusCode } = res;
        const duration = Date.now() - start;
        const line = `${method} ${originalUrl} ${statusCode} ${duration}ms — ${ip} — ${userAgent}`;

        if (statusCode >= 500) {
          this.logger.error(line);
        } else if (statusCode >= 400) {
          this.logger.warn(line);
        } else {
          this.logger.log(line);
        }
      } catch (err) {
        this.logger.error(
          `Fallo al loggear request ${method} ${originalUrl}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    });

    res.on('error', (err) => {
      this.logger.error(
        `Error en respuesta ${method} ${originalUrl}: ${err.message}`,
      );
    });

    try {
      next();
    } catch (err) {
      this.logger.error(
        `Error sincrono en pipeline ${method} ${originalUrl}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      throw err;
    }
  }
}
