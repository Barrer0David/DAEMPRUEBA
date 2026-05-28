// Solo conecta los componentes existentes; NO corrige los bugs reportados.
import { useState, useEffect, useRef, type FormEvent } from 'react';
import type { Empresa, ResumenFinanciero } from './types';
import { servicioBackend } from './services/ServicioBackend';
import { EmpresaSelector } from './components/Empresas/EmpresaSelector';
import { ResumenChart } from './components/Resumen/ResumenChart';
import { mostrarErrorMantenimiento } from './utils/notificaciones';

interface LoginScreenProps {
  onLogin: () => void;
}

/**
 * Summary: Pantalla de login. Renderiza el formulario de credenciales y,
 * al enviarlo, delega en servicioBackend.login. Si el backend responde
 * correctamente, notifica al padre via onLogin; en caso contrario muestra
 * el mensaje de error y desbloquea el boton.
 *
 * Parameters:
 *   * onLogin: () => void — callback que el padre usa para marcar el estado
 *              autenticado y entrar al portal.
 *
 * Return: ReactNode — JSX del formulario de login.
 */
function LoginScreen({ onLogin }: LoginScreenProps) {
  // email / password: estado controlado de los inputs. Vacios al montar
  // para no exponer credenciales demo en el codigo.
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // error: mensaje a mostrar bajo el formulario cuando el login falla.
  const [error, setError] = useState<string | null>(null);
  // loading: deshabilita el boton mientras se espera respuesta del backend.
  const [loading, setLoading] = useState(false);

  /**
   * Summary: Handler del submit del formulario. Evita el reload por defecto,
   * llama al backend con email + password y, segun el resultado, propaga el
   * login al padre o pinta el error en pantalla. El bloque finally garantiza
   * que el flag `loading` se libere aunque haya excepcion.
   *
   * Parameters:
   *   * event: FormEvent<HTMLFormElement> — evento de submit nativo.
   *
   * Return: Promise<void>
   */
  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    try {
      event.preventDefault();
      setLoading(true);
      setError(null);
      await servicioBackend.login(email, password);
      onLogin();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg border bg-white p-6 shadow-sm"
      >
        <h1 className="mb-4 text-lg font-bold text-gray-900">Portal DAEM</h1>

        <label className="mb-1 block text-sm text-gray-600">Email</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="mb-3 w-full rounded border px-3 py-2 text-sm"
        />

        <label className="mb-1 block text-sm text-gray-600">Contrasena</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="mb-4 w-full rounded border px-3 py-2 text-sm"
        />

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}

/**
 * Summary: Componente raiz de la aplicacion. Orquesta el flujo de
 * autenticacion (sondea /auth/me al montar, muestra LoginScreen si no hay
 * sesion) y la pantalla principal del portal: selector de empresa y, al
 * elegir una, el grafico con el resumen financiero de los meses 1-3 del
 * ejercicio 2024. Registra ademas el handler global de 401 en el cliente
 * HTTP para volver al login si la cookie expira.
 *
 * Parameters: (ninguno — componente de nivel raiz).
 *
 * Return: ReactNode — JSX condicional segun el estado de autenticacion.
 */
export default function App() {
  // autenticado: tri-estado de sesion. null = todavia comprobando, true =
  // hay sesion valida, false = no autenticado (mostrar LoginScreen).
  const [autenticado, setAutenticado] = useState<boolean | null>(null);
  // selected: empresa elegida por el usuario en EmpresaSelector. Cambiar
  // este valor dispara la carga del resumen financiero asociado.
  const [selected, setSelected] = useState<Empresa | null>(null);
  // datosGrafico: array de resumenes mensuales que alimenta a ResumenChart.
  const [datosGrafico, setDatosGrafico] = useState<ResumenFinanciero[]>([]);
  // resumenError: mensaje a pintar si la carga del resumen falla.
  const [resumenError, setResumenError] = useState<string | null>(null);
  // sesionVerificada: guard para evitar el doble /auth/me que dispara
  // React.StrictMode en desarrollo (monta → desmonta → vuelve a montar).
  const sesionVerificada = useRef(false);

  useEffect(() => {
    if (sesionVerificada.current) return;
    sesionVerificada.current = true;

    // Interceptor 401: si en cualquier peticion el backend devuelve 401
    // (cookie expirada, JWT invalidado, sesion cerrada desde otra pestania),
    // limpiamos el estado de auth y volvemos al login. Centraliza aqui en vez
    // de repetir la logica en cada caller.
    servicioBackend.setOnUnauthorized(() => {
      setAutenticado(false);
      setSelected(null);
    });

    /**
     * Summary: Sondeo de sesion al montar la app. Llama a /auth/me; si el
     * backend devuelve OK, marca al usuario como autenticado; si falla
     * (cookie ausente, expirada, etc.) cae al estado no autenticado para
     * que se pinte LoginScreen.
     *
     * Parameters: (ninguno)
     * Return: Promise<void>
     */
    async function verificarSesion(): Promise<void> {
      try {
        await servicioBackend.me();
        setAutenticado(true);
      } catch {
        setAutenticado(false);
      }
    }
    void verificarSesion();
  }, []);

  useEffect(() => {
    if (!selected) {
      setDatosGrafico([]);
      setResumenError(null);
      return;
    }
    const empresaId = selected.id;
    // EJERCICIO / MESES: constantes locales con el periodo que pinta el
    // grafico (hoy fijo a Q1 de 2024 mientras no haya selector temporal).
    const EJERCICIO = 2024;
    const MESES = [1, 2, 3];
    setResumenError(null);

    /**
     * Summary: Lanza en paralelo una peticion de resumen por cada mes del
     * array MESES y vuelca el resultado en `datosGrafico`. Si cualquiera
     * de las peticiones falla, guarda el mensaje de error y muestra el
     * popup de mantenimiento al usuario.
     *
     * Parameters: (ninguno — usa `empresaId`, `EJERCICIO` y `MESES` del closure)
     * Return: Promise<void>
     */
    async function cargarResumen(): Promise<void> {
      try {
        const resumenes = await Promise.all(
          MESES.map(mes => servicioBackend.getResumen(empresaId, EJERCICIO, mes)),
        );
        setDatosGrafico(resumenes);
      } catch (err: unknown) {
        const mensaje = err instanceof Error ? err.message : 'Error al cargar el resumen';
        setResumenError(mensaje);
        void mostrarErrorMantenimiento();
      }
    }
    void cargarResumen();
  }, [selected]);

  /**
   * Summary: Callback que LoginScreen invoca al autenticar correctamente
   * para que App marque la sesion como activa y pinte el portal.
   *
   * Parameters: (ninguno)
   * Return: void
   */
  function handleLogin(): void {
    setAutenticado(true);
  }

  /**
   * Summary: Cierra la sesion del usuario. Llama a /auth/logout para que el
   * backend limpie las cookies; pase lo que pase resetea el estado local
   * (autenticado=false, sin empresa seleccionada) para que la UI vuelva al
   * login aunque la peticion al backend falle.
   *
   * Parameters: (ninguno)
   * Return: Promise<void>
   */
  async function logout(): Promise<void> {
    try {
      await servicioBackend.logout();
    } catch (err: unknown) {
      console.warn('Logout fallo en el backend, limpiando UI igualmente', err);
    } finally {
      setAutenticado(false);
      setSelected(null);
    }
  }

  if (autenticado === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">Verificando sesion...</p>
      </div>
    );
  }

  if (!autenticado) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Portal DAEM — Empresas</h1>
        <button
          onClick={logout}
          className="rounded border px-3 py-1 text-sm text-gray-600 hover:bg-gray-50"
        >
          Cerrar sesion
        </button>
      </header>

      <EmpresaSelector onSelect={setSelected} />

      {selected && (
        <div className="mt-6 space-y-4">
          {resumenError && (
            <p className="text-sm text-red-600">{resumenError}</p>
          )}

          {datosGrafico.length > 0 && <ResumenChart datos={datosGrafico} />}
        </div>
      )}
    </div>
  );
}
