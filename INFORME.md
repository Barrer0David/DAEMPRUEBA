# INFORME2.md — DAVID BARRERO CAÑON

---

## REP-01 — Error sin token expone informacion al usuario

**Archivo y linea:** `backend/src/common/all.exceptions.filter.ts` y `backend/src/middleware/jwt-auth.middleware.ts`.

**Descripcion del problema:**
"Cuando intento acceder sin token, el mensaje de error muestra informacion que no deberia ver el usuario."

**Impacto:** seguridad. No es critico aislado, pero es el tipo de fuga que va dejando pistas (framework, ruta interna, version) y le ahorra trabajo a un atacante.

**Lo que vi y lo que decidi:**
Segui mentalmente la peticion sin cookie. Entra al `LoggerMiddleware`, pasa al `JwtAuthMiddleware`, no encuentra la cookie `Token_jwt` y lanza `UnauthorizedException('Token no proporcionado')`. De ahi llega al `AllExceptionsFilter` global, que arma el body con `{codigo, message, status:false}` y nada mas. El stack y el detalle interno se quedan en el log del proceso, no salen en la respuesta HTTP.

Para el 500 generico tampoco hay fuga: `resolveMessage` devuelve literal `'Error interno del servidor'`. Para las `HttpException` propias toma solo el `message` que pusimos al lanzarlas, que son textos cortos y revisados.

Para descartar fugas laterales greppee el backend buscando `res.json` y `res.send`. El unico que escribe al cliente es el filtro. Ningun controller responde por su cuenta esquivando la pasarela, asi que no hay forma de que el detalle interno acabe en el body.

**Estado:** cerrado en el codigo. La sanitizacion vive en el filtro global y todos los caminos de error pasan por ahi. Para certificarlo en runtime basta con golpear cualquier ruta protegida sin cookie y comprobar que el body sale `{codigo:401, message:"Token no proporcionado", status:false}` y nada mas.

**Commit:** N/A (no hay repo git en el directorio).

---

## REP-02 — Tokens expirados o invalidos no se rechazan

**Archivo y linea:** `backend/src/middleware/jwt-auth.middleware.ts:51-74` y `backend/src/app.module.ts:15-19` (config del `JwtModule`).

**Descripcion del problema:**
"Los tokens expirados o invalidos no son rechazados. Puedo acceder con cualquier token."

**Impacto:** seguridad critica. Bypass total de autenticacion. Cualquiera accede a los datos contables de cualquier empresa.

**Lo que vi y lo que decidi:**
El `JwtModule` se registra una sola vez en `app.module.ts` con el `secret` del entorno y `expiresIn: '8h'`. El middleware usa esa misma instancia por DI, asi que firma y verificacion comparten clave. `verifyAsync` valida firma y expiracion de fabrica, y no hay `ignoreExpiration: true` en ningun sitio. Funcionalmente los tokens caducados o con firma mala se rechazan: cualquier fallo del `verifyAsync` se convierte en `UnauthorizedException` y sale como 401.

Lo que si me molesto al leer el codigo fue un doble `try/catch` redundante. El catch interno lanzaba `'Token invalido o expirado'`, y el catch externo lo volvia a capturar y lo regrababa como `'Token invalido'`. Dos efectos malos: dos lineas de log para el mismo fallo y un mensaje generico aunque tuvieramos uno mas claro (perdiamos el "Token no proporcionado" cuando faltaba la cookie). Lo colapse a un unico `try/catch` que conserva el mensaje real y emite una sola traza:

```ts
private async validarTokenCookie(req: Request): Promise<JwtPayload> {
  const token = req.cookies?.[COOKIE_TOKEN];
  if (!token) throw new UnauthorizedException('Token no proporcionado');

  try {
    return await this.jwtService.verifyAsync<JwtPayload>(token.trim());
  } catch (error) {
    this.logger.warn(`Token rechazado: ${error instanceof Error ? error.message : 'desconocido'}`);
    throw new UnauthorizedException('Token invalido o expirado');
  }
}
```

**Estado:** cerrado. El rechazo funcional ya estaba, y ademas limpie el ruido del doble try/catch para que el mensaje devuelto sea util cuando alguien tenga que diagnosticar.

**Commit:** N/A (no hay repo git en el directorio).

---

## REP-03 — Indicador de frescura invertido

