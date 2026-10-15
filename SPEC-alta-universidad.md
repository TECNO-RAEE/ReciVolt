# Especificación: Universidad de Pilar como punto de ejemplo

Module id: `alta-universidad`.
Mapa: [CAPABILITY-MAP-cierre-app.md](CAPABILITY-MAP-cierre-app.md).
Estado: especificación, plan y tareas aprobados por el usuario el 14 de octubre de 2026. Implementada y verificada; evidencia y límites en `tasks/validation.md`.
Depende de: `cierre-flujos`, verificado.

## Objetivo

Permitir que un visitante o ciudadano explore Universidad de Pilar en Puntos verdes y su ficha cuando el catálogo real esté vacío. La muestra permite revisar el recorrido de descubrimiento con los datos pedidos y deja claro que no confirma un servicio real de recepción ni permite registrar entregas.

## Supuestos y datos confirmados

- Se interpreta «es de ejemplo», respuesta del usuario a la consulta por cuentas responsables, como una muestra informativa. No se crea una organización operativa ni se asignan permisos a personas reales.
- Nombre: **Universidad de Pilar**.
- Dirección: **Av. Honorio Pueyrredón, Ruta 25 Nº1837, Villa Rosa, Provincia de Buenos Aires**.
- Horario de muestra: **lunes a sábado, 10:00 a 20:00**. Domingo cerrado. Zona horaria `America/Argentina/Buenos_Aires`.
- Recibe todas las categorías disponibles en el catálogo activo de dispositivos; no se fijan UUID de categorías de un entorno particular.
- Las tarifas por entrega quedan pendientes por decisión del usuario. No se muestran equivalencias ni puntos ganados supuestos.
- No se inventan teléfono, email, retiros, personal responsable ni coordenadas exactas.

## Contrato de comportamiento

1. Tras una consulta exitosa sin puntos reales publicados, mostrar la muestra con el aviso **Punto verde de ejemplo** en lista y ficha. El aviso explica que no recibe entregas registradas desde la app. Inicio debe conservar la misma distinción si presenta este punto.
2. Una carga pendiente conserva su estado de carga. Un error conserva mensaje y reintento: nunca se sustituye por la muestra. Si hay puntos reales, mostrar el catálogo real sin añadir este ejemplo, como ocurre con las muestras de premios.
3. La búsqueda por nombre, dirección y categorías, y los filtros aplicables, incluyen la muestra. Una búsqueda sin coincidencias conserva su propio estado vacío. No se requiere permiso de ubicación para leer lista o ficha.
4. La ficha conserva los datos confirmados y todos los días del horario. Cualquier estado abierto/cerrado corresponde al horario de ejemplo y no promete disponibilidad real.
5. Antes de colocar un marcador o calcular distancias, verificar las coordenadas de la sede con una fuente identificable y registrar la evidencia. Si no se consigue una ubicación verificable, conservar dirección y ficha, omitir marcador/distancia del ejemplo y explicar la ubicación pendiente sin perjudicar los mapas de puntos reales. La navegación externa puede buscar por la dirección textual.
6. No ofrecer un botón activo para registrar entrega en la muestra. Una entrada directa a nueva entrega con su ID tampoco envía `delivery_command`, sube fotos ni genera QR. El mensaje explica el motivo y permite volver a Puntos verdes.
7. Las categorías se toman del catálogo obtenido correctamente. La ausencia de categorías no se sustituye por UUID o categorías inventadas, ni habilita una entrega.
8. No hay escrituras de estas muestras en Supabase, cuentas ficticias, roles, membresías, tarifas o saldo. El catálogo real, sus servicios y permisos siguen funcionando.

## Interfaces y alcance

La identidad estable de la muestra debe distinguirse de IDs persistidos. El modelo de descubrimiento debe permitir reconocer explícitamente un punto de ejemplo; la capa de presentación y el inicio de entrega comparten esa distinción. Los puntos reales mantienen sus coordenadas y comportamiento actuales. Los IDs de muestra no se envían a RPC como identificadores reales.

Este módulo consume `DiscoveryProvider`, las categorías reales y la navegación ya verificados. Proporciona a `validacion-cierre` una muestra identificable y comprobable. Cafe del Pellegrini y Un café pertenecen al módulo `alta-cafe`; no se modifican sus muestras en esta etapa.

## Tecnología

Expo `~57.0.26`, Expo Router `~57.0.24`, React Native `0.86.3`, React `19.2.3`, TypeScript `~6.0.3`. Servicios Supabase existentes; Leaflet/OpenStreetMap en web y mapas nativos existentes. No se requieren dependencias nuevas, migraciones ni cambios de infraestructura.

Antes de código Expo, consultar https://docs.expo.dev/versions/v57.0.0/. Antes de interfaz, aplicar `DESIGN.md`.

## Comandos

Desde la raíz, en PowerShell:

```powershell
npm run web
npx tsc --noEmit
npm run lint
node --test tests/*.test.mjs
npx expo export --platform web --output-dir dist-closure
```

Para la regresión de navegador existente, con la app disponible en el puerto 8083 y el stack local para la prueba de recuperación:

