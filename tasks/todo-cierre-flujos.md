# Tareas: cierre-flujos

Fuente: [especificación aprobada](../SPEC-cierre-flujos.md) y [plan](plan.md).
Estado: módulo verificado el 14 de octubre de 2026; resultados y limitaciones en `tasks/validation.md`. Muestras solicitadas pendientes, según aclaración posterior del usuario.

En cada tarea se verificará primero el comportamiento existente. Sólo se modificarán los archivos necesarios para corregir fallos reproducidos. Los candidatos listados son un límite de alcance orientativo; una corrección mayor se divide. Los resultados se registrarán en `tasks/validation.md`.

## Tarea 1: identificar el entorno verificable

- [x] Estado: verificada; evidencia en `tasks/validation.md`.
- **Resultado:** identificar backend configurado, esquema disponible, herramientas y entornos de prueba sin modificar datos reales.
- **Aceptación:** registrar proyecto/entorno sin credenciales; identificar tablas/RPC/RLS requeridas y migraciones base disponibles; distinguir checks posibles de bloqueos concretos.
- **Verificar:** inspección del esquema y de configuración; `npx supabase status`; `npx supabase test db --help` para confirmar invocación admitida por la CLI disponible. Comparar con la línea base ya comprobada de TypeScript, lint y 33 tests, sin presentarla como una prueba nueva.
- **Depende de:** ninguna.
- **Archivos candidatos:** `tasks/validation.md` (nuevo informe); configuración y migraciones existentes sólo para lectura.
- **Tamaño:** pequeño.

## Tarea 2: verificar la consistencia de puntos y canjes

- [x] Estado: verificada; evidencia en `tasks/validation.md`.
- **Resultado:** probar transacciones, permisos, idempotencia y concurrencia del backend; corregir sólo los fallos encontrados.
- **Aceptación:** saldo y XP correctos sin duplicados; reservas concurrentes no exceden saldo/stock y el mismo request ID crea un único canje; roles ajenos y escrituras directas quedan rechazados.
- **Verificar:** `npx supabase test db supabase/tests/global-rewards.test.sql supabase/tests/admin-search-edit.test.sql`; pruebas concurrentes mediante dos conexiones/solicitudes reales en entorno local aislado. Si se necesita un runner, usar las dependencias existentes y ejecutarlo con `node --test tests/integration/reward-concurrency.test.mjs`, documentando preparación y limpieza. Revisar el TAP, no sólo la salida del proceso.
- **Depende de:** 1.
- **Archivos candidatos:** `supabase/tests/global-rewards.test.sql`, `tests/reward-concurrency.test.mjs` si hace falta, una nueva migración correctiva si hay un defecto, `.gitignore` sólo para versionar esa migración/test nuevo.
- **Tamaño:** mediano, hasta cuatro archivos; no editar migraciones ya aplicadas.

### Control A: backend

- [x] Entorno y contratos comprobados, o bloqueos documentados sin simular éxito.
- [x] Permisos, idempotencia, saldo y stock con evidencia; distinguir ejecución secuencial de concurrencia.
- [x] Si hubo migración, `npx supabase db lint --local` y `npx supabase db advisors --local --type security --fail-on warn` aprobados en el entorno de prueba aplicable.

## Tarea 3: verificar aislamiento de sesión

- [x] Estado: verificada; evidencia en `tasks/validation.md`.
- **Resultado:** completar acceso y cambios de cuenta sin filtrar datos anteriores.
- **Aceptación:** onboarding y retorno por rol conservados; una respuesta tardía de A no aparece al entrar B; logout oculta perfil, saldo e historial privados.
- **Verificar:** `node --test tests/access.test.mjs tests/auth.test.mjs tests/auth-flow.test.mjs tests/onboarding.test.mjs`; navegador con A → logout → B y consultas demoradas/error de permisos. Ante correcciones de estado, añadir sólo la regresión de comportamiento pertinente con las herramientas existentes.
- **Depende de:** control A.
- **Archivos candidatos:** `src/providers/AuthProvider.tsx`, `src/providers/WalletProvider.tsx`, `src/hooks/usePortalData.ts`, `src/app/_layout.tsx`, `tests/session-isolation.test.mjs` si procede.
- **Tamaño:** mediano, hasta cinco archivos.

