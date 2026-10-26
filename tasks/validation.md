# Validación del cierre de EcoRAEE

Fecha de inicio: 13 de octubre de 2026. Especificación y plan aprobados por el usuario.

**Estado final, 14 de octubre de 2026:** cuatro módulos completados para el alcance web de ejemplo. Universidad de Pilar y Cafe del Pellegrini están implementados y revisados en conjunto. Sin altas operativas ni despliegue. Las secciones siguientes conservan la evolución de cada módulo; los pendientes históricos de módulos ya cerrados no describen su estado final. Los límites operativos, físicos y de texto ampliado siguen explícitos en el cierre final de este informe.

## Entorno

- Node 26.3.1; CLI Supabase 2.120.0 obtenida mediante npx; Docker disponible.
- La app apunta por defecto al proyecto `awzmweclcgellphiromh`.
- El 13 de octubre el remoto estaba inactivo: SQL/listado de migraciones devolvían `28P01` y el dominio de API `ENOTFOUND`. El 14 de octubre, tras el aviso del usuario, se confirmó `ACTIVE_HEALTHY` y conexión SQL funcional.
- No estaba iniciado un stack local de EcoRAEE. No se tocaron los contenedores de los otros proyectos.
- Se encontraron 14 migraciones locales, incluidas las bases ignoradas por Git. Por tanto existe material para intentar reconstruir el entorno local; sólo tres migraciones están actualmente exceptuadas en `.gitignore`.
- `supabase test db --help` confirma que acepta múltiples rutas. Las suites existentes usan fixtures y rollback.

## Línea base anterior a implementación

TypeScript, lint y 33/33 pruebas locales aprobados en esta conversación antes de preparar el plan. No se presentan como una validación nueva posterior a cambios.

## Resultados nuevos

