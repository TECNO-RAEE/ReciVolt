# Especificación: Cafe del Pellegrini y Un café como muestra

Module id: `alta-cafe`.
Mapa: [CAPABILITY-MAP-cierre-app.md](CAPABILITY-MAP-cierre-app.md).
Estado: especificación, plan y tareas aprobados por el usuario el 14 de octubre de 2026. Implementada y verificada; evidencia y límites en `tasks/validation.md`.
Depende de: `cierre-flujos`, completado.

## Objetivo

Mostrar **Cafe del Pellegrini** en el catálogo y detalle de premios de ejemplo con **Un café** por **100 puntos globales**, para completar la demostración pedida por el usuario. No crear una empresa operativa, una cuenta ni un canje real.

## Supuestos y datos

- El usuario aclaró «es de ejemplo» al consultar las cuentas responsables, y aprobó el alcance de muestras sin operaciones reales. Se mantiene esa interpretación para el café.
- Comercio: `Cafe del Pellegrini`. Premio: `Un café`. Categoría gastronómica existente: `food`. Costo: 100 puntos, elección delegada por el usuario.
- Dirección: `Av. Honorio Pueyrredón, Ruta 25 Nº1837, Villa Rosa, Provincia de Buenos Aires`, igual que la universidad.
- No se confirmaron horario, stock, tipo/tamaño del café ni condiciones comerciales. No inventarlos. La foto de café existente puede conservarse como ilustración de muestra.
- La tarifa de entrega RAEE sigue diferida; 100 es el costo mostrado del premio, no una acreditación por dispositivo ni equivalencia monetaria.

## Comportamiento

1. Reemplazar la muestra existente de Café del Parque por los datos solicitados, conservando el ID `example-cafe` para enlaces existentes. No añadir un segundo café duplicado.
2. La tarjeta y ficha muestran Un café, Cafe del Pellegrini y 100 puntos; la ficha muestra la dirección confirmada. La descripción identifica el premio como ejemplo.
3. Conservar la selección actual de muestras: aparecen en el catálogo después de cargar correctamente un catálogo sin premios disponibles. Los errores mantienen reintento y no se sustituyen por ejemplos. Si hay premios reales disponibles, no añadir las muestras al catálogo.
4. Búsqueda por comercio/premio y filtro gastronómico encuentran el café de muestra. Una búsqueda sin coincidencias no reconstruye el catálogo ni genera un premio real.
5. La ficha mantiene el aviso y botón deshabilitado **Premio de ejemplo**, tanto para invitado como para ciudadano, aunque tenga saldo suficiente. Abrir o recargar `/reward/example-cafe` no reserva, debita, genera QR ni crea historial.
6. No crear ni publicar una empresa o premio en Supabase. No asignar propietario, membresías, invitaciones, saldo o stock. No inventar horarios de canje. Los demás ejemplos conservan sus datos y los premios reales sus operaciones.
7. No se requiere mapa del café para cumplir esta muestra: la dirección sigue siendo útil con coordenadas nulas, mediante el comportamiento existente de ubicación del premio. Cualquier coordenada que se añada debe tener evidencia verificable y representar la misma sede, sin afirmar operación comercial real.

## Tecnología y estructura

Expo `~57.0.26`, Expo Router `~57.0.24`, React Native `0.86.3`, React `19.2.3`, TypeScript `~6.0.3` y servicios Supabase actuales. Sin nuevas dependencias ni migraciones. Consultar documentación Expo 57 antes de código y `DESIGN.md` antes de interfaz.

```text
src/data/rewardExamples.ts          Muestras actuales; cambio principal de contenido
src/app/(app)/rewards.tsx           Catálogo, búsqueda y filtro existentes
src/app/reward/[id].tsx             Ficha y bloqueo de canje existentes
src/components/rewards/            Tarjeta, foto, ubicación y avisos compartidos
tests/integration/                 Verificación web si requiere un runner duradero
tasks/                             Plan, tareas y evidencia
README.md, PROYECTO_Y_FEATURES.md   Estado funcional comprobado
```

