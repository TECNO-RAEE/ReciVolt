# Plan: revisión final del alcance de ejemplo

Módulo: `validacion-cierre`. [Especificación aprobada](../SPEC-validacion-cierre.md) el 14 de octubre de 2026.
Estado: plan y tareas aprobados por el usuario el 14 de octubre de 2026; revisión completada; evidencia y límites en `tasks/validation.md`.

## Resultado y decisiones

Cerrar el alcance web de ejemplo con evidencia conjunta de Universidad de Pilar y Cafe del Pellegrini, configuración predeterminada y fixtures limpias. No crear funciones ni convertir los ejemplos en operaciones reales.

Reutilizar la evidencia de los módulos terminados: 38 pruebas locales, tres escenarios web por ejemplo, TypeScript/lint/exportación, además de las pruebas transaccionales del primer módulo. Sólo volver a ejecutar checks si hay cambios de código, fallos nuevos o una duda concreta. La revisión conjunta agrega el recorrido de ambos ejemplos en una misma sesión.

Usar Chrome aislado con Playwright y el servidor predeterminado en 8083. Observar sólo datos públicos, errores de página y rutas de solicitudes operativas; no leer tokens/cookies ni crear cuentas. Si el servidor no está disponible, iniciarlo con la configuración existente. No reemplazar datos remotos para forzar muestras.

La limpieza se comprueba por lectura del entorno local y archivos de prueba. No eliminar datos o archivos ajenos. Un hallazgo real se corrige sólo dentro del alcance autorizado y se vuelve a verificar lo afectado; no se agregan nuevas puertas de permiso para correcciones rutinarias.

## Orden y controles

1. Contrastar evidencia, aprobaciones y cambios vigentes de los tres módulos.
2. Recorrer ambas muestras en la misma sesión, comprobar configuración y limpieza.
3. Reconciliar documentación, registrar límites y cerrar criterios/módulos.

Dependencias: 1 → 2 → control de revisión → 3 → control final. Trabajo secuencial, sin agentes paralelos. Detalles en `tasks/todo.md`; hasta cinco archivos por tarea, salvo actualizaciones rutinarias del seguimiento.

## Verificaciones

Comprobación conjunta mediante un script QA local de una ejecución, sin añadir pruebas que dupliquen las suites ya aprobadas:

```powershell
node .expo/qa/examples-closure.cjs
git diff --check
```

El script usará el runtime Playwright ya disponible, hará Inicio → universidad → Puntos verdes → Premios → café, verificará direcciones, horarios/categorías y costo, recargará ambas fichas y comprobará que no se solicitan operaciones de entrega/canje. Capturas e informe JSON en `output/verification/`, sin credenciales.

Si hace falta iniciar la app:

```powershell
npx expo start --web --port 8083 --offline
```

Sólo ante correcciones nuevas o dudas concretas:

```powershell
npx tsc --noEmit
npm run lint
node --test tests/*.test.mjs
npx expo export --platform web --output-dir dist-closure
```

Las regresiones de navegador con cuentas se ejecutan únicamente contra Supabase local, siguiendo los comandos de la especificación. No repetir SQL ni crear fixtures nuevas si la revisión invitada no lo necesita.

## Riesgos y respuesta

| Riesgo                                                    | Respuesta                                                                                                                                                       |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Documentación histórica parece describir el estado actual | Identificar fechas/módulos y enlazar los planes archivados correctos.                                                                                           |
| Cambió el catálogo remoto y ya tiene datos reales         | Conservar prioridad del catálogo real; no borrar publicaciones. Documentar el estado y usar lectura simulada aislada sólo si es necesario revisar las muestras. |
| Se confunde saldo de prueba con puntos acreditados        | Conservar la aclaración del saldo interceptado del café y las pruebas operativas locales separadas.                                                             |
| Un pendiente se presenta como producción completa         | Cerrar sólo alcance web de ejemplo; detallar tarifas diferidas, contacto/términos, pruebas físicas y limitación de texto ampliado.                              |

## Historial y cierre

Los planes/tareas anteriores estaban completos y se conservan: [cierre-flujos](plan-cierre-flujos.md), [universidad y fuente de coordenadas](plan-alta-universidad.md), [café](plan-alta-cafe.md), con sus listas de tareas correspondientes. Evidencia acumulada en [validation.md](validation.md).

Al cumplir los criterios, marcar `validacion-cierre` y el mapa como completados para el alcance web de ejemplo. Conservar explícitos los límites; no hacer commit, despliegue o publicación implícitos.

Plan y tareas aprobados y completados; alcance web de ejemplo cerrado. No se necesitan nuevos datos del usuario.
