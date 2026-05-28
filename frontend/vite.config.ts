// Andamiaje anadido para arrancar el frontend (no venia en el zip original).
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // expone el server dentro del contenedor Docker
    port: 5173,
    strictPort: true,
  },
});