El cambio principal es de datos estáticos. No modificar pantallas o servicios que ya cumplen el contrato; corregir sólo un defecto reproducido dentro de este recorrido.

## Comandos

Desde la raíz del repositorio, en PowerShell:

```powershell
npm run web
npx tsc --noEmit
npm run lint
node --test tests/*.test.mjs
npx expo export --platform web --output-dir dist-closure
git diff --check
```

Para navegador se dispone de Chrome y Playwright en el runtime ya utilizado. Verificar su disponibilidad y un servidor local antes de probar. Si se crea una regresión duradera para el bloqueo o los estados, seguir el runner `tests/integration/point-examples.test.mjs`; cualquier cuenta temporal se limita a Supabase local y se limpia por ID.

## Estilo de código

Mantener el patrón de datos y tipos actual, imports `@/`, formato Prettier y textos en español. Ejemplo del resultado esperado en la tupla existente:

```typescript
['cafe', 'Un café', 'Cafe del Pellegrini', 'food', 100, 'photo-1509042239860-f550ce710b93'];
```

Aplicar dirección/descripcion sólo al registro del café, sin contaminar las otras muestras. Conservar `demo: true`, stock desconocido y ausencia de horarios. Reutilizar `ScreenHeader`, `RewardsUI`, `ActionButton` y tema si se detecta una corrección de interfaz necesaria.

## Estrategia de verificación

- No añadir tests que sólo copien constantes para este cambio estático. Ejecutar las regresiones existentes y verificar el resultado visible.
- Navegador: catálogo exitoso vacío, búsqueda por `Pellegrini` y `café`, filtro gastronómico, ficha y recarga, dirección y costo. Error/reintento y catálogo con datos reales deben conservar su comportamiento.
- Invitado y ciudadano local: botón deshabilitado, ausencia de reserva/débito/QR e historial generado por la muestra. Si un defecto de lógica aparece, reproducirlo con una prueba antes de corregirlo.
- Revisión visual móvil/escritorio de tarjeta y ficha, dirección larga, estados y foco según `DESIGN.md`. Distinguir simulación web de escala de texto de prueba física nativa.
- TypeScript, lint, tests locales, exportación y diff. No repetir suites SQL si no hay cambios de backend. Registrar resultados y límites en `tasks/validation.md`.

## Límites

- **Siempre:** identificar la muestra, conservar bloqueo de canje, dirección/costo confirmados, prioridad de datos reales y estados de error, identidad visual compartida y limpieza de fixtures locales.
- **Consultar antes:** convertir el comercio en empresa operativa o ampliar alcance, dependencias o identidad. Las decisiones rutinarias dentro del alcance aprobado se resuelven sin otra autorización.
- **Nunca:** crear cuentas o roles ficticios, acreditar saldo supuesto, reservar ejemplos, inventar stock/horarios/condiciones, escribir muestras en Supabase o presentar verificación web como prueba física.

## Criterios de aceptación

- [x] La muestra `example-cafe` presenta Un café, Cafe del Pellegrini, gastronomía y 100 puntos.
- [x] La ficha muestra la dirección indicada, aviso de ejemplo y ninguna disponibilidad o condición inventada.
- [x] Catálogo, búsqueda, filtro y recarga funcionan; errores y datos reales conservan su comportamiento.
- [x] Invitado y ciudadano no pueden reservar la muestra; no se crea débito, QR o historial.
- [x] No se escriben datos operativos en Supabase ni se asignan cuentas/permisos.
- [x] Los demás ejemplos y los premios reales conservan su comportamiento.
- [x] Cambio de contenido completado, con revisión visual y verificaciones aplicables aprobadas y documentadas.

## Preguntas abiertas y aprobación

No se necesitan más datos para esta muestra. Horario, stock y responsables son datos de una eventual alta operativa y quedan fuera.

El usuario aprobó esta especificación en un turno posterior y luego el plan/tareas. Implementación y verificaciones completadas. Los artefactos completados de Universidad de Pilar se conservan en `tasks/plan-alta-universidad.md` y `tasks/todo-alta-universidad.md`.
