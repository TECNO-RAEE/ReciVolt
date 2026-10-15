# Tareas: alta-cafe

Especificación [aprobada](../SPEC-alta-cafe.md). [Plan](plan-alta-cafe.md) y tareas aprobados el 14 de octubre de 2026. Módulo completado; evidencia en `tasks/validation.md`.

## Tarea 1: actualizar la muestra del café

- [x] Implementada y verificada.
- **Resultado:** reemplazar los datos del café existente, manteniendo `example-cafe` y su foto.
- **Aceptación:** Un café, Cafe del Pellegrini, gastronomía y 100 puntos; dirección confirmada y descripción de ejemplo sólo para ese registro; sin horarios/stock inventados y otras muestras intactas.
- **Verificar:** `npx tsc --noEmit`; `npm run lint`; `node --test tests/*.test.mjs`; revisión del diff. Leer Expo 57 antes de código y `DESIGN.md` antes de interfaz. No añadir tests que sólo copien constantes.
- **Depende de:** ninguna.
- **Archivos:** `src/data/rewardExamples.ts`.
- **Tamaño:** pequeño, un archivo.

## Tarea 2: verificar el recorrido del premio de ejemplo

- [x] Verificada con evidencia.
- **Resultado:** comprobar catálogo y ficha sin permitir canje ni operaciones de ejemplo.
- **Aceptación:** búsqueda por café/Pellegrini y filtro gastronómico, dirección/costo/aviso y recarga; carga/error/reintento y catálogo real conservados; invitado y ciudadano con saldo de lectura simulado suficiente tienen canje deshabilitado, sin reserva, débito, QR o historial.
- **Verificar:** `node --test tests/integration/reward-examples.test.mjs` con entorno del plan. Observar ausencia de RPC de reserva y de navegación a canjes. Revisar tarjeta/ficha a 390/1280 px, foco, textos largos y estados; guardar capturas en `output/verification/`. Cuenta temporal sólo local, origen Auth comprobado y cleanup por ID; no leer tokens del navegador.
- **Depende de:** 1.
- **Archivos:** `tests/integration/reward-examples.test.mjs` (runner nuevo, reutilizando patrones existentes), evidencia en `tasks/validation.md`.
- **Tamaño:** pequeño, dos archivos. Si aparece un defecto de producto, registrar antes una subtarea de corrección de hasta cinco archivos, con reproducción y regresión; no reescribir pantallas que ya cumplen.

### Control funcional

- [x] Estática, regresión y recorrido web aprobados, con revisión visual real.
- [x] Sin stock/horarios inventados, escrituras remotas, reserva o saldo acreditado; fixture local eliminada.
- [x] La muestra universitaria y los datos reales mantienen su comportamiento.

## Tarea 3: documentar y cerrar alta-cafe

- [x] Completada y verificada.
- **Resultado:** estado comprobado y evidencia del café, conservando los límites de las muestras y los pendientes restantes.
- **Aceptación:** documentación distingue ejemplo y operación real; criterios marcados sólo con evidencia; tarifa de entregas y validación final conservan su estado.
- **Verificar:** `npx expo export --platform web --output-dir dist-closure`; formato de archivos modificados; `git diff --check`; revisar enlaces y resultados. Sin repetir SQL cuando no hubo cambios de backend.
- **Depende de:** control funcional.
- **Archivos:** `README.md`, `PROYECTO_Y_FEATURES.md`, `SPEC-alta-cafe.md`, `CAPABILITY-MAP-cierre-app.md`, `tasks/validation.md`.
- **Tamaño:** mediano, cinco archivos. Actualizaciones de estado en plan/tareas acompañan el cierre.

### Control final

- [x] Criterios de `SPEC-alta-cafe.md` comprobados; TypeScript, lint, regresión, navegador, exportación y formato aprobados.
- [x] Evidencia visual y límites físicos/nativos registrados, sin presentar una prueba web como validación física.
- [x] Conexión predeterminada conservada, fixtures locales retiradas y sin secretos persistidos.
- [x] `validacion-cierre` sigue visible como módulo pendiente; sin commit, despliegue ni publicación implícitos.
