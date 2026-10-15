# Plan: Cafe del Pellegrini como premio de ejemplo

Módulo: `alta-cafe`. [Especificación aprobada](../SPEC-alta-cafe.md) el 14 de octubre de 2026.
Estado: plan y tareas aprobados por el usuario el 14 de octubre de 2026; módulo implementado y verificado; evidencia en `tasks/validation.md`.

## Resultado y decisiones

Cambiar la muestra existente `example-cafe` para mostrar **Un café**, **Cafe del Pellegrini**, gastronomía y **100 puntos**, con la misma dirección de la universidad. Conservar foto, ID y `demo: true`. No duplicar el premio ni modificar las otras muestras.

El cambio principal será `src/data/rewardExamples.ts`: tupla del café y dirección/descripcion específicas de ese registro. Mantener `hours: ''`, `stock: null` y coordenadas nulas. `RewardLocation` ya admite dirección textual sin mapa embebido y ofrece búsqueda externa por dirección. No requiere nuevos tipos, servicios ni componentes.

Catálogo y ficha ya distinguen muestras, conservan estados de carga/error y deshabilitan el canje. Verificar ese comportamiento antes de considerar cambios en pantallas. Si aparece un defecto, reproducirlo y corregirlo dentro de una tarea acotada, respetando `DESIGN.md`. No añadir tests que sólo repliquen constantes.

No cambiar Supabase, tarifas, permisos, cuentas operativas, stock o saldo. Las sesiones temporales de verificación serán exclusivamente locales y se limpiarán por ID. Para comprobar bloqueo con saldo suficiente se puede simular únicamente la respuesta de lectura de saldo en el navegador de prueba, identificándolo como fixture, sin acreditar dinero/puntos en la base.

## Orden y controles

1. Actualizar contenido del café y verificar estática/regresión local.
2. Verificar catálogo, búsqueda, filtro, ficha y bloqueo mediante navegador; revisar móvil/escritorio.
3. Documentar evidencia y completar exportación/formato.

Dependencias: 1 → 2 → control funcional → 3 → control final. Ejecución secuencial; no hacen falta agentes paralelos. Detalles y aceptación en `tasks/todo.md`, hasta cinco archivos por tarea.

Los controles verifican resultados y defectos antes de avanzar. No agregan nuevas consultas de permiso para decisiones rutinarias dentro del plan aprobado.

## Comandos

Desde la raíz del proyecto:

```powershell
npx tsc --noEmit
npm run lint
node --test tests/*.test.mjs
npx expo export --platform web --output-dir dist-closure
git diff --check
```

Desarrollo: `npx expo start --web --port 8083 --offline`. Para comprobaciones ciudadanas con Auth local, usar otro proceso en 8084 con URL/publishable key locales pasadas al proceso; verificar que el servidor está listo antes de ejecutar. No guardar secretos ni crear `.env.local` innecesariamente.

Runner de navegador, con la app de pruebas local disponible:

```powershell
$env:PLAYWRIGHT_MODULE_DIR = 'C:/Users/walte/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'
$env:TEST_APP_URL = 'http://localhost:8084'
node --test tests/integration/reward-examples.test.mjs
```

Reutilizar Chrome y el patrón de aislamiento/limpieza de `point-examples.test.mjs`. No instalar dependencias. Si no está disponible alguna herramienta, registrar el límite concreto y continuar comprobaciones independientes sin inventar resultados.

## Riesgos y respuesta

| Riesgo                                                       | Respuesta                                                                          |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| Dirección o descripción del café se propaga a otros ejemplos | Condicionar los datos al ID `cafe`; revisar las seis muestras.                     |
| El texto promete un canje disponible                         | Descripción de ejemplo y botón deshabilitado, incluso con sesión/saldo suficiente. |
| Muestras sustituyen un error o se agregan al catálogo real   | Probar carga, error/reintento y premio real disponible por separado.               |
| Fixture altera datos reales                                  | Auth y limpieza sólo en stack local; saldo simulado sólo en lectura de prueba.     |
| Dirección o comercio largo se recorta                        | Revisar tarjeta y ficha a 390 y 1280 px, foco y estados.                           |

## Historial y cierre

Universidad de Pilar está completada; su [plan y fuente de coordenadas](plan-alta-universidad.md) y [tareas](todo-alta-universidad.md) quedan archivados. Evidencia acumulada en [validation.md](validation.md). No había tareas sin completar al preparar este plan. Los artefactos de `cierre-flujos` también se conservan.

Se cierra `alta-cafe` cuando sus criterios están comprobados y documentados, con exportación y verificaciones aplicables aprobadas. Sigue pendiente `validacion-cierre`; no declarar terminada toda la iniciativa ni publicada la app.

Plan y tareas aprobados; implementación autorizada. No quedan preguntas de datos del café de ejemplo.
