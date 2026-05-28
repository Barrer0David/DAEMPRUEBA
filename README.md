# Prueba Tecnica — Portal DAEM

## Instrucciones

### Requisito unico: Docker Desktop instalado

```bash
# 1. Descomprime el zip y entra a la carpeta
cd daem-prueba

# 2. Levanta todo el entorno
docker compose up --build

# Cuando veas "Backend corriendo en http://localhost:3000", esta listo.
```

- Frontend: http://localhost:5173
- Backend:  http://localhost:3000
- Credenciales de login: admin@daem.es / test1234

---

## El sistema

Un portal de visualizacion de datos contables para una asesoria. El backend expone empresas clientes y sus resumenes financieros. El frontend muestra esas empresas con un indicador de frescura de datos y permite ver el resumen por ejercicio y mes.

---

## Lo que reportan los usuarios

El equipo de QA ha reportado los siguientes problemas. Tu tarea es encontrarlos, diagnosticarlos y corregirlos:

**REP-01** — "Cuando intento acceder sin token, el mensaje de error muestra informacion que no deberia ver el usuario." --- El endpoint por postam genera 

**REP-02** — "Los tokens expirados o invalidos no son rechazados. Puedo acceder con cualquier token." --- Validar que el token cumpla con la firma que se genero el JWT

**REP-03** — "El indicador de frescura de datos en las tarjetas de empresa esta al reves. Las empresas con datos viejos aparecen en verde." --- Corregir la logica de getFreshness: ok cuando <5 min desde ultima_sync, warning entre 5 y 30, stale cuando >30

**REP-04** — "Cuando hay un error al cargar las empresas, la pantalla queda en blanco sin ningun mensaje." --- Renderizar el mensaje en la UI cuando error !== null (hoy se guarda en estado pero no se muestra)

**REP-05** — "El endpoint de empresas es muy lento cuando hay muchas. El equipo tecnico sospecha que hay un problema de rendimiento en la query." --- Filtrar empresas activas en SQL (WHERE activa = true) y paginar con LIMIT/OFFSET en vez de cargar toda la tabla en memoria

**REP-06** — "Revisando los logs, vemos que cuando falla el endpoint de empresas se expone el stack trace completo en la respuesta." --- Que el catch no devuelva error.stack al cliente: usar un exception filter global con mensaje generico y dejar el stack solo en el log interno

**REP-07** — "Hay un problema de seguridad en el login. El payload del token contiene informacion sensible." --- Eliminar la password (y cualquier credencial) del payload del JWT antes de firmarlo

---

## Lo que debes entregar

### 1. Informe tecnico (INFORME.md en la raiz)

Para cada bug que encuentres:
- ID del reporte (REP-01, etc.)
- Donde esta el bug exactamente (archivo + linea)
- Por que es un problema (impacto tecnico y de seguridad)
- Como lo corregiste
- Si no lo corregiste, explica por que

### 2. Codigo corregido

Commits separados por bug con mensaje descriptivo:
```
fix(auth): REP-02 - rechazar tokens invalidos en JwtGuard
fix(frontend): REP-03 - corregir logica de frescura invertida
```

### 3. Bugs adicionales (opcional)

Si encuentras bugs que no estan en los reportes, documentalos en tu informe como "Hallazgos propios". Cada hallazgo extra suma.

---

## Estandar de codigo

El equipo trabaja con estas reglas. Tu entrega sera evaluada contra ellas:

- Cero `catch {}` vacios — todo catch debe logear o propagar el error
- Cero `:any` ni `as any` — tipos propios siempre
- Cero mensajes de error que expongan datos internos al usuario
- Cero filtros en memoria que deberian hacerse en la query SQL
- Cero interpolacion directa de variables en queries SQL (SQL Injection)

---

## Checklist antes de enviar

- [ ] `grep -r ": any\|as any" src/` devuelve 0 resultados en tus cambios
- [ ] `grep -r "catch {}" src/` devuelve 0 resultados en tus cambios
- [ ] INFORME.md existe en la raiz y cubre todos los REP-XX
- [ ] Los commits son descriptivos y separados por bug
- [ ] El proyecto sigue corriendo con `docker compose up` despues de tus cambios

---

## Tiempo estimado

2 a 3 horas. No es una prueba de velocidad — es una prueba de criterio.
Una correccion bien explicada vale mas que cinco correcciones sin justificacion.
