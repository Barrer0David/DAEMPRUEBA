import {Module, NestModule, MiddlewareConsumer, RequestMethod,} from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { EmpresasModule } from './services/empresas/empresas.module';
import { AuthModule } from './services/auth/auth.module';
import { DbModule } from './common/db.module';
import { JwtAuthMiddleware } from './middleware/jwt-auth.middleware';
import { LoggerMiddleware } from './middleware/logger.middleware';
import { AllExceptionsFilter } from './common/all.exceptions.filter';
import { RATE_LIMITS } from './common/config';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET ?? 'supersecret_dev_only',
      signOptions: { expiresIn: '8h' },
    }),
    // Rate limiting global. Una ventana unica de 1 minuto aplicada a todos
    // los endpoints. ttl en ms; el limite viene de common/config.ts.
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: RATE_LIMITS.max_requests_per_minute,
      },
    ]),
    DbModule,
    AuthModule,
    EmpresasModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule implements NestModule {
  /**
   * Summary: Registra los middlewares globales de la aplicacion.
   *   - LoggerMiddleware: se aplica a TODAS las rutas para dejar traza HTTP.
   *   - JwtAuthMiddleware: protege todas las rutas excepto login/logout
   *     (estas dos quedan publicas porque son las que inician/cierran sesion).
   *
   * Parameters:
   *   * consumer: MiddlewareConsumer — API de Nest para encadenar middlewares
   *               a patrones de rutas.
   *
   * Return: void
   */
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(LoggerMiddleware).forRoutes('*');

    consumer
      .apply(JwtAuthMiddleware)
      .exclude(
        { path: 'auth/login', method: RequestMethod.POST },
        { path: 'auth/logout', method: RequestMethod.POST },
      )
      .forRoutes('*');
  }
}
