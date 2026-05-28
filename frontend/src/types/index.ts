export type Programa = 'A3ECO' | 'A3NOM' | 'A3GES';

export interface Empresa {
  id: string;
  nombre: string;
  nif: string;
  programa: Programa;
  activa: boolean;
  ultima_sync: string;
}

export interface ResumenFinanciero {
  empresa_id: string;
  ejercicio: number;
  mes: number;
  total_ingresos: number;
  total_gastos: number;
  resultado: number;
}

export type FreshnessStatus = 'ok' | 'warning' | 'stale';

export interface SesionUsuario {
  sub: number;
  email: string;
  rol: string;
}

export interface PaginatedEmpresas {
  items: Empresa[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