### Corrección adicional de la tarea 3: recuperación local

- [x] Plantilla local alineada con OTP de seis dígitos; prueba API de recuperación aprobada.
- [x] Regresión de navegador: conservar el formulario de nueva contraseña al verificar OTP y volver al destino del rol al guardar.
- Archivos: `supabase/config.toml`, `supabase/templates/recovery.html`, `src/app/_layout.tsx`, `tests/integration/recovery.test.mjs`, `tests/integration/navigation.test.mjs`.
- Verificación: `node --test tests/integration/recovery.test.mjs` y las dos pruebas de `tests/integration/navigation.test.mjs`.

## Tarea 4: verificar descubrimiento público

- [x] Estado: verificada; evidencia en `tasks/validation.md`.
- **Resultado:** buscar y consultar puntos reales sin requerir ubicación ni mostrar puntos no publicados.
- **Aceptación:** invitado abre mapa/lista/ficha; búsqueda y filtros funcionan sin ubicación; puntos inactivos o de empresa suspendida se excluyen y un error no parece un vacío.
- **Verificar:** `node --test tests/discovery.test.mjs tests/point-schedule.test.mjs`; navegador sin permiso de ubicación y fixtures activas/inactivas, carga, vacío y error con reintento.
- **Depende de:** 3.
- **Archivos candidatos:** `src/services/green-point.service.ts`, `src/providers/DiscoveryProvider.tsx`, `src/app/(app)/green-points.tsx`, `src/app/point/[id].tsx`, `tests/discovery.test.mjs`.
- **Tamaño:** mediano, hasta cinco archivos.

## Tarea 5: verificar la entrega y su acreditación

- [x] Estado: verificada; evidencia en `tasks/validation.md`.
- **Resultado:** registrar una entrega, recibirla con cantidades reales y consultar el crédito global.
- **Aceptación:** registrar no acredita; confirmar acredita una sola vez según cantidades/configuración de prueba; historial y saldo se actualizan y el XP sigue independiente.
- **Verificar:** `node --test tests/delivery.test.mjs`; circuito web con código manual, cantidades ajustadas, entrega cancelada/vencida y confirmación repetida; contrastar movimientos del backend.
- **Depende de:** 4.
- **Archivos candidatos:** `src/app/new-delivery.tsx`, `src/app/company/scanner.tsx`, `src/services/delivery.service.ts`, `src/components/delivery/DeliveryBalance.tsx`, `tests/delivery.test.mjs`.
- **Tamaño:** mediano, hasta cinco archivos. Correcciones SQL vuelven al alcance acotado de la tarea 2.

### Control B: entrega y saldo

- [x] Acceso, aislamiento y descubrimiento con evidencia.
- [x] Entrega confirmada produce crédito único; registrar o cancelar no acredita.
- [x] `npx tsc --noEmit`, `npm run lint` y pruebas enfocadas pertinentes pasan para los archivos modificados.

## Tarea 6: verificar el catálogo de premios

- [x] Estado: verificada; evidencia en `tasks/validation.md`.
- **Resultado:** mostrar sólo premios disponibles según las reglas reales, con costo y entidad claros.
- **Aceptación:** publicación/vigencia/empresa aplicadas; muestras siempre identificadas y sin canje; error, vacío, agotado y carga distinguibles, sin saldo cero ficticio.
- **Verificar:** catálogo y detalle web con fixtures de premio activo, borrador, vencido y agotado; probar error de red y filtros. Si hay corrección de lógica, `node --test tests/reward.test.mjs` con el test nuevo correspondiente.
- **Depende de:** control B.
- **Archivos candidatos:** `src/models/Reward.ts`, `src/services/reward.service.ts`, `src/app/(app)/rewards.tsx`, `src/app/reward/[id].tsx`, `tests/reward.test.mjs` si procede.
- **Tamaño:** mediano, hasta cinco archivos.

