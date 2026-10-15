# Tareas: validacion-cierre

Especificación [aprobada](../SPEC-validacion-cierre.md). [Plan](plan.md) y tareas aprobados el 14 de octubre de 2026; módulo completado; evidencia y límites en `tasks/validation.md`.

## Tarea 1: contrastar evidencia vigente

- [x] Completada.
- **Resultado:** comprobar que alcance, aprobaciones, código y resultados de los módulos terminados coinciden.
- **Aceptación:** los cambios posteriores no invalidan pruebas citadas; estados de universidad/café y circuito operativo local se distinguen; enlaces a artefactos archivados permiten seguir las decisiones.
- **Verificar:** leer specs/evidencia, revisar `git diff`/`git status` y archivos afectados. No repetir checks aprobados sobre código sin cambios.
- **Depende de:** ninguna.
- **Archivos:** `tasks/validation.md`; enlaces documentales puntuales si se detectan desactualizados, hasta cinco archivos por ajuste.
- **Tamaño:** pequeño; revisión sin cambios de producto previstos.

## Tarea 2: comprobar el recorrido conjunto y la limpieza

- [x] Verificada con evidencia.
- **Resultado:** recorrer ambos ejemplos en la misma sesión invitada y confirmar configuración/ausencia de operaciones.
- **Aceptación:** datos, avisos, recargas y navegación correctos; sin llamadas de entrega/canje ni errores JS; configuración predeterminada y ausencia de fixtures/overrides propios remanentes comprobadas.
- **Verificar:** `node .expo/qa/examples-closure.cjs` con servidor listo en 8083; lecturas públicas sin interceptar salvo que el catálogo remoto haya cambiado, en cuyo caso documentar claramente la alternativa. Revisar las capturas nuevas antes de afirmar revisión visual. Inspección local de fixtures y archivos, sin eliminación ajena.
- **Depende de:** 1.
- **Archivos:** `.expo/qa/examples-closure.cjs` (QA temporal), `tasks/validation.md`; capturas/informe en `output/verification/`.
- **Tamaño:** pequeño, dos archivos más evidencia ignorada por Git.

### Control de revisión

- [x] Evidencia previa sigue vigente y recorrido conjunto aprobado.
- [x] Datos reales, ejemplos y límites diferenciados; ningún hallazgo pendiente se presenta como corregido.
- [x] Si hubo corrección nueva, reproducción y regresiones afectadas registradas antes de avanzar.

## Tarea 3: cerrar documentación y estado final

- [x] Completada y verificada.
- **Resultado:** informar el alcance web de ejemplo cerrado y conservar sus límites operativos/físicos.
- **Aceptación:** README/funcionalidades, mapa y spec reflejan resultados; criterios marcados sólo con evidencia; tarifas RAEE diferidas, contacto/términos sin configurar, pruebas físicas pendientes y recorte observado con texto ampliado siguen explícitos.
- **Verificar:** `git diff --check`; formato y enlaces de archivos modificados; contraste con `tasks/validation.md`. Ejecutar estática/tests/exportación sólo si nuevos cambios lo justifican. No publicar ni desplegar.
- **Depende de:** control de revisión.
- **Archivos:** `README.md`, `PROYECTO_Y_FEATURES.md`, `CAPABILITY-MAP-cierre-app.md`, `SPEC-validacion-cierre.md`, `tasks/validation.md`. Actualizaciones de estado en plan/tareas acompañan el cierre.
- **Tamaño:** mediano, cinco archivos.

### Control final

- [x] Criterios de la especificación comprobados y mapa cerrado para el alcance web de ejemplo.
- [x] Evidencia trazable, limpieza comprobada y límites incluidos en la entrega.
- [x] Sin operaciones reales sobre ejemplos, secretos persistidos, datos ajenos eliminados ni publicación implícita.