**Archivo y linea:** `frontend/src/components/Empresas/EmpresaSelector.tsx:18-23`.

**Descripcion del problema:**
La funcion `getFreshness(ultima_sync)` calculaba bien la diferencia en minutos pero las ramas del `if` estaban al reves: tarjetas con sync antiguo acababan pintadas verde con "Actualizado" y tarjetas con sync reciente en rojo con "Desactualizado".

**Impacto:** UX y fiabilidad operativa. Es una asesoria contable mirando un panel para decidir sobre que empresas trabajar. Un verde sobre datos viejos lleva a actuar con cifras desactualizadas. No es seguridad pero rompe la promesa central del indicador, que es el unico motivo por el que la tarjeta existe.

**Lo que vi y lo que decidi:**
`diff` mide cuantos minutos han pasado desde la ultima sync, asi que a mayor `diff`, mas viejos los datos. El comentario de cabecera de la funcion lo dejaba claro: `'ok'` debia ser `< 5 min`, `'warning'` entre 5 y 30, `'stale'` a partir de 30. Lo cruce con los mapas de UI (`freshnessColor` y `freshnessLabel`) para descartar que el bug estuviera en la presentacion; los mapas estaban bien, el error solo en la funcion.

Habia dos formas de arreglarlo y eran funcionalmente identicas. Eligi esta porque se lee igual que el comentario, letra por letra, y el contrato queda claro de un vistazo:

```ts
if (diff < 5) return 'ok';
if (diff < 30) return 'warning';
return 'stale';
```

La otra opcion (invertir solo los dos `return` manteniendo el operador `>`) producia el mismo resultado pero obligaba a hacer la conversion mental al revisar.

**Estado:** cerrado.

**Commit:** N/A (no hay repo git en el directorio).

---

## REP-04 — Error al cargar empresas no muestra mensaje

**Archivo y linea:** `frontend/src/components/Empresas/EmpresaSelector.tsx:97-107`.

**Descripcion del problema:**
"Cuando hay un error al cargar las empresas, la pantalla queda en blanco sin ningun mensaje."

**Impacto:** UX. Caida silenciosa del cargado de datos. No es de seguridad pero rompe la confianza: el usuario hace F5, sigue en blanco, no sabe si su sesion expiro, si esta sin conexion o si el backend esta caido.

**Lo que vi y lo que decidi:**
El `useState` para `error` ya existia y el `.catch` lo rellenaba, pero el `return` del componente nunca lo leia, asi que en caso de fallo se renderizaba un grid vacio. Anadi un bloque condicional antes de la rama de exito que pinta un cuadro con `role="alert"`, fondo rojo claro y dos lineas (titulo y mensaje exacto del error):

```tsx
if (error !== null) {
  return (
    <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">
      <p className="font-semibold">No se pudieron cargar las empresas</p>
      <p className="mt-1 text-sm">{error}</p>
    </div>
  );
}
```

Mantengo tambien el `mostrarErrorMantenimiento` (SweetAlert) como aviso emergente: asi el usuario recibe la senal aunque tenga la pestana en segundo plano, y a la vez tiene el mensaje persistente en pantalla despues de cerrar el modal. El `role="alert"` ayuda a lectores de pantalla y mejora la accesibilidad sin coste extra.

**Estado:** cerrado.

**Commit:** N/A (no hay repo git en el directorio).

---

## REP-05 — Endpoint de empresas lento + SQL Injection en getResumen

**Archivo y linea:** `backend/src/services/empresas/empresas.service.ts:38-70` (`findAll`) y `:87-138` (`getResumen`).

**Descripcion del problema:**
"El endpoint de empresas es muy lento cuando hay muchas. El equipo tecnico sospecha que hay un problema de rendimiento en la query."

**Impacto:**
- SQL Injection en `getResumen`: critica. Permite leer o modificar datos arbitrarios de la BD. OWASP A03 en todo su esplendor.
- Rendimiento en `findAll`: degradacion del producto a escala. No critico pero molesto.

**Lo que vi y lo que decidi:**
El reporte habla de rendimiento, pero al abrir el archivo me encontre algo bastante mas grave en `getResumen`: la version original interpolaba `empresaId`, `ejercicio` y `mes` directamente al string SQL (`WHERE empresa_id = '${empresaId}'`). Eso es SQL Injection clasica: el `:id` viene de la URL sin validacion de formato y entra a la query sin sanitizar. Un atacante puede mandar como `:id` algo como `' UNION SELECT ... --` y leer lo que quiera de la base.

