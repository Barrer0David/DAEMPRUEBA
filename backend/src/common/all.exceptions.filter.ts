// ============================================================
// all-exceptions.filter.ts
// Captura CUALQUIER excepcion y la devuelve con el formato estandar
// ResponseApi. Centraliza el manejo de errores de toda la API y evita
// fugas de stack/detalles internos al cliente (OWASP A09).
// Se registra de forma global en AppModule (APP_FILTER).
// ============================================================
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ResponseApi } from '../routes/interfaces.routes/interfaces.routes';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  // Logger nominado: agrupa en consola todas las trazas que escupe el filter,
  // de modo que sea facil distinguirlas del logging HTTP o de los servicios.
  private readonly logger = new Logger('ExceptionFilter');

  /**
   * Summary: Manejador global de errores. Intercepta cualquier excepcion
   * lanzada en controllers, servicios o middleware y la transforma en una
   * respuesta JSON con el formato estandar ResponseApi, evitando que se
   * filtren stacks/detalles internos al cliente.
   *
   * Parameters:
   *   * exception: unknown — excepcion capturada (HttpException o cualquier
   *                otro Error/valor lanzado).
   *   * host: ArgumentsHost — contexto de ejecucion proporcionado por Nest;
   *           se usa para acceder a la Request y Response de Express.
   *
   * Return: void — escribe directamente sobre la Response (status + JSON).
   */
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const codigo =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = this.resolveMessage(exception, codigo);

    this.logger.error(
      `${req.method} ${req.originalUrl} -> ${codigo}: ${message}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    const body: ResponseApi = {
      codigo,
      message,
      status: false,
    };

    res.status(codigo).json(body);
  }

  /**
   * Summary: Resuelve un mensaje legible y seguro para el cliente a partir
   * de una excepcion arbitraria. Para HttpException extrae el mensaje del
   * body de respuesta; para errores no controlados (500) devuelve siempre
   * un texto generico para no filtrar detalles internos.
   *
   * Parameters:
   *   * exception: unknown — la excepcion capturada por el filter.
   *   * codigo: number — codigo HTTP ya calculado; se usa para decidir si
   *             ocultar el detalle (caso 500).
   *
   * Return: string — mensaje que se devolvera en el campo `message` del
   *         ResponseApi.
   */
  private resolveMessage(exception: unknown, codigo: number): string {
    if (exception instanceof HttpException) {
      const resBody = exception.getResponse();

      if (typeof resBody === 'string') {
        return resBody;
      }

      if (typeof resBody === 'object' && resBody !== null) {
        const msg = (resBody as { message?: unknown }).message;
        // ValidationPipe devuelve un array de mensajes
        if (Array.isArray(msg)) return msg.join(', ');
        if (typeof msg === 'string') return msg;
      }

      return exception.message;
    }

    // Errores no controlados (500): nunca exponer el detalle real.
    return codigo === HttpStatus.INTERNAL_SERVER_ERROR
      ? 'Error interno del servidor'
      : 'Error';
  }
}
