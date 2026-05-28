import {
  Injectable,
  Inject,
  NotFoundException,
  InternalServerErrorException,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../common/db.module';
import {
  Empresa,
  PaginatedEmpresas,
  ResumenFinanciero,
} from './interfaces.empresas/interfaces.empresas';

@Injectable()
export class EmpresasService {
  // Logger nominado: identifica en consola las trazas del servicio de empresas.
  private readonly logger = new Logger('EmpresasService');

  constructor(@Inject(PG_POOL) private pool: Pool) {}


  /**
   * Summary: Devuelve una pagina de empresas activas (activa = true) ordenadas
   * por nombre, junto con la metadata de paginacion (total, totalPages, etc.).
   * Lanza la consulta de COUNT y la de datos en paralelo para minimizar el
   * tiempo total contra la base de datos.
   *
   * Parameters:
   *   * page: number — pagina solicitada (1-indexada).
   *   * limit: number — numero maximo de empresas a devolver en la pagina.
   *
   * Return: Promise<PaginatedEmpresas> — objeto con `items`, `total`, `page`,
   *         `limit` y `totalPages` para que el front pinte la paginacion.
   */
  async findAll(page: number, limit: number): Promise<PaginatedEmpresas> {
    try {
      const offset = (page - 1) * limit;

      const [countResult, dataResult] = await Promise.all([
        this.pool.query<{ total: string }>(
          `SELECT COUNT(*) AS total FROM empresas WHERE activa = true`,
        ),
        this.pool.query<Empresa>(
          `SELECT id, nombre, nif, programa, activa, ultima_sync
           FROM empresas
           WHERE activa = true
           ORDER BY nombre
           LIMIT $1 OFFSET $2`,
          [limit, offset],
        ),
      ]);

      const total = parseInt(countResult.rows[0].total, 10);

      return {
        items: dataResult.rows,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Fallo en findAll', error as Error);
      throw new InternalServerErrorException('Error al obtener empresas');
    }
  }

  /**
   * Summary: Calcula el resumen financiero (ingresos, gastos y resultado neto)
   * de una empresa para un ejercicio y mes concretos, agregando los apuntes
   * por `tipo` en la tabla `apuntes`. Antes de agregar comprueba que la
   * empresa exista en la base; si no, lanza NotFoundException (404).
   *
   * Parameters:
   *   * empresaId: string — identificador (UUID) de la empresa.
   *   * ejercicio: number — ano contable a consultar (p.ej. 2025).
   *   * mes: number — mes del ejercicio (1-12).
   *
   * Return: Promise<ResumenFinanciero> — objeto con `total_ingresos`,
   *         `total_gastos`, `resultado` y los datos de contexto
   *         (empresa_id, ejercicio, mes).
   */
  async getResumen(
    empresaId: string,
    ejercicio: number,
    mes: number,
  ): Promise<ResumenFinanciero> {
    try {
      const empresaResult = await this.pool.query(
        'SELECT id FROM empresas WHERE id = $1',
        [empresaId],
      );

      if (empresaResult.rows.length === 0) {
        throw new NotFoundException(`Empresa ${empresaId} no encontrada`);
      }

      const result = await this.pool.query<{ tipo: string; total: string }>(
        `SELECT
          tipo,
          SUM(importe) as total
        FROM apuntes
        WHERE empresa_id = $1
          AND ejercicio = $2
          AND mes = $3
        GROUP BY tipo`,
        [empresaId, ejercicio, mes],
      );

      // Acumuladores locales: empiezan en 0 para devolver el resumen aunque
      // alguno de los tipos (INGRESO/GASTO) no tenga filas en el mes pedido.
      let total_ingresos = 0;
      let total_gastos = 0;

      for (const row of result.rows) {
        if (row.tipo === 'INGRESO') total_ingresos = parseFloat(row.total);
        if (row.tipo === 'GASTO') total_gastos = parseFloat(row.total);
      }

      return {
        empresa_id: empresaId,
        ejercicio,
        mes,
        total_ingresos,
        total_gastos,
        resultado: total_ingresos - total_gastos,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;

      this.logger.error('Fallo en getResumen', error as Error);
      throw new InternalServerErrorException('Error al obtener el resumen financiero',);
    }
  }
}