Lo reescribi con parametros (`$1`, `$2`, `$3`) usando el segundo argumento de `pool.query`. Es exactamente el mismo patron que ya usa el `findAll` en el mismo archivo, asi que el cambio es coherente con el codigo existente y cierra la vulnerabilidad de raiz:

```ts
const result = await this.pool.query<{ tipo: string; total: string }>(
  `SELECT tipo, SUM(importe) as total
   FROM apuntes
   WHERE empresa_id = $1 AND ejercicio = $2 AND mes = $3
   GROUP BY tipo`,
  [empresaId, ejercicio, mes],
);
```

Ya que estaba, anadi tambien una comprobacion previa que tira `NotFoundException(404)` si la empresa no existe en la BD. Asi el cliente recibe un error claro en lugar de un resumen con ceros que se podria malinterpretar como "esta empresa no tuvo movimientos ese mes".

El frente de rendimiento del `findAll` no lo aborde en codigo. La paginacion ya esta bien (`LIMIT/OFFSET`, `Promise.all` para count y data en paralelo). El cuello de botella real seria la falta de indices en `activa` (para el `WHERE`) y `nombre` (para el `ORDER BY`); como esto se decide en la BD y no en el codigo TypeScript, lo dejo apuntado para la siguiente iteracion.

**Estado:** SQLi cerrado. Rendimiento queda como deuda pendiente de revision de indices en la BD (`CREATE INDEX ... ON empresas (activa)` y `... ON empresas (nombre)`), con `EXPLAIN ANALYZE` del `findAll` antes y despues.

**Commit:** N/A (no hay repo git en el directorio).

---

## REP-06 — Stack trace expuesto en respuesta de error

**Archivo y linea:** `backend/src/common/all.exceptions.filter.ts`.

**Descripcion del problema:**
"Revisando los logs, vemos que cuando falla el endpoint de empresas se expone el stack trace completo en la respuesta."

**Impacto:** seguridad. Information disclosure (revela rutas internas, versiones de framework, lineas con nombres de archivos).

**Lo que vi y lo que decidi:**
El filtro global arma el body asi:

```ts
const body: ResponseApi = { codigo, message, status: false };
res.status(codigo).json(body);
```

Cero `stack` en el body. El `message` para 500 es literal `'Error interno del servidor'`. Para `HttpException` toma solo el texto saneado que pusimos al lanzarla. El stack se loggea, si, pero al `Logger` interno (consola del proceso, `docker compose logs backend`), no a la respuesta HTTP.

Para descartar fugas laterales greppee el backend buscando `res.json` y `res.send`: solo aparecen en este filtro. No hay ningun controller respondiendo por su cuenta saltandose la pasarela, asi que no hay forma de que el stack acabe en el body.

**Estado:** cerrado. Para certificarlo en runtime basta con tirar la BD (`docker compose stop db`), golpear `GET /empresas` y comprobar que el body sale `{"codigo":500,"message":"Error interno del servidor","status":false}` y el stack solo aparece en los logs del contenedor.

**Commit:** N/A (no hay repo git en el directorio).

---

## REP-07 — Payload del token contiene informacion sensible

**Archivo y linea:** `backend/src/services/auth/auth.service.ts:61-65`.

**Descripcion del problema:**
"Hay un problema de seguridad en el login. El payload del token contiene informacion sensible."

**Impacto:** seguridad. Si el payload incluyese la password (incluso hasheada), bastaria con interceptar el token o leerlo en `jwt.io` para obtener credenciales reutilizables.

**Lo que vi y lo que decidi:**
Recordatorio basico: el payload de un JWT esta firmado pero no esta cifrado. Quien tenga el token lo puede pegar en `jwt.io` y leerlo entero. La regla es no meter ahi nada que no quieras publicar (passwords, hashes, tokens internos, claves de API, datos personales sensibles).

El payload actual contiene solo lo necesario para identificar y autorizar al usuario:

```ts
const payload = {
  sub: usuario.id,
  email: usuario.email,
  rol: usuario.rol,
};
return { access_token: this.jwtService.sign(payload) };
```