- El proyecto remoto se confirmó `INACTIVE`. La restauración devolvió falta de permisos del conector. El usuario indicó «Por ahora seguí con el entorno local»; no se vuelve a intentar reactivar el remoto en este alcance.
- Stack local iniciado con Auth, PostgreSQL 17.11, API, Storage y Mailpit; puertos API 55321, DB 55322, correo 55324. Se reutilizó el volumen local existente, sin reset ni eliminación de datos.
- Durante las pruebas, `.env.local` configuró sólo URL y publishable key locales. Al confirmar la reactivación del remoto y terminar las pruebas se retiró ese archivo temporal; la app vuelve a usar el proyecto Supabase configurado por defecto.
- Verificación funcional local, correcciones, cierre documental y limpieza de fixtures completados para este módulo.
- Primera ejecución SQL: falló por esquema local incompleto. Después de aplicar las migraciones locales faltantes, se detectaron dos expectativas obsoletas del test de portales y salida JSON en lugar de TAP en el test de puntos admin. Se conservó la prueba de publicación por owner sobre un punto existente y se agregó el alta por admin; el test de puntos ahora emite TAP. Resultado: ocho suites, 321 comprobaciones aprobadas.
- Lint del esquema propio: `npx supabase db lint --local --schema public,private --level error --fail-on error` sin errores. El lint sin filtro también inspecciona funciones internas de pgTAP y emite diagnósticos de esa extensión; se separan de los esquemas de la aplicación. Advisor de seguridad local: sin hallazgos.
- `node --test tests/integration/reward-concurrency.test.mjs`: cuatro tests aprobados (padre y tres escenarios). Se verificaron reservas contra el mismo saldo en premios diferentes, última unidad e idempotencia simultánea. La primera ejecución reveló un fallo del cleanup de fixtures por una FK de tarifas; se corrigió y se limpiaron los IDs registrados. Cero identidades de concurrencia remanentes.
- Reproducción en Chrome: una entrada directa a `/green-points` terminaba en `/home`. El test de navegador `tests/integration/navigation.test.mjs` falló con esa diferencia exacta antes del cambio. Causa: el Stack evaluaba guards falsos mientras todavía cargaba sesión/preferencias y descartaba la ruta solicitada. `src/app/_layout.tsx` ahora espera a resolver acceso antes de montar las rutas protegidas.
- Primera verificación posterior de navegación: aprobada en Chrome, entrada directa y recarga de Puntos verdes, Premios y Perfil. En el circuito autenticado también se conservaron las rutas de entrega y canje al recargar. Una prueba posterior de recuperación detectó una regresión del primer ajuste: desmontar el Stack durante cada evento de Auth perdía el formulario de nueva contraseña. Se reprodujo con un test de navegador fallido y el ajuste se limitó a demorar el montaje inicial; el Stack ahora permanece montado durante eventos posteriores. Regresión completa en curso.
- Circuito web local completado con roles ciudadano, owner, worker y admin, cantidades declaradas 2/recibidas 1, crédito 100, canje 100 y saldo final 0 sin segundo débito; Mis canjes muestra entregado, otro ciudadano no accede al código y cambio de cuenta no muestra movimientos anteriores. Dieciséis observaciones/capturas en `output/verification/`, sin errores JS de página en la sesión ciudadana. Anchos de documento comprobados iguales al viewport: 390 y 1280. Se inspeccionaron visualmente las capturas de canje móvil y admin escritorio.
- TypeScript, lint y 33/33 tests locales aprobados después del cambio de navegación. Exportación web aprobada: 41 rutas en `dist-closure/`. Esta exportación usa el override local de pruebas; no es un despliegue ni se publica.
- Remoto 14 de octubre: 21 tablas públicas con RLS habilitado; las diez definiciones public/private de los cinco RPC principales coinciden por hash con el entorno local probado. Las migraciones funcionales están presentes, aunque algunas tienen timestamps distintos a los archivos locales. Cero empresas, puntos y premios. No se escribieron fixtures en el remoto.
- Advisor remoto: aviso de protección contra contraseñas filtradas deshabilitada. No se modificó esa configuración de Auth ni se presenta como un defecto de RLS. Referencia: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection.
- Recuperación local: el correo predeterminado tenía enlace pero ningún OTP de seis dígitos. La nueva prueba `tests/integration/recovery.test.mjs` falló por falta del código. Se configuró una plantilla local `supabase/templates/recovery.html` con `{{ .Token }}` y se reinició el stack conservando datos. La prueba pasó: recepción en Mailpit, verificación OTP, cambio de contraseña e ingreso con nueva contraseña. La plantilla alojada es configuración independiente y no se modificó.
- Invitación local: Edge Function iniciada, intento de envío por ciudadano rechazado, envío por owner recibido en Mailpit, aceptación por la cuenta verificada destinataria y membresía `company_worker/ACTIVE` comprobadas. No se enviaron emails a terceros ni se cambiaron usuarios reales.
- Diez comprobaciones web adicionales aprobadas: Contacto y Términos sin datos reales, aviso de retiros no habilitados, saldo insuficiente, stock agotado, error de catálogo con reintento sin muestras, búsqueda sin resultados, formulario de horarios conserva datos inválidos y guarda al corregir, búsqueda admin por nombre y foco de teclado. Sin errores JS de página en esas sesiones. Evidencia en `output/verification/supplement.json`.
- La regresión de navegador incluye ahora recuperación completa por la interfaz, además de las entradas directas/recargas. El ajuste del arranque utiliza un estado que sólo pasa de pendiente a listo, sin desmontar el navegador durante cambios posteriores de sesión. TypeScript y lint se volvieron a comprobar sobre ese ajuste; la forma final evita una actualización síncrona de estado dentro de un effect que el lint del proyecto rechaza.
- API pública remota comprobada el 14 de octubre: HTTP 200 para categorías (13), puntos verdes (0) y premios (0) con la publishable key configurada en la app.
- Revisión visual realizada sobre canje móvil, catálogo móvil, portal owner móvil, buscador admin móvil y puntos admin escritorio. Se conservaron tema, Roboto, header y componentes compartidos. No se declara una auditoría completa de accesibilidad ni pruebas de cámara/archivos en dispositivos físicos.
- Regresión final del arranque aprobada: dos pruebas de navegador (entradas directas/recargas y recuperación con guardado de contraseña), TypeScript y lint sin errores. La prueba de recuperación desde la interfaz con una cuenta worker también terminó en `/company`, sin errores JS de página.
- Fixtures web eliminadas mediante sus IDs registrados: cero usuarios, empresas, puntos, premios, entregas y canjes remanentes en el entorno local. Se retiró el archivo temporal con credenciales de esas cuentas. No se eliminó información de usuarios reales ni del remoto.
- Exportación final aprobada tras el último ajuste de navegación y al retirar el override local: 41 rutas en `dist-closure/`, conectadas al proyecto Supabase predeterminado. No hubo despliegue. `git diff --check` y formato de los archivos modificados aprobados.

## Resultado del módulo

`cierre-flujos` queda verificado con dos correcciones de producto/configuración: conservar rutas durante el arranque sin interrumpir la recuperación, y enviar el OTP en el correo local. También se actualizaron dos suites SQL históricas y la documentación funcional.

