# Especificación: revisión final del alcance de ejemplo

Module id: `validacion-cierre`.
Mapa: [CAPABILITY-MAP-cierre-app.md](CAPABILITY-MAP-cierre-app.md).
Estado: especificación, plan y tareas aprobados por el usuario el 14 de octubre de 2026. Revisión completada; evidencia y límites en `tasks/validation.md`.
Depende de: `alta-universidad` y `alta-cafe`, completados.

## Objetivo y supuestos

Cerrar el alcance web acordado, comprobando Universidad de Pilar y Cafe del Pellegrini en un mismo recorrido y reconciliando la evidencia con la documentación. Las muestras no representan servicios operativos ni deben generar entregas, puntos o canjes reales.

Los datos y límites ya aprobados permanecen: universidad en la dirección indicada, lunes a sábado de 10 a 20 y todas las categorías cargadas; café en la misma dirección, Un café por 100 puntos; tarifas RAEE diferidas. No incorporar funciones, cuentas operativas ni condiciones comerciales nuevas.

La revisión reutiliza la evidencia vigente de `cierre-flujos`, `alta-universidad` y `alta-cafe`. No repite verificaciones aprobadas sobre código sin cambios. Si detecta una regresión, registra reproducción, corrección mínima y pruebas afectadas antes de cerrar.

## Comportamiento y alcance de la revisión

1. En la misma sesión invitada, abrir Inicio → Universidad de Pilar → Puntos verdes → Premios → Un café de Cafe del Pellegrini. Comprobar datos, avisos, navegación y recargas; ninguna muestra ofrece operación real.
2. Confirmar que la app conserva la conexión predeterminada y que las lecturas públicas del catálogo no se sustituyen por ejemplos ante errores. Reutilizar las pruebas ya aprobadas de errores, catálogo real y sesiones locales, salvo cambios posteriores.
3. Conservar la prueba del circuito operativo real entre organizaciones aisladas del primer módulo como evidencia local separada. No intentar completar entrega → saldo → canje entre los lugares de ejemplo.
4. Revisar documentación, criterios y estado de módulos; distinguir pruebas ejecutadas, fixtures, lectura remota y límites físicos/operativos. No convertir un pendiente conocido en una comprobación aprobada.
5. No publicar ni desplegar la app, crear empresas/cuentas reales, cambiar tarifas o infraestructura como parte de esta revisión.

## Tecnología y estructura

Expo SDK 57, React Native y Supabase existentes. No se agregan dependencias ni migraciones.

```text
SPEC-*.md, CAPABILITY-MAP-cierre-app.md  Contratos y estado de módulos
tasks/validation.md                    Evidencia y limitaciones acumuladas
tasks/plan.md, tasks/todo.md            Plan y tareas activos
README.md, PROYECTO_Y_FEATURES.md       Estado funcional del producto
tests/integration/                     Regresiones de navegador existentes
output/verification/                   Evidencia visual ignorada por Git
```

## Comandos

Disponibles desde la raíz; ejecutar sólo los pertinentes a cambios o dudas nuevos:

```powershell
git diff --check
npx tsc --noEmit
npm run lint
node --test tests/*.test.mjs
npx expo export --platform web --output-dir dist-closure
```

Regresiones existentes, con servidor de pruebas configurado para Supabase local y runtime disponible:

```powershell
$env:PLAYWRIGHT_MODULE_DIR = 'C:/Users/walte/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'
$env:TEST_APP_URL = 'http://localhost:8084'
node --test tests/integration/point-examples.test.mjs tests/integration/reward-examples.test.mjs
```

La revisión conjunta invitada puede usar el servidor predeterminado en `http://localhost:8083`, sin cuentas ni interceptar consultas. No ejecutar pruebas con fixtures contra la base remota. Un entorno no disponible se informa con evidencia, sin simular éxito.

## Estilo

Mantener formato Markdown/Prettier, enlaces locales verificables y resultados concretos. Ejemplo de reporte:

```text
Comprobación: ficha del café tras recarga.
Resultado: dirección y 100 puntos visibles; botón de ejemplo deshabilitado.
Entorno: web, proyecto predeterminado; sin operaciones de canje.
```

No se prevén cambios de interfaz. Si un defecto exige código, leer Expo 57 y `DESIGN.md`, conservar tema y componentes y limitar la corrección al defecto reproducido.

## Estrategia de verificación

- Contrastar criterios de los tres módulos completados con `tasks/validation.md` y el código vigente; resultados aprobados sin cambios se conservan como evidencia, con su fecha/entorno.
- Recorrer ambas muestras en una sesión web, observar errores de página y ausencia de operaciones reales. Revisar visualmente cualquier nueva captura antes de afirmar que se revisó.
- Verificar limpieza de fixtures y ausencia de overrides/secretos persistidos; no eliminar datos ajenos o archivos del usuario.
- Si hay correcciones, ejecutar regresiones afectadas y las comprobaciones estáticas/exportación pertinentes. No introducir pruebas que sólo repitan textos ni repetir suites SQL sin cambios que lo justifiquen.

## Límites

- **Siempre:** conservar datos/permisos, evidencia trazable y distinción entre muestras y operaciones, documentar límites y pendientes, limpiar sólo fixtures propias.
- **Consultar antes:** ampliar producto, convertir ejemplos en altas operativas o cambiar infraestructura/identidad. Corregir regresiones rutinarias dentro del alcance autorizado sin otra consulta.
- **Nunca:** afirmar publicación o validación física no realizada; inventar tarifas, responsables, stock, contactos o resultados; debilitar permisos; registrar operaciones reales sobre ejemplos.

## Criterios de aceptación

- [x] Ambas muestras se recorren en la misma sesión y conservan datos, avisos y navegación aprobados.
- [x] No se crean operaciones reales; evidencia de bloqueo para invitado/ciudadano y prioridad de catálogos reales conservada.
- [x] Resultados y documentación coinciden con el estado final; los pendientes no figuran aprobados.
- [x] Limpieza y configuración predeterminada comprobadas, sin secretos ni fixtures propias remanentes.
- [x] Verificaciones pertinentes vigentes/aprobadas; cualquier corrección nueva cuenta con regresión y revisión correspondiente.
- [x] El alcance web de ejemplo queda cerrado, con límites explícitos: tarifas RAEE diferidas, contacto/términos sin configurar, comprobación física pendiente y recorte observado en navegación inferior bajo simulación CSS de texto ampliado. Estos límites no se presentan como producción terminada.

## Preguntas abiertas y aprobación

No se requieren nuevos datos de producto para esta revisión. La especificación define el cierre del alcance de ejemplo sin añadir funcionalidades ni convertirlo en despliegue.

El usuario aprobó esta especificación y luego su plan/tareas en turnos posteriores. Revisión conjunta, limpieza y documentación completadas. Los artefactos anteriores y la evidencia se conservan; no quedan puertas de aprobación pendientes para este alcance.