## Tarea 7: verificar reserva y recepción del premio

- [x] Estado: verificada; evidencia en `tasks/validation.md`.
- **Resultado:** convertir puntos globales en un canje persistente y confirmar su entrega desde la empresa correcta.
- **Aceptación:** confirmación informa costo/saldo y debita una vez; reintento conserva request ID y Mis canjes permite reabrir el código; empresa correcta confirma sin nuevo débito y usuarios ajenos no acceden.
- **Verificar:** circuito web con saldo suficiente/insuficiente, respuesta perdida y reintento, QR/código manual, confirmación repetida y acceso ajeno; contrastar reserva, saldo y estado en backend. La lectura óptica física se informa aparte.
- **Depende de:** 6.
- **Archivos candidatos:** `src/app/reward/[id].tsx`, `src/app/redemption/[id].tsx`, `src/app/company/scanner.tsx`, `src/services/reward.service.ts`, `tests/reward-service.test.mjs` si procede.
- **Tamaño:** mediano, hasta cinco archivos.

### Control C: canje

- [x] Circuito entre dos organizaciones de prueba completado: crédito global → reserva → entrega del premio.
- [x] Sin doble débito, consumo duplicado ni acceso de otra empresa/ciudadano.
- [x] Pruebas SQL/regresiones pertinentes aprobadas y evidencia del estado persistido.

## Tarea 8: verificar el portal de empresa

- [x] Estado: verificada; evidencia en `tasks/validation.md`.
- **Resultado:** comprobar las herramientas actuales del responsable y trabajador, incluido cambio de empresa.
- **Aceptación:** cada rol sólo usa sus acciones; configuración de punto/tarifa/equipo conserva validación y cupos; guardado fallido no muestra éxito ni pierde contenido.
- **Verificar:** navegador con owner y worker de prueba, cambio de empresa, validación de formularios, suspensión y error de red; invitaciones sólo con fixtures locales y receptor de email de prueba.
- **Depende de:** control C.
- **Archivos candidatos:** `src/app/company/index.tsx`, `src/components/portal/CompanyPointEditor.tsx`, `src/components/portal/CompanyRewards.tsx`, `src/services/portal.service.ts`, `src/app/company-invitations.tsx`.
- **Tamaño:** mediano, hasta cinco archivos. Las tarifas que se prueben son fixtures; no se define la tarifa universitaria.

## Tarea 9: verificar la administración

- [x] Estado: verificada; evidencia en `tasks/validation.md`.
- **Resultado:** comprobar búsqueda, edición y gestión existentes desde admin sin ampliar su alcance.
- **Aceptación:** acceso sólo con permiso real; cambios válidos se reflejan y registran en la auditoría existente; búsqueda, paginación y errores preservan contexto.
- **Verificar:** `node --test tests/changelog.test.mjs`; `npx supabase test db supabase/tests/admin-search-edit.test.sql`; navegador con fixtures de solicitud, premio y empresa, incluyendo rechazo de acceso no admin.
- **Depende de:** 8.
- **Archivos candidatos:** `src/app/admin/index.tsx`, `src/components/portal/AdminSearch.tsx`, `src/components/portal/AdminRewards.tsx`, `src/components/portal/AdminChangelog.tsx`, `src/services/admin.service.ts`.
- **Tamaño:** mediano, hasta cinco archivos. Si aparece un defecto independiente en AdminPoints, crear una subtarea acotada en lugar de ampliar esta lista.

## Tarea 10: revisar funciones y datos no disponibles