Resultados: 33 pruebas locales; 321 comprobaciones SQL; cuatro tests de concurrencia (padre y tres escenarios); dos tests de navegador; un test API de recuperación; circuitos de entrega/canje, recuperación worker e invitación local, además de diez comprobaciones suplementarias de interfaz. TypeScript, lint, exportación y formato aprobados. Las limitaciones detalladas abajo permanecen explícitas y no se convierten en pruebas aprobadas.

## Limitaciones y condiciones operativas

- El remoto se inspeccionó sin crear usuarios/operaciones de prueba; las comprobaciones transaccionales, de correo y navegador se hicieron localmente. Los hashes de los RPC coinciden, pero eso no equivale a un circuito alojado completo.
- Validación física Android/iOS, lectura óptica y selectores de archivos pendientes. Se comprobó el ingreso manual de códigos en navegador.
- Contacto oficial y términos aún sin configurar. Los estados actuales lo explican y no inventan destinos o documentos.
- Migraciones/suites históricas locales no versionadas siguen siendo necesarias para reproducir todo el esquema. No se modificó ese convenio de almacenamiento en este módulo.
- No se aplicaron migraciones nuevas, no se debilitaron políticas RLS y no se asignaron roles a cuentas reales. Cambios de código sin commit ni publicación.

## Decisiones conservadas

Actualización del 14 de octubre: Universidad de Pilar, dirección aportada por el usuario, lunes a sábado de 10:00–20:00 y todas las categorías disponibles. Cafe del Pellegrini, misma dirección, Un café por 100 puntos globales. Tarifa de entrega diferida. El usuario respondió «es de ejemplo» al consultar las cuentas responsables: los módulos siguientes se preparan como muestras identificadas, sin cuentas ni operaciones reales. Todavía no se implementaron esas muestras.

## Módulo alta-universidad: verificación del 14 de octubre

El usuario aprobó `SPEC-alta-universidad.md` y luego el plan/tareas con «Apruebo todo». Universidad de Pilar quedó implementada como muestra del catálogo vacío; el café sigue pendiente. No se crearon registros ni cuentas operativas de la universidad.

- Datos: dirección confirmada, lunes a sábado de 10 a 20 en zona argentina, todas las categorías de cada carga y sin tarifas supuestas. Las coordenadas corresponden al marcador SEDE PELLEGRINI del mapa enlazado por la web universitaria; fuente y límites en `tasks/plan-alta-universidad.md`.
- Se añadió `demo` opcional al modelo, construcción de muestra en `src/data/greenPointExamples.ts` y selección sólo en el éxito vacío de `DiscoveryProvider`. Servicios remotos, RLS, esquema y datos reales intactos. Con datos reales no se añade la muestra; una búsqueda sin coincidencias no reconstruye ejemplos.
- Inicio, fila, ficha y marcadores identifican la muestra. El horario se presenta como ejemplo y no como promesa de recepción real. Nueva entrega excluye muestras y rechaza URLs con ID de ejemplo antes de montar formulario o consultar tarifas.
- TDD: el test de datos falló primero por ausencia de la implementación, luego pasaron datos, horarios, categorías dinámicas/vacías, filtros y prioridad de puntos reales. El test de elegibilidad falló primero por guard ausente y pasó al implementarlo. El navegador reprodujo ausencia de la muestra antes de activar el provider.
- La prueba web detectó que el elemento del marcador aún no existía al asignar su etiqueta accesible. Se reprodujo con título presente y `aria-label` ausente; se corrigió asignándolo en el evento `add` de Leaflet. La regresión pasó. Se corrigieron también dos selectores de prueba ambiguos por pantallas conservadas en el DOM y por marcador/fila con la misma etiqueta.
- `node --test tests/*.test.mjs`: 38/38 aprobadas. `npx tsc --noEmit` y `npm run lint`: aprobados después del último cambio de producto.
- `tests/integration/point-examples.test.mjs`: tres escenarios aprobados: invitado explora Inicio/lista/mapa/ficha y recarga; carga/error/reintento y catálogo real; ciudadano local bloqueado por URL y selector. Los dos primeros intentos tras reiniciar el servidor fallaron por conexión rechazada mientras arrancaba; se reejecutaron con el servidor disponible. Tras corregir la etiqueta del mapa, el selector del test de punto real pasó a coincidir con marcador y fila; corregido el selector, ese escenario volvió a pasar. No se presenta una ejecución inicial fallida como aprobada.
- En la prueba ciudadana se verificó el origen local de Auth; cero consultas de tarifas, subidas Storage o llamadas de creación de entrega sobre ejemplos. La cuenta temporal se eliminó en `finally`; comprobación posterior: usuarios 0, entregas 0, canjes 0 en el stack local. Ningún correo o cuenta remota de terceros utilizado.
- Revisión visual efectiva de capturas de ficha móvil, catálogo escritorio, bloqueo de entrega móvil y catálogo con texto aumentado; tema, header, dirección y aviso legibles. Anchos de documento iguales al viewport en las capturas de 390 y 1280 px. Evidencia en `output/verification/university-*.png`.
- La prueba de texto aumentado es una simulación CSS de 20 px en el navegador, no una validación de escala nativa. Expone recorte de etiquetas de la barra inferior existente, cuya altura fija no se modificó en este módulo. Los filtros horizontales conservan su scroll. Esta limitación no se presenta como accesibilidad completa aprobada.
- Exportación web final aprobada: 41 rutas en `dist-closure`, usando la configuración Supabase predeterminada. Los overrides locales de pruebas se pasaron sólo al proceso del servidor en 8084; no se creó `.env.local`. Sin commit ni publicación.