Nada confidencial, nada que comprometa al usuario si se filtra. El `password_hash` se queda en el servicio para la comparacion del login (`password !== usuario.password_hash`) y nunca toca el JWT. La version original que motivo el reporte si llevaba la password en el payload; el codigo ya esta saneado.

**Estado:** cerrado.

**Commit:** N/A (no hay repo git en el directorio).

---

## Hallazgos propios (opcional)

### Hallazgo 1 — Codigo muerto en `frontend/src/utils/`

**Archivo y linea:**
- `frontend/src/utils/formatters.ts` (reducido).
- `frontend/src/utils/matematicas.ts` (eliminado entero).
- `frontend/src/utils/texto.ts` (eliminado entero).

**Descripcion:**
Al inspeccionar la carpeta `utils/` me encontre con tres archivos de utilidades genericas que parecian un kit estandar de helpers. Pero al hacer grep contra el resto del frontend, casi nada de lo que exportan estaba en uso real. Es codigo zombi: ocupa espacio mental, sale en busquedas, en el arbol del IDE, y obliga al developer nuevo a leerlo "por si acaso".

Ademas, dentro de ese codigo muerto habia trampas. La funcion `nombreMes` traia un comentario `BUG-BASURA` que documentaba un off-by-one plantado a proposito: el array `MESES` esta indexado desde 0 pero la funcion recibe meses 1-12 sin restar 1, asi que `nombreMes(1)` devuelve `'Febrero'`. O sea, codigo muerto que ademas escondia un bug latente que en cualquier momento alguien podia "rescatar" sin saberlo.

Resultado del grep sistematico de cada simbolo exportado contra `frontend/src/`:

- `formatImporte` (formatters.ts): 0 imports. Candidato firme.
- `formatFecha` (formatters.ts): usado en `App.tsx:8` y `:162`. Conservar.
- `nombreMes` + `MESES` (formatters.ts): 0 imports. Candidato firme, ademas retira el ruido del `BUG-BASURA`.
- `truncate` (formatters.ts): 0 imports. El propio archivo ya lo marcaba como "Candidato a eliminar". Candidato firme.
- `variacionPct` (formatters.ts): 0 imports. Candidato firme.
- `sumar`, `promedio`, `redondear` (matematicas.ts): 0 imports. Archivo entero candidato.
- `capitalizar`, `esTextoVacio` (texto.ts): 0 imports. Archivo entero candidato.

Tambien comprobe usos por nombre dinamico (`import()` dinamico, referencias en strings, registro en `window`/`globalThis`, configs de bundler), `package.json`, HTML, CSS-in-JS, archivos de test (no hay tests en frontend). Nada. Confirmado: huerfanos.

**Correccion:**
Eliminacion directa, sin shims ni comentarios `// removed`. Tres opciones evaluadas:

1. Dejar el codigo con `@deprecated` o `// TODO: eliminar`. Peor opcion: el zombi sigue ahi, los grep siguen devolviendo basura, la deuda se acumula porque "ya esta marcada para borrar".
2. Vaciar los archivos sin exports. Tambien malo: archivos vacios aparecen en arboles del IDE y confunden ("por que existe `matematicas.ts` si no exporta nada?").
3. Eliminar los archivos completos. Lo mas limpio: si algo no se usa, no existe. El `git log` guarda la historia.

Apliqué la 3:
- `formatters.ts` queda reducido a su unica funcion en uso (`formatFecha`).
- `matematicas.ts` y `texto.ts` desaparecen del repo.
- No se anaden imports en ningun otro sitio.

Verificacion: grep posterior de `utils/matematicas`, `utils/texto` y de cada simbolo eliminado en `frontend/src` -> 0 referencias rotas. No corri `tsc --noEmit` ni `npm run build` esta sesion; recomiendo hacerlo antes de aceptar el cambio.

Lo que NO se elimino: `notificaciones.ts` (usado en `App.tsx`, `EmpresaSelector.tsx`, `ErrorBoundary.tsx`), `formatFecha` (usado en `App.tsx`), y los 3 archivos `Interfaces.*.ts` vacios (fuera del alcance "funciones y metodos", quedan como candidatos para limpieza posterior).

---

### Hallazgo 2 — Rate limiting global ausente

**Archivo y linea:**
- `backend/package.json` (nueva dependencia `@nestjs/throttler@^5.2.0`).
- `backend/src/app.module.ts` (registro de `ThrottlerModule.forRoot([...])` y de `ThrottlerGuard` como `APP_GUARD` global).
- `backend/src/common/config.ts` (`RATE_LIMITS` consumido por el modulo, comentario obsoleto eliminado, esquema reducido a `max_requests_per_minute`).

