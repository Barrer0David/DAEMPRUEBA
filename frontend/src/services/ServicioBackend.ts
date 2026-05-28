import type { PaginatedEmpresas, ResumenFinanciero, SesionUsuario } from '../types';

// URL base del backend. Se toma de la variable de entorno de Vite y, si
// no esta definida, se cae al servidor de desarrollo local.
const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

// Forma estandar que devuelven los endpoints "boolean" del backend
// (login, logout, etc.). Sirve solo como tipo de retorno.
interface RespuestaOk {
  ok: boolean;
}

// Sobre estandar de las respuestas del backend (mirror de la ResponseApi
// del lado server). `output` contiene el payload util tipado por endpoint.
interface ResponseApi<T> {
  codigo: number;
  message: string;
  status: boolean;
  output?: T;
}

/**
 * Summary: Error tipado para fallos HTTP. Anade el codigo de estado al
 * mensaje para que los callers puedan diferenciar 401, 404, etc., sin
 * tener que parsear la cadena de error.
 *
 * Parameters:
 *   * status: number — codigo HTTP (0 si fue fallo de red antes de llegar
 *             a tener respuesta).
 *   * message: string — descripcion legible del error.
 */
export class ErrorHttp extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'ErrorHttp';
  }
}

class ServicioBackend {
  // baseUrl: URL absoluta del backend. Inmutable tras la construccion.
  private readonly baseUrl: string;
  // onUnauthorized: callback registrado por la app para que, ante un 401,
  // se ejecute la limpieza de estado (volver al login). Es opcional.
  private onUnauthorized: (() => void) | null = null;

  constructor(baseUrl: string = BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Summary: Registra el handler que se invocara automaticamente cuando
   * cualquier peticion reciba un 401 del backend. Centraliza en un unico
   * punto la respuesta a "sesion caducada" para no repetirla en cada caller.
   *
   * Parameters:
   *   * handler: () => void — funcion a ejecutar ante un 401.
   *
   * Return: void
   */
  setOnUnauthorized(handler: () => void): void {
    this.onUnauthorized = handler;
  }

  /**
   * Summary: Wrapper privado sobre fetch que centraliza la logica comun de
   * todas las llamadas al backend: cabecera Content-Type para bodies JSON,
   * envio de cookies (`credentials: include`), normalizacion de errores en
   * ErrorHttp, disparo del callback de 401 y unwrapping del campo `output`
   * de la ResponseApi.
   *
   * Parameters:
   *   * path: string — ruta relativa al baseUrl (ej. "/auth/login").
   *   * options: RequestInit — opciones nativas de fetch (metodo, body...).
   *
   * Return: Promise<T> — el contenido de `output` ya tipado, o undefined
   *         para respuestas 204 / vacias.
   */
  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers);
    if (options.body) headers.set('Content-Type', 'application/json');

    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}${path}`, {
        ...options,
        headers,
        credentials: 'include',
      });
    } catch (err: unknown) {
      throw new ErrorHttp(0, err instanceof Error ? err.message : 'Error de red');
    }

    if (!res.ok) {
      const message = await this.extraerMensajeError(res);
      if (res.status === 401 && this.onUnauthorized) {
        this.onUnauthorized();
      }
      throw new ErrorHttp(res.status, message);
    }

    if (res.status === 204 || res.headers.get('content-length') === '0') {
      return undefined as T;
    }

    const json = (await res.json()) as ResponseApi<T>;
    if (json.status === false) {
      throw new ErrorHttp(json.codigo, json.message);
    }
    return json.output as T;
  }

  /**
   * Summary: Intenta extraer un mensaje legible del body de una respuesta
   * de error. Espera la forma { message: string }; si el body no es JSON
   * valido o no trae `message`, devuelve un mensaje generico con el codigo.
   *
   * Parameters:
   *   * res: Response — respuesta HTTP con status != 2xx ya recibida.
   *
   * Return: Promise<string> — mensaje a propagar al usuario.
   */
  private async extraerMensajeError(res: Response): Promise<string> {
    try {
      const data: unknown = await res.json();
      if (
        data && typeof data === 'object' &&
        'message' in data && typeof (data as { message: unknown }).message === 'string'
      ) {
        return (data as { message: string }).message;
      }
    } catch (err: unknown) {
      console.warn(`No se pudo parsear el cuerpo del error HTTP ${res.status} como JSON`, err);
    }
    return `Error ${res.status}`;
  }

  /**
   * Summary: Inicia sesion contra POST /auth/login. El backend fija la
   * cookie httpOnly Token_jwt; el frontend solo necesita saber que la
   * peticion fue OK.
   *
   * Parameters:
   *   * email: string — email del usuario.
   *   * password: string — contrasena en claro (viaja sobre HTTPS).
   *
   * Return: Promise<RespuestaOk> — `{ ok: true }` si el login fue valido.
   */
  async login(email: string, password: string): Promise<RespuestaOk> {
    return this.request<RespuestaOk>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  /**
   * Summary: Cierra la sesion contra POST /auth/logout. El backend limpia
   * la cookie del lado servidor; siempre es idempotente, da igual si habia
   * sesion previa.
   *
   * Parameters: (ninguno)
   *
   * Return: Promise<RespuestaOk> — `{ ok: true }` al completar.
   */
  logout(): Promise<RespuestaOk> {
    return this.request<RespuestaOk>('/auth/logout', { method: 'POST' });
  }

  /**
   * Summary: Sondea GET /auth/me para saber si la cookie del navegador
   * sigue siendo valida. Lo usa la app al arrancar para decidir si pintar
   * el portal o redirigir al login.
   *
   * Parameters: (ninguno)
   *
   * Return: Promise<SesionUsuario> — payload del JWT decodificado por el
   *         backend (sub, email, rol).
   */
  me(): Promise<SesionUsuario> {
    return this.request<SesionUsuario>('/auth/me');
  }

  /**
   * Summary: Obtiene la pagina de empresas activas via GET /empresas.
   *
   * Parameters:
   *   * page: number — pagina solicitada (1-indexada). Default: 1.
   *   * limit: number — empresas por pagina (max 100 segun backend).
   *                     Default: 20.
   *
   * Return: Promise<PaginatedEmpresas> — items + metadata de paginacion.
   */
  getEmpresas(page = 1, limit = 20): Promise<PaginatedEmpresas> {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    return this.request<PaginatedEmpresas>(`/empresas?${params}`);
  }

  /**
   * Summary: Obtiene el resumen financiero de una empresa para un
   * ejercicio y mes concretos via GET /empresas/:id/resumen.
   *
   * Parameters:
   *   * empresaId: string — UUID de la empresa.
   *   * ejercicio: number — ano contable (2000-2100).
   *   * mes: number — mes del ejercicio (1-12).
   *
   * Return: Promise<ResumenFinanciero> — totales de ingresos, gastos y
   *         resultado neto del mes.
   */
  getResumen(
    empresaId: string,
    ejercicio: number,
    mes: number,
  ): Promise<ResumenFinanciero> {
    const params = new URLSearchParams({
      ejercicio: String(ejercicio),
      mes: String(mes),
    });
    return this.request<ResumenFinanciero>(
      `/empresas/${empresaId}/resumen?${params}`,
    );
  }
}

export const servicioBackend = new ServicioBackend();