Resultado: `alta-universidad` completado para la muestra web con los límites visuales/nativos descritos. `alta-cafe` y `validacion-cierre` continúan pendientes.

Comprobación adicional con la configuración predeterminada: servidor web reiniciado en 8083, sin interceptar consultas; API remota HTTP 200, 13 categorías y cero puntos reales. Inicio y ficha muestran Universidad de Pilar como ejemplo, sin errores JS. Captura `university-default-project-mobile.png`. Se cerró el servidor local de pruebas de 8084; 8083 conserva el proyecto predeterminado.

## Módulo alta-cafe: verificación del 14 de octubre

Especificación y plan/tareas aprobados en turnos posteriores. Cambio de producto limitado a `src/data/rewardExamples.ts`: muestra `example-cafe` ahora Un café, Cafe del Pellegrini, gastronomía, 100 puntos globales y dirección compartida con la universidad. Foto e ID conservados; descripción específica de ejemplo; otras muestras intactas. Horario vacío, stock/coordenadas nulos y `demo: true` conservados. No hubo modificaciones de pantallas, servicios, esquema, permisos o datos remotos.

- TypeScript y lint aprobados; `node --test tests/*.test.mjs`: 38/38 aprobadas. No se añadieron pruebas que repliquen constantes del contenido estático.
- `node --test tests/integration/reward-examples.test.mjs`: tres escenarios aprobados en la primera ejecución, usando Chrome aislado y servidor local en 8084: invitado explora catálogo/búsqueda/filtro/ficha/recarga, estados de carga/error/reintento y premio real disponible, y ciudadano con saldo simulado suficiente sin posibilidad de canjear.
- El saldo de 500 fue únicamente una respuesta interceptada de lectura en el navegador de prueba; no se acreditaron puntos en base de datos. Auth se comprobó contra el origen local. Botón de ejemplo deshabilitado, sin modal de confirmación ni llamadas a `reward_command`; Mis canjes vacío después de visitar la ficha.
- La cuenta ciudadana temporal se eliminó en `finally`; comprobación SQL local posterior: usuarios 0, canjes 0 y movimientos 0. No se usaron cuentas remotas ni se enviaron correos a terceros.
- Revisión visual realizada sobre catálogo móvil, ficha móvil (zona de dirección/avisos/botón) y ficha de escritorio. Dirección y costo legibles, foto pertinente, diseño compartido y sin desbordes de documento. Viewports 390 y 1280 px. Capturas `output/verification/cafe-*.png`; revisión web, no prueba física nativa ni auditoría completa de accesibilidad.
- Exportación web aprobada: 41 rutas en `dist-closure`, configuración Supabase predeterminada. No se crearon `.env.local`, dependencias o migraciones. Sin commit, publicación ni despliegue.

Resultado: `alta-cafe` completado como muestra. `validacion-cierre` sigue pendiente; tarifas de entrega, contacto/términos, validación física y limitaciones previas conservan sus estados documentados.

Comprobación con configuración predeterminada: servidor en 8083 reiniciado, consultas sin interceptar al proyecto remoto, HTTP 200 y cero premios reales. La muestra del café aparece y su ficha conserva el botón deshabilitado, sin errores JS. Captura `cafe-default-project-mobile.png`. Servidor de pruebas de 8084 cerrado; sin overrides en archivos.