**Descripcion:**
La API no tenia ningun limite de peticiones. Cualquier cliente podia martillear el backend (especialmente `/auth/login`, que es publico) sin freno. La constante `RATE_LIMITS` ya vivia en `config.ts` con el comentario explicito "rate limiting no implementado todavia - ver ticket DAEM-089". El equipo ya sabia que faltaba pero el ticket nunca se cerro y la constante quedo de adorno.

Riesgos concretos:
- Brute force contra `/auth/login`. Sin rate limit, un atacante puede probar miles de passwords por minuto.
- Sobrecarga gratuita con peticiones legitimas pero excesivas (un cliente en bucle, un script de test descontrolado).
- DoS de bajo coste. No para un DDoS de verdad, pero filtra el abuso casero.

Tres caminos evaluados:

1. Implementarlo a mano con un `Map<IP, contador>` en memoria y un `setInterval` que limpia las ventanas. Cero deps nuevas pero codigo que mantener: store, concurrencia, decision sobre la clave (IP cruda vs IP + path), headers `Retry-After` y `X-RateLimit-*`.
2. Implementarlo como middleware Express dentro de Nest. Mismo problema: reescribir un wheel ya inventado.
3. Usar `@nestjs/throttler`. Libreria oficial de NestJS, una sola dep, configuracion declarativa, integracion nativa con guards y con `ExecutionContext`.

Elegida la 3. Razones: estandar en el ecosistema NestJS (un developer nuevo la reconoce sin manual); se integra con `APP_GUARD` y se aplica a todos los endpoints sin tocar controllers; cuando se supera el limite lanza `ThrottlerException` (HTTP 429), que es una `HttpException` normal y sale por el `AllExceptionsFilter` global en el formato `ResponseApi` estandar sin tocar el filtro.

**Correccion:**
Implementacion en tres pasos:

1. Anadir la dependencia: `"@nestjs/throttler": "^5.2.0"` (la 5.x es la familia compatible con NestJS 10; la 5.2 es la baseline conocida estable).
2. Registrar el modulo y el guard global:
   ```ts
   ThrottlerModule.forRoot([
     { ttl: 60_000, limit: RATE_LIMITS.max_requests_per_minute },
   ]),
   { provide: APP_GUARD, useClass: ThrottlerGuard },
   ```
   `ttl` en milisegundos (v5+), `limit` el numero maximo en esa ventana.
3. Ajustar `config.ts`: valor a `60` (60 req/min), eliminar `max_requests_per_hour` al converger en una sola ventana, actualizar el comentario para que diga que `RATE_LIMITS` lo consume `ThrottlerModule`.

Por que una sola ventana y no dos: la primera version tenia dos throttlers (corto 60s/100 y largo 1h/1000). Al bajar el corto a 60/min, el largo de 1000/h se volvia el restrictivo de facto a uso sostenido (~17 min en agotarlo a 60/min), entrando en contradiccion con lo pedido. Una ventana clara es mas honesta con el cliente del API que dos solapadas.

Deuda intencional documentada:
- Store en memoria por instancia. Si el backend escala a varias replicas, el limite real seria 60 x N. Para una instancia unica (caso actual segun `docker compose`) es correcto. Para multi-instancia hay que conectar Redis u otro storage compartido (`ThrottlerStorage`).
- Login dentro del limite global. Si se quiere algo mas agresivo solo en `/auth/login` (5 intentos/min), basta `@Throttle({ default: { limit: 5, ttl: 60_000 } })` sobre el handler. No se hizo porque la peticion fue "60 por minuto en todos los endpoints", literal.
- Identificacion por IP (default). En despliegues detras de proxy hay que configurar `trust proxy` en Express para que `req.ip` lea el `X-Forwarded-For` real. No esta configurado en `main.ts`; conviene anadirlo si el deploy de produccion va detras de un reverse proxy.

Verificacion: `npx tsc --noEmit` en backend -> 0 errores. Type-check del cambio en `app.module.ts` y `config.ts` -> OK. Pruebas runtime pendientes; para confirmar bastaria una rafaga de 61 peticiones contra cualquier endpoint y comprobar que la 61 devuelve `429` con `{codigo:429, message, status:false}`.

