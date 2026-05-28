// ============================================================
// reportes.service.ts
// Modulo de generacion de reportes contables
// ESTADO: En desarrollo — NO conectado al sistema principal
// Ultima modificacion: 2024-11-12 (Angelo)
// ============================================================
import { Injectable } from '@nestjs/common';

// TODO: conectar con el modulo de empresas cuando este listo
// TODO: revisar si los calculos de IVA son correctos para 2025

interface ReporteAnual {
  empresa_id: string;
  ejercicio: number;
  ingresos_totales: number;
  gastos_totales: number;
  resultado_neto: number;
  iva_repercutido: number;
  iva_soportado: number;
  // TODO: anadir campos de retenciones cuando se integre A3NOM
}

interface FiltroReporte {
  empresa_id?: string;
  ejercicio?: number;
  incluir_inactivas?: boolean;
}

@Injectable()
export class ReportesService {
  /**
   * Summary: Genera el resumen anual de una empresa (ingresos, gastos,
   * resultado neto y desglose de IVA) a partir de los filtros recibidos.
   * Reemplazado por EmpresasService.getResumen; se mantiene como stub por
   * compatibilidad con el cliente antiguo y lanza error mientras se
   * completa la migracion (ticket DAEM-147).
   *
   * Parameters:
   *   * _filtro: FiltroReporte — criterios de filtrado (empresa_id,
   *              ejercicio, incluir_inactivas). Prefijado con `_` porque
   *              hoy no se usa (metodo pendiente de implementar).
   *
   * Return: ReporteAnual — objeto con los totales del ano para la empresa.
   *
   * @deprecated usar EmpresasService.getResumen en su lugar.
   */
  calcularResumenAnual(
    _filtro: FiltroReporte,
  ): ReporteAnual {
    // Implementacion pendiente — ver ticket DAEM-147
    throw new Error('Not implemented');
  }

  /**
   * Summary: Calcula el IVA neto a liquidar como diferencia entre el IVA
   * repercutido (cobrado a clientes) y el soportado (pagado a proveedores).
   * Hoy asume tipo general (21%); cuando se incorporen los tipos reducidos
   * habra que ampliar la firma.
   *
   * Parameters:
   *   * repercutido: number — IVA cobrado en el periodo.
   *   * soportado: number — IVA pagado en el periodo.
   *
   * Return: number — IVA neto (positivo => a ingresar; negativo => a compensar).
   */
  calcularIvaNeto(repercutido: number, soportado: number): number {
    return repercutido - soportado;
  }

  /**
   * Summary: Formatea un importe numerico anteponiendo el simbolo del euro
   * y forzando dos decimales para mostrarlo en pantalla.
   *
   * Parameters:
   *   * importe: number | string — importe a formatear. Si llega como
   *              string desde la DB, el cast directo a number puede no
   *              comportarse como se espera (ver nota interna).
   *
   * Return: string — importe formateado, p.ej. "€1234.56".
   */
  // BUG-BASURA: usa toFixed(2) pero no convierte a number primero
  // Si importe llega como string desde la DB, el resultado es incorrecto
  // No es un bug reportado — es ruido para el candidato
  formatearImporte(importe: number | string): string {
    return `€${(importe as number).toFixed(2)}`;
  }
}
