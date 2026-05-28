// No forma parte de los bugs evaluados.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary/ErrorBoundary';
import './index.css';

/**
 * Summary: Punto de entrada del frontend. Localiza el contenedor `#root`
 * del index.html, monta sobre el la aplicacion envuelta en un ErrorBoundary
 * (para capturar errores de render) y en StrictMode (para detectar efectos
 * y patrones obsoletos en desarrollo). Si el contenedor no existe, aborta
 * con error explicito en vez de fallar silenciosamente.
 */
const container = document.getElementById('root');
if (!container) {
  throw new Error('No se encontro el elemento #root en index.html');
}

createRoot(container).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
