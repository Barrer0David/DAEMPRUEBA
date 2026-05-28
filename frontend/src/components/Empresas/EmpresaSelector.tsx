import { useEffect, useState } from 'react';
import type { Empresa, FreshnessStatus } from '../../types';
import { servicioBackend } from '../../services/ServicioBackend';
import { mostrarErrorMantenimiento } from '../../utils/notificaciones';
import type { EmpresaSelectorProps } from './Interfaces.Empresas/Interfaces.Empresas';

/**
 * Summary: Clasifica el grado de actualizacion de una empresa segun cuanto
 * tiempo ha pasado desde su ultima sincronizacion con el ERP. Devuelve
 * 'ok' si la diferencia es menor a 5 min, 'warning' si esta entre 5 y 30
 * min, y 'stale' a partir de 30 min.
 *
 * Parameters:
 *   * ultima_sync: string — fecha ISO 8601 de la ultima sincronizacion.
 *
 * Return: FreshnessStatus — etiqueta semantica del estado de frescura.
 */
function getFreshness(ultima_sync: string): FreshnessStatus {
  const diff = (Date.now() - new Date(ultima_sync).getTime()) / 1000 / 60;
  if (diff < 5) return 'ok';
  if (diff < 30) return 'warning';
  return 'stale';
}

// Mapa de estado de frescura -> clases Tailwind del badge. Se mantiene
// como Record para que el compilador exija cubrir todos los valores
// del union type FreshnessStatus.
const freshnessColor: Record<FreshnessStatus, string> = {
  ok: 'bg-green-100 text-green-800 border-green-300',
  warning: 'bg-amber-100 text-amber-800 border-amber-300',
  stale: 'bg-red-100 text-red-800 border-red-300',
};

// Mapa de estado de frescura -> texto visible para el usuario.
const freshnessLabel: Record<FreshnessStatus, string> = {
  ok: 'Actualizado',
  warning: 'Con retraso',
  stale: 'Desactualizado',
};

/**
 * Summary: Selector visual de empresa. Al montar carga la primera pagina
 * de empresas activas desde el backend y pinta una grid de tarjetas con
 * nombre, NIF, programa contable y un badge de frescura. Cuando el usuario
 * pulsa una tarjeta, notifica la seleccion al padre con `onSelect`.
 *
 * Parameters:
 *   * onSelect: (empresa: Empresa) => void — callback que recibe el padre
 *               con la empresa elegida.
 *
 * Return: ReactNode — JSX del listado (skeleton mientras carga, alerta
 *         si hay error, o grid de tarjetas).
 */
export function EmpresaSelector({ onSelect }: EmpresaSelectorProps) {
  // empresas: catalogo cargado del backend que alimenta la grid.
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  // loading: controla la fase inicial (skeleton) hasta tener respuesta.
  const [loading, setLoading] = useState(true);
  // error: si la carga falla, guarda el mensaje a mostrar en pantalla.
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    /**
     * Summary: Carga el catalogo de empresas via servicioBackend.getEmpresas.
     * En caso de exito vuelca el array en `empresas`; ante error guarda el
     * mensaje y dispara el popup global de mantenimiento. El bloque finally
     * libera el flag de loading pase lo que pase.
     *
     * Parameters: (ninguno)
     * Return: Promise<void>
     */
    async function cargarEmpresas(): Promise<void> {
      try {
        const { items } = await servicioBackend.getEmpresas();
        setEmpresas(items);
      } catch (err: unknown) {
        const mensaje = err instanceof Error ? err.message : 'Error desconocido';
        setError(mensaje);
        void mostrarErrorMantenimiento();
      } finally {
        setLoading(false);
      }
    }
    void cargarEmpresas();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-28 animate-pulse rounded-lg bg-gray-200" />
        ))}
      </div>
    );
  }

  if (error !== null) {
    return (
      <div
        role="alert"
        className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-800"
      >
        <p className="font-semibold">No se pudieron cargar las empresas</p>
        <p className="mt-1 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {empresas.map(empresa => {
        const freshness = getFreshness(empresa.ultima_sync);
        return (
          <button
            key={empresa.id}
            onClick={() => onSelect(empresa)}
            className="rounded-lg border p-4 text-left shadow-sm transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-gray-900">{empresa.nombre}</p>
                <p className="text-sm text-gray-500">{empresa.nif}</p>
                <span className="mt-1 inline-block rounded px-2 py-0.5 text-xs font-medium text-blue-700 bg-blue-100">
                  {empresa.programa}
                </span>
              </div>
              <span className={`rounded border px-2 py-0.5 text-xs font-medium ${freshnessColor[freshness]}`}>
                {freshnessLabel[freshness]}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