## Módulo validacion-cierre: revisión final del 14 de octubre

Especificación y plan/tareas aprobados en turnos posteriores. No hubo cambios nuevos de comportamiento: se contrastaron los archivos vigentes con las pruebas ya registradas y se conservó su validez. Se corrigió una referencia documental de coordenadas para apuntar al plan archivado de la universidad.

- `node .expo/qa/examples-closure.cjs`: aprobado. En un mismo contexto invitado aislado de Chrome se recorrió Inicio → Universidad de Pilar → Puntos verdes → Premios → Un café de Cafe del Pellegrini, usando controles de la interfaz y recargando ambas fichas. Universidad: dirección correcta, seis días 10–20, domingo cerrado y las 13 categorías cargadas; café: dirección compartida, 100 puntos y botón de ejemplo deshabilitado.
- Consultas públicas sin interceptar al proyecto predeterminado: HTTP 200, categorías 13, puntos reales 0, premios reales 0. Cero errores JS de página y cero llamadas a `delivery_command`/`reward_command` durante el recorrido. No se crearon cuentas ni operaciones en esta revisión.
- Seis capturas/observaciones, document width igual al viewport en 390/1280 px. Se inspeccionaron visualmente horario universitario móvil, catálogo móvil y ficha del café en escritorio; las revisiones de módulos anteriores conservan su evidencia adicional. Algunas fotos del catálogo aún estaban cargando al tomar esa captura; las fotos del café sí se observaron cargadas en las fichas y en la revisión previa del catálogo. No se presenta esa captura como comprobación de carga completa de todas las imágenes remotas.
- Informe estructurado: `output/verification/examples-closure.json`; capturas `closure-*.png`. Script QA local en `.expo/qa/`; evidencia ignorada por Git. No se añadieron suites redundantes ni se repitieron estática/exportación/SQL sobre código sin cambios.
- Lectura SQL local de limpieza: usuarios 0, empresas 0, puntos 0, premios 0, entregas 0, canjes 0 y movimientos 0. `fixture.json`, `supabase-start.log` y `.env.local` ausentes. No se borró información ajena. La app conserva URL/publishable key predeterminadas; no hay claves privilegiadas nuevas en cliente.
- Documentación y estados reconciliados: mapa y cuatro especificaciones completos; README y funcionalidades distinguen ejemplos, circuito operativo probado localmente y límites. Formato/diff y enlaces documentales revisados al cerrar.

Resultado: alcance web de ejemplo completado. Evidencia vigente: 38 pruebas locales, 321 comprobaciones SQL del circuito base, cuatro tests de concurrencia, pruebas de recuperación/navegación, tres escenarios web por muestra y revisión conjunta final, además de los circuitos y comprobaciones suplementarias descritos en este informe. No se suman conteos de ejecuciones repetidas como tests distintos.

Límites conservados: tarifas de entrega RAEE diferidas por el usuario; contacto oficial/términos sin configurar; validación física de cámara/archivos/recorridos nativos pendiente; recorte de etiquetas de navegación inferior observado bajo simulación CSS de texto ampliado; plantilla de recuperación alojada no modificada y configuración remota de contraseñas filtradas sin cambiar. Sin commit, despliegue ni publicación; este cierre no certifica producción completa ni una auditoría integral de accesibilidad.

## Preparación de commit y PR por solicitud posterior

El usuario solicitó explícitamente comitear, generar una PR y documentar pendientes. Se preparó una rama nueva desde `origin/main`, cuyo árbol coincide con la base del trabajo ya probado; la PR anterior de diseño estaba mergeada. El PDF preexistente del usuario y los artefactos de verificación/credenciales ignorados no forman parte de esta entrega.

Revisión de código enfocada en acceso, muestras, guards, mapa y pruebas. Mutación de control: cambiar temporalmente `&&` por `||` en la elegibilidad de entregas hizo fallar la prueba que rechaza ejemplos; se restauró el archivo original y pasaron las cinco pruebas enfocadas. No se mantuvo ninguna modificación de comportamiento nueva. La evidencia de estática, exportación e integración anterior conserva su validez.

Se agregó [PENDIENTES.md](../PENDIENTES.md) con prioridades, evidencia y criterios de cierre. El modal para credenciales incorrectas está documentado como mejora solicitada; no se implementó en este pedido de publicación de código. Esta entrega de Git no despliega la app ni modifica datos remotos.
