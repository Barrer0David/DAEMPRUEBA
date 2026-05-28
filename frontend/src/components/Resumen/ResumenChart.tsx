import { useState } from 'react';
import type { ResumenChartProps } from './Interfaces.Resumen/Interfaces.Resumen';

/**
 * Summary: Componente de grafico de barras (CSS puro) que muestra la
 * evolucion mensual de ingresos y gastos. Por cada elemento de `datos`
 * pinta dos barras (una azul para ingresos, otra roja para gastos)
 * escaladas al maximo valor del conjunto. Al hacer click sobre un mes,
 * se memoriza su seleccion (toggleable) en estado local.
 *
 * Parameters:
 *   * datos: ResumenFinanciero[] — resumenes mensuales a representar.
 *
 * Return: ReactNode — JSX del grafico de barras.
 */
export function ResumenChart({ datos }: ResumenChartProps) {
  // mesSeleccionado: ultimo mes en el que el usuario hizo click. Se usa
  // para resaltar la barra activa (toggle: clicar el mismo mes lo deselecciona).
  const [mesSeleccionado, setMesSeleccionado] = useState<number | null>(null);

  // maxValor: maximo absoluto entre todos los ingresos y gastos. Sirve
  // como denominador al calcular el alto porcentual de cada barra. Se
  // fuerza un minimo de 1 para no dividir por 0 cuando todos los importes son 0.
  const maxValor = Math.max(
    1,
    ...datos.flatMap(d => [d.total_ingresos, d.total_gastos]),
  );

  return (
    <div className="rounded-lg border p-4">
      <h3 className="mb-4 text-sm font-semibold text-gray-700">
        Evolucion mensual
      </h3>
      <div className="flex items-end gap-2" style={{ height: 120 }}>
        {datos.map(d => (
          <div
            key={d.mes}
            className="flex flex-1 flex-col items-center gap-1 cursor-pointer"
            onClick={() => setMesSeleccionado(d.mes === mesSeleccionado ? null : d.mes)}
          >
            <div className="flex w-full gap-0.5" style={{ height: 100 }}>
              <div
                className="flex-1 rounded-t bg-blue-400"
                style={{ height: `${(d.total_ingresos / maxValor) * 100}%`, alignSelf: 'flex-end' }}
              />
              <div
                className="flex-1 rounded-t bg-red-300"
                style={{ height: `${(d.total_gastos / maxValor) * 100}%`, alignSelf: 'flex-end' }}
              />
            </div>
            <span className="text-xs text-gray-500">{d.mes}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
