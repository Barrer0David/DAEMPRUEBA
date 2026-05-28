import {
  Controller,
  Get,
  Param,
  Query,
  HttpStatus,
  HttpException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { EmpresasService } from '../services/empresas/empresas.service';
import {
  FindAllEmpresasResponse,
  GetResumenResponse,
} from './interfaces.routes/interfaces.routes';
import {
  PaginationQueryDto,
  ResumenQueryDto,
} from './dtos.route/dtos.route';

@Controller('empresas')
export class EmpresasController {
  // Logger nominado para identificar en consola las trazas del controller.
  private readonly logger = new Logger('EmpresasController');

  constructor(private empresasService: EmpresasService) {}

  /**
   * Summary: Endpoint GET /empresas?page=N&limit=M. Devuelve la pagina de
   * empresas activas solicitada. Si el cliente no manda los parametros,
   * usa defaults (page=1, limit=20). La validacion de rango la hace el
   * ValidationPipe global a partir de PaginationQueryDto.
   *
   * Parameters:
   *   * query: PaginationQueryDto — query string con `page` y `limit`
   *            opcionales, ya validados (page >= 1, 1 <= limit <= 100).
   *
   * Return: Promise<FindAllEmpresasResponse> — ResponseApi cuyo `output`
   *         contiene la pagina + metadata de paginacion.
   */
  @Get()
  async findAll(@Query() query: PaginationQueryDto): Promise<FindAllEmpresasResponse> {
    try {
      const page = query.page ?? 1;
      const limit = query.limit ?? 20;

      const paginated = await this.empresasService.findAll(page, limit);

      return {
        codigo: HttpStatus.OK,
        message: 'OK',
        status: true,
        output: paginated,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Fallo inesperado en findAll', error as Error);
      throw new InternalServerErrorException('Error al obtener empresas');
    }
  }

  /**
   * Summary: Endpoint GET /empresas/:id/resumen?ejercicio=YYYY&mes=MM.
   * Devuelve el resumen financiero (ingresos, gastos y resultado) de una
   * empresa en un mes concreto. Si el cliente no envia ejercicio/mes, usa
   * el ejercicio y mes actuales del servidor.
   *
   * Codigos de respuesta:
   *   - 200: exito (resumen del mes).
   *   - 400: query invalido (mes fuera de 1-12, ejercicio fuera de rango...).
   *   - 404: empresa no encontrada (NotFoundException del servicio).
   *   - 500: fallo no controlado en la DB.
   *
   * Parameters:
   *   * id: string — identificador de la empresa (path param `:id`).
   *   * query: ResumenQueryDto — query string con `ejercicio` y `mes`
   *            opcionales, ya validados por el ValidationPipe.
   *
   * Return: Promise<GetResumenResponse> — ResponseApi cuyo `output` es el
   *         ResumenFinanciero calculado.
   */
  @Get(':id/resumen')
  async getResumen(
    @Param('id') id: string,
    @Query() query: ResumenQueryDto,
  ): Promise<GetResumenResponse> {
    try {
      // Si el cliente no manda ejercicio/mes, usamos los del momento.
      // La validacion de rango ya la hizo el ValidationPipe sobre el DTO.
      const now = new Date();
      const ejercicio = query.ejercicio ?? now.getFullYear();
      const mes = query.mes ?? now.getMonth() + 1;

      const resumen = await this.empresasService.getResumen(id, ejercicio, mes);

      return {
        codigo: HttpStatus.OK,
        message: 'OK',
        status: true,
        output: resumen,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Fallo inesperado en getResumen', error as Error);
      throw new InternalServerErrorException(
        'Error al obtener el resumen financiero',
      );
    }
  }
}
