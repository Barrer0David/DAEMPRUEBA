import { Module, Global } from '@nestjs/common';
import { Pool } from 'pg';

// Token de inyeccion del Pool de PostgreSQL. Se reutiliza en cualquier
// servicio que necesite consultar la DB con @Inject(PG_POOL).
export const PG_POOL = 'PG_POOL';

/**
 * Summary: Modulo global que expone un unico Pool de conexiones a PostgreSQL
 * reutilizable por toda la aplicacion (auth, empresas, ...). Lee la cadena
 * de conexion desde la variable de entorno DATABASE_URL y, si no existe,
 * usa un fallback de desarrollo apuntando a la base local.
 * Al estar marcado con @Global, no hace falta volver a importarlo en cada
 * feature module.
 *
 * Parameters: (modulo declarativo, no recibe parametros).
 *
 * Return: Provider PG_POOL inyectable como `Pool` de la libreria `pg`.
 */
@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      useFactory: () => new Pool({
        connectionString: process.env.DATABASE_URL ??
          'postgresql://daem_user:daem_pass@localhost:5432/daem_prueba',
      }),
    },
  ],
  exports: [PG_POOL],
})
export class DbModule {}