```powershell
$env:PLAYWRIGHT_MODULE_DIR = 'C:/Users/walte/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'
node --test tests/integration/navigation.test.mjs
```

La disponibilidad del runtime y de Supabase local se comprueba antes de esa regresión. No se cambia el proyecto remoto ni se envía correo real para probar muestras.

## Estructura del proyecto

```text
src/data/                         Muestras explícitas; patrón actual rewardExamples.ts
src/models/GreenPoint.ts           Modelo y filtros de descubrimiento
src/providers/DiscoveryProvider.tsx Carga y estados compartidos
src/components/discovery/          Lista y mapa
src/app/(app)/green-points.tsx      Descubrimiento público
src/app/point/[id].tsx              Ficha del punto
src/app/new-delivery.tsx            Entrada de entrega: rechazar la muestra
src/app/(app)/home.tsx              Inicio: mapa y primera fila de descubrimiento
tests/                            Regresiones node:test existentes
tests/integration/                Verificaciones de navegador
tasks/                            Plan, tareas y evidencia de validación
```

Las rutas concretas se identificaron durante la planificación; no se crean rutas nuevas.

## Estilo de código

Reutilizar tipos, funciones de horario y filtros. Ejemplo real de `src/models/GreenPoint.ts`:

```typescript
export interface PointSchedule {
  weekday: number;
  opensMinute: number;
  closesMinute: number;
}
```

Mantener imports `@/`, componentes PascalCase, propiedades camelCase y formato del repositorio. Textos breves en español con voseo. Conservar `ScreenHeader`, componentes compartidos, Roboto y colores de `@/theme`; no cambiar reglas globales del diseño.

## Estrategia de verificación

- Pruebas de comportamiento de selección de muestra: éxito vacío, éxito con datos, carga y error; no pruebas que sólo comparen texto fuente.
- Verificar horarios en la zona argentina: lunes y sábado dentro/fuera del intervalo, domingo y límites de apertura/cierre.
- Verificar búsqueda y filtros con las categorías cargadas.
- Navegador: invitado y ciudadano, entrada directa/recarga de ficha, búsqueda, detalle y bloqueo de entrega incluso por URL. Comprobar que no se ejecuta una operación real para el ejemplo.
- Revisar móvil y escritorio, dirección larga, avisos de ejemplo, teclado/foco, ausencia de desbordes y utilidad sin ubicación, siguiendo los criterios de `DESIGN.md`.
- Ejecutar TypeScript, lint, regresión local y exportación. Reutilizar evidencia de backend ya válida; no repetir suites SQL sin cambios de backend que lo justifiquen.
- Registrar cada resultado y sus límites en `tasks/validation.md`. Las pruebas web no se presentan como pruebas físicas Android/iOS.

## Límites

- **Siempre:** identificar la muestra en sus superficies, preservar carga/error/datos reales, impedir operaciones sobre IDs de ejemplo, respetar diseño y tarifa diferida, conservar la evidencia verificable de ubicación.
- **Consultar antes:** convertir la muestra en alta operativa, ampliar producto, incorporar dependencias o cambiar identidad compartida. Las decisiones rutinarias dentro del alcance aprobado no requieren nueva consulta.
- **Nunca:** crear cuentas ficticias o asignar roles, escribir ejemplos en el catálogo remoto, inventar tarifas/contactos/coordenadas, mostrar saldo o recepción simulada como real, debilitar permisos o borrar pruebas para aprobar.

## Criterios de aceptación

- [x] Universidad de Pilar aparece como ejemplo sólo tras cargar correctamente un catálogo sin puntos reales.
- [x] Nombre, dirección, lunes a sábado 10:00–20:00 y todas las categorías disponibles coinciden con lo indicado.
- [x] Lista, Inicio si corresponde y ficha distinguen claramente la muestra; el estado horario no promete recepción real.
- [x] Carga, error/reintento y búsqueda sin coincidencias conservan sus estados; un catálogo real no recibe muestras añadidas.
- [x] Ficha, búsqueda y navegación funcionan sin conceder ubicación. Marcador/distancia requieren coordenadas verificadas; si faltan, no se inventan.
- [x] No se puede iniciar una entrega real desde la muestra ni mediante URL directa, y no se crean operaciones, cuentas, roles o tarifas.
- [x] Puntos reales conservan descubrimiento y entrega sin regresiones.
- [x] TypeScript, lint, regresión y exportación pasan; revisión visual y límites quedan registrados.

## Preguntas abiertas

No se requieren más datos personales u operativos para esta muestra. Durante la planificación se verificó el marcador SEDE PELLEGRINI del mapa enlazado desde la web oficial: latitud -34.4378787, longitud -58.892156. Fuente y límites de precisión en `tasks/plan-alta-universidad.md`. La interpretación de «es de ejemplo» y la visibilidad sólo con catálogo real vacío fueron aprobadas con esta especificación.

## Puerta de aprobación

El usuario aprobó esta especificación en un turno posterior y luego el plan/tareas con «Apruebo todo». La implementación y verificación del módulo están completadas. Los artefactos completados de `cierre-flujos` se conservan en `tasks/plan-cierre-flujos.md` y `tasks/todo-cierre-flujos.md`.
