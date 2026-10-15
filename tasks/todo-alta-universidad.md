# Tareas: alta-universidad

Especificación [aprobada](../SPEC-alta-universidad.md); [plan](plan-alta-universidad.md) y tareas aprobados el 14 de octubre de 2026; módulo verificado; evidencia y límites en `tasks/validation.md`. Los artefactos completos del módulo anterior están en `plan-cierre-flujos.md` y `todo-cierre-flujos.md`.

## Tarea 1: definir la muestra y sus reglas

- [x] Implementada y verificada.
- **Resultado:** Universidad de Pilar con ID estable, marca de ejemplo y selección pura para catálogo real vacío.
- **Aceptación:** datos/coordenadas coinciden con especificación y fuente; lunes–sábado 10–20 y categorías proporcionadas sin mutarlas; datos reales tienen prioridad y no se inventan categorías/contactos.
- **Verificar:** `node --test tests/point-examples.test.mjs tests/discovery.test.mjs tests/point-schedule.test.mjs`; lunes/sábado, domingo, límites 10/20 en zona argentina, categorías vacías/dinámicas, búsqueda/filtros. `npx tsc --noEmit`.
- **Depende de:** ninguna. Leer documentación Expo 57 antes de código y skills de implementación requeridas.
- **Archivos:** `src/models/GreenPoint.ts`, `src/data/greenPointExamples.ts` (nuevo), `tests/point-examples.test.mjs` (nuevo), `tests/discovery.test.mjs` si precisa regresión adicional.
- **Tamaño:** mediano, hasta cuatro archivos.

## Tarea 2: impedir entregas sobre muestras

- [x] Implementada y verificada.
- **Resultado:** guard compartido aplicado a selector y URL antes de montar el formulario.
- **Aceptación:** no seleccionar ejemplos ni montar `DeliveryForm`/consultar tarifas para su ID; aviso con regreso a Puntos verdes; puntos reales conservan selección/formulario.
- **Verificar:** `node --test tests/point-examples.test.mjs tests/delivery.test.mjs`; `npx tsc --noEmit`; revisar la bifurcación previa al formulario. URL y ausencia de operaciones se comprueban en navegador en tarea 5.
- **Depende de:** 1.
- **Archivos:** `src/models/GreenPoint.ts`, `src/app/new-delivery.tsx`, `tests/point-examples.test.mjs`.
- **Tamaño:** mediano, tres archivos.

### Control A: datos y protección

- [x] Reglas, horarios y elegibilidad con pruebas aprobadas; TypeScript y lint pasan.
- [x] La muestra todavía no se activó en el provider; sin tarifas, cuentas, escrituras ni dependencias nuevas.

## Tarea 3: identificar el ejemplo en lista, Inicio y ficha

- [x] Implementada y verificada.
- **Resultado:** superficies ciudadanas preparadas para distinguir la muestra sin ofrecer recepción real.
- **Aceptación:** aviso “Punto verde de ejemplo”, horario de ejemplo y dirección legibles en fila/ficha y contexto de Inicio; sin CTA activo de entrega ni afirmación de recepción real; estados, filtros, puntos reales y navegación conservados.
- **Verificar:** `npx tsc --noEmit`; `npm run lint`; revisar condiciones de muestra/reales. Revisión visual completa al activar en tarea 5. Aplicar `DESIGN.md`, componentes y tema compartidos.
- **Depende de:** control A.
- **Archivos:** `src/components/discovery/PointRow.tsx`, `src/app/(app)/green-points.tsx`, `src/app/(app)/home.tsx`, `src/app/point/[id].tsx`.
- **Tamaño:** mediano, cuatro archivos.

## Tarea 4: distinguir los marcadores de ejemplo

- [x] Implementada y verificada.
- **Resultado:** texto y accesibilidad del marcador identifican la muestra en web y nativo.
- **Aceptación:** marca de ejemplo en tooltip/descripcion y etiqueta accesible pertinente; coordenadas verificadas y selección hacia ficha; atribución, controles y puntos reales intactos.
- **Verificar:** `npx tsc --noEmit`; `npm run lint`; revisar ambos adaptadores. Mapa web en tarea 5; revisar código nativo no equivale a prueba física.
- **Depende de:** 3.
- **Archivos:** `src/components/discovery/PointsMap.web.tsx`, `src/components/discovery/PointsMap.tsx`.
- **Tamaño:** pequeño, dos archivos.

### Control B: presentación preparada

- [x] Todas las superficies identifican muestras; entregas protegidas y mapas compatibles.
- [x] Estática aprobada; diff revisado contra especificación antes de activar datos.

## Tarea 5: activar y comprobar el recorrido

- [x] Implementada y verificada.
- **Resultado:** selección del ejemplo tras éxito vacío en provider y prueba de navegador del recorrido.
- **Aceptación:** muestra sólo tras éxito vacío, sin reemplazar carga/error ni datos reales; búsqueda/categorías, ficha/recarga y mapa sin ubicación; URL de entrega rechazada sin tarifas, uploads ni creación de operación.
- **Verificar:** `node --test tests/*.test.mjs`; `node --test tests/integration/point-examples.test.mjs` con runtime/URL del plan; TypeScript y lint. Navegador invitado y ciudadano local, estados de catálogo/reintento, filtros sin coincidencias y ausencia de operaciones. Revisar 390/1280 px, foco, texto aumentado y desbordes; evidencia en `output/verification/` sin credenciales.
- **Depende de:** control B.
- **Archivos:** `src/providers/DiscoveryProvider.tsx`, `tests/integration/point-examples.test.mjs` (nuevo), evidencia en `tasks/validation.md`.
- **Tamaño:** mediano, tres archivos. Defectos de presentación vuelven a su tarea.

## Tarea 6: documentar y cerrar el módulo

- [x] Implementada y verificada.
- **Resultado:** documentación coherente con muestra y evidencia, sin declarar completada toda la iniciativa.
- **Aceptación:** documentación distingue muestras de organizaciones reales; criterios marcados sólo según evidencia; café, validación final y tarifa de entrega mantienen estados pendientes.
- **Verificar:** `npx expo export --platform web --output-dir dist-closure`; `git diff --check`; formato, enlaces y contraste con criterios. Sin repetir SQL ante ausencia de cambios de backend.
- **Depende de:** 5.
- **Archivos:** `README.md`, `PROYECTO_Y_FEATURES.md`, `SPEC-alta-universidad.md`, `CAPABILITY-MAP-cierre-app.md`, `tasks/validation.md`.
- **Tamaño:** mediano, cinco archivos.

### Control final: alta-universidad

- [x] Criterios comprobados; TypeScript, lint, tests y exportación aprobados.
- [x] Revisión visual móvil/escritorio realizada; límites nativos explícitos.
- [x] Sin operaciones reales, credenciales persistidas, roles, tarifas o cambios de Supabase para la muestra; fixtures locales retiradas si se usaron.
- [x] Overrides temporales retirados y conexión predeterminada conservada.
- [x] Estado actualizado y siguientes módulos visibles; sin commit, despliegue o publicación implícitos.