---

### Hallazgo 3 — Constantes huerfanas en `backend/src/common/config.ts`

**Archivo y linea:** `backend/src/common/config.ts`. Ningun archivo modificado esta sesion (solo documentado).

**Descripcion:**
Trabajando el Hallazgo 2 vi que `config.ts` tiene 6 constantes exportadas y casi ninguna se importa en el backend. Inventario tras esta sesion:

- `DB_CONFIG`: huerfana. El propio archivo dice que fue migrada a variables de entorno en v2.1.
- `JWT_CONFIG`: huerfana. El `JwtModule` en `app.module.ts:18-22` se configura directamente con `process.env.JWT_SECRET`, no via este objeto.
- `RATE_LIMITS`: **en uso** desde el Hallazgo 2. Unica constante con consumidor real.
- `PROGRAMAS_SOPORTADOS`: huerfana. Aunque `Empresa.programa` es un literal type `'A3ECO' | 'A3NOM' | 'A3GES'` en `frontend/src/types/index.ts`, no comparten codigo.
- `TIPOS_IVA`: huerfana. Preparado para calculos de IVA pero `EmpresasService` no los usa.
- `LEGACY_API_VERSION`: huerfana. El propio comentario en el archivo dice "candidato a eliminar".

Grep simple por cada nombre confirma: ninguno aparece fuera del propio `config.ts` (excepto `RATE_LIMITS`, que ahora si).

**Correccion:**
Ninguna aplicada. El usuario me indico explicitamente "no tocar nada del backend" cuando ofreci limpiarlas, y lo respeto. Queda documentado aqui porque (1) es deuda inventariada y (2) si en el futuro alguien borra `config.ts` entero pensando que es muerto, tiene que saber que `RATE_LIMITS` esta en uso desde `app.module.ts`.

Plan para otra iteracion: hablar con el equipo y decidir si las "constantes obsoletas" son fallbacks de defensa para entornos sin `.env` o si son codigo zombi de verdad. Si son fallbacks, usarlas (`DB_CONFIG` deberia consumirse desde `DbModule.ts`, no solo existir). Si son zombi, eliminarlas y eventualmente eliminar el archivo entero dejando `RATE_LIMITS` en otro modulo (junto al `app.module.ts` o en `common/rate-limits.ts`).

---

### Hallazgo 4 — Login con las credenciales del README no funcionaba

**Archivo y linea:**
- `db/seed.sql:103-105` (inserts iniciales de la tabla `usuarios`).
- `backend/src/services/auth/auth.service.ts:57` (comparacion del password en el login).
- `backend/package.json` (dependencias `bcrypt` y `@types/bcrypt` ausentes en el setup original).
- Cambios colaterales en `frontend/src/App.tsx:28-29` y `:122-150`.

**Descripcion:**
El README dice que las credenciales son `admin@daem.es / test1234`. Al intentar entrar, el backend devolvia siempre `{codigo:401, message:"Credenciales incorrectas"}` aunque escribiera exactamente esas credenciales. No esta en el set REP-01..REP-07, pero rompe el flujo basico del sistema (sin login no se puede probar nada del portal), asi que lo trate como hallazgo de prioridad alta.

**Lo que vi y lo que decidi:**
Dos defectos combinados que se anulaban entre si y hacian que ningun usuario pudiese entrar nunca:

- En `db/seed.sql`, los `password_hash` insertados parecian bcrypt por el prefijo (`$2b$10$abcdefghijklmnopqrstuuVwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ12`) pero NO eran hashes reales. Son strings placeholder formados con el prefijo + letras del abecedario + dos digitos. `bcrypt.compare("test1234", ...)` contra eso devuelve `false` siempre.
- En `auth.service.ts`, la comparacion era `password !== usuario.password_hash` con `!==` literal, sin pasar la entrada por bcrypt. Aunque el seed hubiese tenido hashes reales, comparar `"test1234"` (lo que escribe el usuario) contra un `$2b$10$...` (lo que esta en la BD) nunca daria match. Corrigiendo solo uno de los dos defectos el login seguiria fallando.

Confirme ambos en la BD viva con `docker compose exec db psql -U daem_user -d daem_prueba -c "SELECT email, password_hash FROM usuarios"`: en pantalla aparecian los strings placeholder identicos a los del seed, lo que cerraba el diagnostico.