- [x] Estado: verificada; evidencia en `tasks/validation.md`.
- **Resultado:** que las superficies de funciones futuras y datos faltantes expresen su situación real.
- **Aceptación:** retiros no simulan operación disponible; contacto y términos faltantes muestran su estado sin inventar contenido; navegación y mensajes usan los nombres de `DESIGN.md`.
- **Verificar:** navegador invitado/ciudadano en Mis entregas, Contacto y Términos, con configuración presente/ausente; comprobar acciones deshabilitadas y reintentos aplicables. No agregar tests que sólo comparen textos.
- **Depende de:** 9.
- **Archivos candidatos:** `src/app/my-raee.tsx`, `src/app/contact.tsx`, `src/app/terms.tsx`, `src/components/auth/RolePortal.tsx`.
- **Tamaño:** mediano, hasta cuatro archivos; conservar sin cambios lo que ya cumple.

### Control D: portales y alcance

- [x] Owner, worker y admin comprobados con sus permisos efectivos.
- [x] Guardados, errores y auditoría muestran resultados reales.
- [x] Funciones futuras/datos faltantes identificados; no se sumaron retiros, preferencias ni métricas nuevas.

## Tarea 11: verificar el circuito web y la interfaz afectada

- [x] Estado: verificada; evidencia en `tasks/validation.md`.
- **Resultado:** completar el recorrido entre organizaciones de prueba y revisar las pantallas afectadas en móvil y escritorio.
- **Aceptación:** circuito persistido completo con separación de roles; sin recortes/superposiciones ni scroll horizontal de lectura, con foco y controles accesibles; todos los checks finales aplicables pasan y los no ejecutados quedan identificados.
- **Verificar:** `npx tsc --noEmit`; `npm run lint`; `node --test tests/*.test.mjs`; `npx expo export --platform web`; suites SQL aplicables del control A. Navegador a 390 y 1280 px, nombres largos, texto aumentado, teclado, ubicación denegada y estados carga/vacío/error. Si el mínimo de 390 px oculta un problema, ampliar la revisión al ancho afectado.
- **Depende de:** control D.
- **Archivos candidatos:** `tasks/validation.md`; evidencia visual en `output/` cuando la herramienta permita guardarla. Una corrección nueva vuelve a su tarea o a una subtarea antes de revalidar.
- **Tamaño:** pequeño para artefactos; la revisión comprende las pantallas realmente afectadas.

## Tarea 12: documentar el estado comprobado

- [x] Estado: documentación y revisión final completadas.
- **Resultado:** cerrar la documentación del módulo y conservar las altas posteriores visibles.
- **Aceptación:** README y funcionalidades reflejan premios/canjes y saldo global; informe distingue tests nuevos, datos reales, fixtures y pendientes; mapa conserva altas y tarifa diferida sin declararlas hechas.
- **Verificar:** `git diff --check`; contrastar documentación con el informe y criterios de la especificación. Comprobar los enlaces locales y revisar que no haya secretos ni resultados inferidos.
- **Depende de:** 11.
- **Archivos candidatos:** `README.md`, `PROYECTO_Y_FEATURES.md`, `SPEC-cierre-flujos.md`, `CAPABILITY-MAP-cierre-app.md`, `tasks/validation.md`.
- **Tamaño:** mediano, hasta cinco archivos.

### Control final: módulo

- [x] Criterios de la especificación comprobados con evidencia; ningún check pendiente figura aprobado.
- [x] Cambios acotados, tests pertinentes, documentación y diseño coherentes.
- [x] Sin credenciales privilegiadas en cliente, degradación de RLS ni modificaciones a datos reales de prueba.
- [x] Universidad de Pilar y Cafe del Pellegrini siguen registradas como siguientes módulos; Un café cuesta 100 puntos y la tarifa de entregas sigue diferida.
- [x] No se declara la app terminada, publicada o validada físicamente por haber completado este módulo.
