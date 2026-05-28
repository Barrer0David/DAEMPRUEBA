// ============================================================
// interfaces.empresas.ts
// Interfaces y tipos del dominio de empresas.
// ============================================================

// Programas contables soportados por el sistema.
export type Programa = 'A3ECO' | 'A3NOM' | 'A3GES';

// Entidad principal del dominio.
export interface Empresa {
  id: string;
  nombre: string;
  nif: string;
  programa: Programa;
  activa: boolean;
  ultima_sync: string;
}

// Resumen financiero de una empresa por ejercicio y mes.
export interface ResumenFinanciero {
  empresa_id: string;
  ejercicio: number;
  mes: number;
  total_ingresos: number;
  total_gastos: number;
  resultado: number;
}

// Resultado paginado de empresas. Devuelve la pagina solicitada (`items`) +
// metadata para que el front pinte la paginacion sin recalcular nada.
export interface PaginatedEmpresas {
  items: Empresa[];
  total: number;       // total de empresas que cumplen el filtro en la DB
  page: number;        // pagina actual (1-indexada)
  limit: number;       // tamano de pagina solicitado
  totalPages: number;  // ceil(total / limit)
}