Antes de aplicar el fix descarte la opcion de hashear en el cliente y comparar literal en el servidor. Hashear en el cliente no aporta seguridad real: el hash se vuelve la nueva password (replay trivial sobre HTTPS), degrada UX (bcrypt es lento a proposito) y desplaza el coste a donde no ayuda. Lo correcto es el patron estandar: HTTPS para el transito + bcrypt server-side.

**Correccion:**
Cinco pasos, en este orden:

1. `npm install bcrypt @types/bcrypt` en el backend. Reflejado en `package.json` y `package-lock.json`.
2. `auth.service.ts` ahora valida asi:
   ```ts
   if (!usuario || !(await bcrypt.compare(password, usuario.password_hash))) {
     throw new UnauthorizedException('Credenciales incorrectas');
   }
   ```
3. Generados tres hashes bcrypt reales de `test1234` con cost 10 y salts distintos:
   ```bash
   node -e "const b=require('bcrypt');['admin@daem.es','sergi@daem.es','maria@daem.es'].forEach(e=>console.log(e,b.hashSync('test1234',10)));"
   ```
   Salts distintos a proposito: aunque la password sea la misma para los tres usuarios de demo, el hash en BD se ve distinto, que es como bcrypt funciona en produccion real.
4. `db/seed.sql` actualizado con esos tres hashes para que un `docker compose down -v && docker compose up -d` vuelva a arrancar consistente. El comentario `-- (password = "test1234" hasheado con bcrypt)` ahora es verdad.
5. La BD viva se parcheo en caliente con tres `UPDATE usuarios SET password_hash = '...' WHERE email = '...'` para que el fix aplicara YA, sin tener que recrear el volumen de Postgres (eso habria borrado tambien las empresas y los apuntes de prueba).

Paso extra que no estaba en el plan: el backend corre dentro de un container construido con `COPY . .` y `RUN npm ci`, sin bind mount. El `npm install bcrypt` que hice en el host actualiza el `node_modules` local, pero el container sigue arrancando con el `node_modules` empaquetado en la imagen anterior, donde `bcrypt` no existe. Al primer `require('bcrypt')` cascaba con `Cannot find module 'bcrypt'`. Lo resolvi con `docker compose up -d --build backend` para rebuild la imagen y que `bcrypt` quedase dentro del container.

**Decisiones colaterales en la misma sesion:**

- `frontend/src/App.tsx`: el `LoginScreen` traia las credenciales demo quemadas como defaults (`useState('admin@daem.es')` y `useState('test1234')`). Las cambie a `useState('')`. Una credencial demo en el codigo fuente es un anti-pattern: queda commiteada, sale en repos publicos, y el dia que se cambien en produccion no hay nada que recuerde quitar el default.
- `frontend/src/App.tsx`: ademas se veian dos peticiones consecutivas a `GET /auth/me` al cargar la app. Es el comportamiento esperado de `React.StrictMode` en desarrollo (monta -> desmonta -> remonta para detectar efectos no idempotentes), pero el efecto del sondeo de sesion no era idempotente al 100% (registraba el callback `onUnauthorized` dos veces y duplicaba ruido en Network). Anadi un `useRef(false)` que cortocircuita la segunda ejecucion:
   ```ts
   const sesionVerificada = useRef(false);
   useEffect(() => {
     if (sesionVerificada.current) return;
     sesionVerificada.current = true;
     // ... registro de onUnauthorized + sondeo /auth/me
   }, []);
   ```
   En produccion StrictMode no duplica, asi que el guard es solo para callar el ruido en dev, no estorba.

**Verificacion:**
```bash
$ curl -s -X POST http://localhost:3000/auth/login \
    -H 'Content-Type: application/json' \
    -d '{"email":"admin@daem.es","password":"test1234"}'
{"codigo":200,"message":"Sesion iniciada","status":true,"output":{"ok":true}}
```

Antes del fix: `401 Credenciales incorrectas`. Despues: `200 Sesion iniciada` y cookie `Token_jwt` httpOnly fijada.

**Estado:** cerrado. Login funcional con las credenciales que figuran en el README.

**Commit:** `d03a58b` — `fix(auth): habilitar login con admin@daem.es/test1234 (hallazgo adicional)`.

---

## Reflexion final

**Que cambiaria si tuviera mas tiempo:**

