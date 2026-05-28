import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import cookieParser = require('cookie-parser');

/**
 * Summary: Punto de entrada de la aplicacion. Construye la instancia Nest
 * a partir de AppModule, registra los middlewares globales (cookie-parser,
 * CORS, ValidationPipe) y arranca el servidor HTTP en el puerto 3000.
 * Si el arranque falla, registra el error y termina el proceso con codigo 1
 * para que el orquestador (PM2, Docker, etc.) lo reinicie limpio.
 *
 * Parameters: (ninguno)
 *
 * Return: Promise<void> — resuelve cuando el servidor queda escuchando.
 */
async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule);

    app.use(cookieParser());

    app.enableCors({
      origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
      credentials: true,
    });

    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.listen(3000);
    console.log('Backend corriendo en http://localhost:3000');
  } catch (error) {
    // Fallo de arranque (puerto ocupado, DB inaccesible al cargar modulos, etc.)
    // Logueamos y matamos el proceso para que el orquestador lo reinicie en vez
    // de quedarnos con la app a medio levantar.
    Logger.error('Fallo al arrancar el backend', error as Error, 'Bootstrap');
    process.exit(1);
  }
}
bootstrap();
