import { Component, type ErrorInfo } from 'react';
import { mostrarErrorMantenimiento } from '../../utils/notificaciones';
import type {
  ErrorBoundaryProps,
  ErrorBoundaryState,
} from './Interfaces.ErrorBoundary/Interfaces.ErrorBoundary';

/**
 * Summary: Error boundary global de la aplicacion. Envuelve al arbol de
 * React y, si cualquier componente hijo lanza durante el render, conmuta
 * a un estado de fallo: pinta el fallback recibido por prop (o uno por
 * defecto), loguea en consola y muestra el popup de mantenimiento.
 *
 * Parameters (props):
 *   * children: ReactNode — arbol de componentes a proteger.
 *   * fallback?: ReactNode — UI alternativa opcional para estado de error.
 *
 * Return: ReactNode — children en estado sano, fallback en estado de error.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // hayError arranca en false; cuando React detecta una excepcion en el
  // arbol, getDerivedStateFromError lo conmuta a true para forzar el fallback.
  state: ErrorBoundaryState = { hayError: false };

  /**
   * Summary: Hook estatico de React que se ejecuta cuando un hijo lanza
   * durante el render. Devuelve el nuevo state para activar el fallback.
   *
   * Parameters: (React le pasa el error; aqui no se usa porque solo nos
   *              importa cambiar el flag).
   * Return: ErrorBoundaryState — { hayError: true }.
   */
  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hayError: true };
  }

  /**
   * Summary: Hook de React que recibe el error capturado junto con el
   * stack del componente que fallo. Lo usamos para dejar la traza en
   * consola y avisar al usuario con el popup global de mantenimiento.
   *
   * Parameters:
   *   * error: Error — excepcion lanzada por algun hijo.
   *   * info: ErrorInfo — info adicional de React (incluye componentStack).
   *
   * Return: void
   */
  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info.componentStack);
    void mostrarErrorMantenimiento();
  }

  /**
   * Summary: Render del boundary. Si hubo error, devuelve el fallback (el
   * que venga por props o, por defecto, una pantalla de soporte). Si no,
   * renderiza los hijos tal cual.
   *
   * Parameters: (usa this.state y this.props)
   * Return: ReactNode — children o fallback.
   */
  render() {
    if (this.state.hayError) {
      return this.props.fallback ?? (
        <div className="flex min-h-screen items-center justify-center p-6 text-center">
          <p className="text-sm text-gray-600">
            Ha ocurrido un error inesperado. Por favor, contacta a soporte. Extension: 123 - prueba.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