En el backend:
- Adoptar una arquitectura hexagonal por capas. Separar dominio, aplicacion e infraestructura mantiene mejor la estructura, evita que la logica de un modulo dane la de otro y deja el proyecto mucho mas escalable.
- Usar un ORM en lugar de SQL crudo. Mas alla de productividad, oculta la consulta literal del codigo de aplicacion y suma una capa de seguridad.
- Cambiar el rate limit de global a por IP. Lo deje global por cuestiones de tiempo, pero lo correcto es por IP; tal como esta, un cliente que satura el cupo afecta al resto.
- Estandarizar DTOs e interfaces para las respuestas de cada servicio. Hoy el shape sale por convencion y eso se rompe en cuanto entran varias manos al mismo archivo. Es algo que van a compartir todos los endpoints, asi que merece contrato fijo.
- Usar enums donde tenga sentido (estados, programas soportados, tipos de IVA). Asi las acciones quedan parametrizadas y el endpoint no acepta valores fuera del set valido.
- Reforzar la autenticacion: access token corto + refresh token, sesiones activas listadas y revocables, y OTP como segundo factor.

En el frontend:
- Mejorar las visuales. La UI actual cumple pero es poco intuitiva y no esta acorde a una buena aplicacion.
- Un middleware/guard en el front que proteja rutas y estandarice envio y recepcion de datos de forma mas fuerte.
- Aplicar una estructura tipo MVC (o equivalente moderno: presentacion / dominio / servicios) para escalar sin que todo termine en un componente gigante.
- Crear shareds y utilities que de verdad se reutilicen, no helpers que solo usa un sitio. Esto es muy importante para una aplicacion.
- Vistas dedicadas para 401, 403 y 404 con mensaje claro. Asi se maneja mejor la experiencia y el usuario no se pierde, sabe que esta sucediendo.
- Encriptar lo que vaya a sessionStorage / localStorage. Dejar informacion suelta ahi como un cache seria malisimo para la seguridad del aplicativo.

En el proyecto:
- Pruebas automatizadas en Python (Selenium para flujos de UI, pytest para los endpoints). Ayuda a validar la seguridad y a detectar errores antes de que lleguen a produccion.
- Mejor documentacion de estructuracion y funcionamiento: UML, manual de usuario y manual tecnico.
- Logs en base de datos para que la trazabilidad del sistema este al alcance de todo el equipo y se pueda monitorear de verdad.
- Monitoreo activo del sistema con alertas cuando algo se cae, para enterarse y tomar cartas en el asunto sin depender de que un usuario reclame.

**Alguna decision tecnica que tome y quiero explicar:**

Tome la decision de estructurar el proyecto asi para que haya un sentido en lo que se hace y no sea confuso programar ni escalar mas adelante. Deje interfaces para cada modulo y servicio porque sin eso el contrato entre piezas se pierde, y reorganice las carpetas para que el proyecto sea legible y funcione mejor.

Comente las funciones para ayudar al siguiente desarrollador a entender que hace cada cosa sin tener que rastrear el codigo entero. Eso ayuda al entendimiento general del codigo.

En el backend agregue un middleware que valida el JWT y protege las rutas. Esa capa de seguridad es la que evita que cualquier peticion sin token llegue al handler y permite trabajar de buena manera el resto del flujo.

Estandarice el retorno del backend (`{codigo, message, status, data?}`). Es un error comun dejar que cada endpoint devuelva un shape distinto, pero la idea era no pasar por ahi: si el front tiene una estructura fija de respuesta, no se hace un desastre con checks defensivos por todos lados.

Agregue un rate limit global. No es por IP (lo correcto seria asi), pero como capa de proteccion contra ataques de fuerza bruta es claramente mejor que no tener ninguna.

Las querys se hacen por parametros, nunca por concatenacion de strings. Eso cierra SQL Injection en la entrada y suma una capa real de seguridad por muy poco costo.

En el front estructure las carpetas para que el desarrollo tenga sentido. Use try/catch en las llamadas, estandarice el retorno de las peticiones y deje interfaces por modulo para que haya mayor escalabilidad y responsabilidad entre archivos.

Y agregue una vista de error en lugar de la pantalla en blanco, para no perder al usuario. Por el contrario, se le pide que contacte con soporte para ayudarlo a resolver el problema; asi la experiencia no se rompe en seco.
