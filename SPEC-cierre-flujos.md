# Especificación: cierre de los flujos existentes

Module id: `cierre-flujos`.
Mapa: [CAPABILITY-MAP-cierre-app.md](CAPABILITY-MAP-cierre-app.md).
Estado: aprobada el 13 de octubre de 2026; cierre técnico verificado el 14 de octubre de 2026. Alcance y limitaciones en `tasks/validation.md`.

## Objetivo

Dejar los recorridos ya implementados de ReciVolt coherentes y verificables para ciudadano, empresa y administración, como base de las altas de Universidad de Pilar y Cafe del Pellegrini. El cierre se mide por comportamiento observado y persistido, no por la presencia de pantallas o por reportes anteriores.

## Supuestos y alcance

- El usuario confirmó los datos operativos iniciales del mapa y autorizó elegir el costo del café: 100 puntos globales. Las altas pertenecen a los módulos siguientes.
- “Con lo que tiene” comprende onboarding, invitado, autenticación, descubrimiento, entregas, recepción, puntos globales, XP, premios, canjes y las herramientas empresariales y administrativas existentes.
- La tarifa de puntos por entrega queda para después, por instrucción expresa. No se altera como parte del cierre. Las verificaciones de acreditación emplean tarifas de prueba aisladas o configuración existente identificada como tal.
- Retiros, edición de perfil todavía inexistente, preferencias, notificaciones y nuevos indicadores ambientales quedan fuera. Las superficies que mencionan funciones futuras deben explicar su estado real y no ofrecer operaciones que aparenten estar disponibles.
- Se mantienen rutas, permisos y diseño aprobados, salvo correcciones necesarias para resolver errores dentro de este alcance.

## Contrato de comportamiento

### Acceso y descubrimiento

1. El invitado puede abrir Inicio, Puntos verdes, Premios y fichas públicas sin iniciar sesión.
2. Las funciones personales requieren cuenta; una cuenta sólo accede a empresa/admin según permisos efectivos del backend.
3. Onboarding, registro, login, recuperación y logout mantienen los comportamientos documentados y cubiertos por las pruebas existentes.
4. Lista, búsqueda y mapa funcionan sin permiso de ubicación. Una empresa suspendida o un punto inactivo no se muestran como publicados.

### Entregas y saldo

1. El ciudadano registra una entrega en un punto habilitado y obtiene QR/código sin acreditar puntos anticipadamente.
2. El equipo autorizado confirma las cantidades físicas. Confirmar dos veces no duplica la entrega, los puntos ni el XP.
3. El saldo canjeable es global y se obtiene del backend. Los créditos históricos por empresa conservan su procedencia, sin presentarse como saldos independientes para gastar.
4. El XP reconoce impacto y no se descuenta al canjear. Logout o cambio de usuario no exponen saldo ni historial de la cuenta anterior.

### Premios y canjes

1. Un premio publicado de una empresa activa aparece en catálogo y detalle según vigencia; stock cero impide reservarlo.
2. Las muestras siguen identificadas como ejemplos y no permiten canjes reales. Un error de carga no se sustituye por ejemplos ni por saldo cero.
3. El ciudadano con saldo suficiente confirma un canje; se registra una reserva y un único débito, y se muestra su código persistente en Mis canjes.
4. Reintentar la misma solicitud no genera reservas ni débitos duplicados. Dos reservas concurrentes no permiten saldo negativo ni exceder stock.
5. Sólo el equipo autorizado de la empresa del premio puede consultar y confirmar el código. La confirmación cambia su estado a entregado sin un segundo débito.
6. Un ciudadano no puede consultar un canje ajeno; el cliente no puede editar directamente saldo, movimientos ni estados protegidos.

### Portales, interfaz y documentación

1. Las operaciones existentes de empresa y admin conservan permisos, validación y mensajes reales de éxito/error. Los cambios quedan registrados donde el backend actual dispone de auditoría.
2. Toda pantalla modificada cumple `DESIGN.md`: tema y Roboto compartidos, `ScreenHeader` salvo Inicio, y componentes existentes de acciones, ciudadano y portales.
3. Carga, vacío y error son distinguibles. Un envío fallido conserva datos y permite corregir/reintentar; uno en progreso evita acciones repetidas.
4. `README.md` y `PROYECTO_Y_FEATURES.md` reflejan las recompensas, el saldo global y las limitaciones realmente comprobadas, con fecha y sin reutilizar resultados históricos como validación nueva.

## Límites de responsabilidad e interfaces

`cierre-flujos` proporciona a `alta-universidad` el descubrimiento de puntos publicados, `portal_command`, `delivery_command` y la lectura de saldo ya existentes. Proporciona a `alta-cafe` la consulta de premios, `reward_command` y la validación empresarial de códigos existentes.

Se conservan los contratos de operaciones de premios `save`, `reserve`, `get`, `lookup` y `confirm`, y el identificador de solicitud de reserva. Los modelos compartidos siguen en `src/models/`. Si aparece un defecto que exige cambiar un contrato o el esquema, se documenta primero el cambio y sus efectos; la solución se limita a corregir ese defecto y preservar datos y clientes compatibles.

Este módulo no crea organizaciones, puntos verdes, premios, invitaciones ni roles reales de los registros pedidos. Esas escrituras corresponden a sus módulos del mapa. La falta de responsables o tarifas de las altas no impide verificar este módulo con datos de prueba aislados.

## Tecnología

- Expo `~57.0.26`, Expo Router `~57.0.24` y React Native `0.86.3`.
- React `19.2.3`, TypeScript `~6.0.3`.
- Supabase JS `^2.116.0`, Auth, PostgreSQL/RLS y Storage existentes.
- Web con Leaflet/OpenStreetMap; mapas nativos con `react-native-maps`.
- Documentación de referencia obligatoria: https://docs.expo.dev/versions/v57.0.0/.

No se requiere actualizar versiones ni agregar dependencias para cumplir esta especificación.

## Comandos

Ejecutar desde la raíz del repositorio:

```powershell
# Desarrollo web
npm run web

# Verificaciones estáticas y regresión local
npx tsc --noEmit
npm run lint
node --test tests/*.test.mjs

# Exportación web
npx expo export --platform web

# Sólo con el stack local Supabase disponible y el esquema base completo
npx supabase db lint --local
npx supabase db advisors --local --type security --fail-on warn
npx supabase test db supabase/tests/global-rewards.test.sql supabase/tests/admin-search-edit.test.sql
```

No hay script npm `test`. Las suites SQL dependen de migraciones base locales que no están todas versionadas; una indisponibilidad se registra con evidencia y no se presenta como prueba aprobada. No se reinicia ni se resetea la base remota para ejecutar pruebas.

## Estructura del proyecto

```text
src/app/                       Rutas y pantallas de ciudadano, acceso, empresa y admin
src/components/                Componentes compartidos y componentes por recorrido
src/models/                    Tipos y reglas del dominio
src/services/                  Acceso a datos y operaciones del backend
src/providers/                 Sesión, descubrimiento y saldo compartido
src/hooks/                     Carga, acciones y comportamiento de navegación
src/theme/                     Colores y tipografía
tests/*.test.mjs                Regresión local con node:test
supabase/migrations/            Cambios SQL disponibles en el entorno
supabase/tests/                Suites SQL existentes
README.md, PROYECTO_Y_FEATURES.md  Documentación del producto
```

## Estilo de código

Mantener funciones pequeñas, modelos tipados, imports con `@/`, componentes PascalCase, servicios por dominio y estilos existentes. Ejemplo real de `src/services/reward.service.ts`:

```typescript
export async function getReward(id: string): Promise<Reward | null> {
  const { data, error } = await supabase.from('rewards').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? mapReward(data) : null;
}
```

Los errores se propagan al estado de la pantalla; una consulta fallida no devuelve un éxito ni un valor inventado. Textos en español con voseo y nombres del diseño compartido.

## Estrategia de verificación

- Conservar y ejecutar las 33 pruebas locales existentes. Agregar regresiones de comportamiento para errores de lógica, aislamiento de sesión o consistencia descubiertos; no pruebas que sólo comparen el texto del código.
- Comprobar transacciones, RLS, idempotencia, concurrencia y permisos de canjes con las suites SQL existentes y pruebas adicionales enfocadas en defectos detectados.
- Verificar en navegador los recorridos de invitado, ciudadano y equipo empresarial, con datos de prueba identificables; contrastar UI y persistencia. No acreditar puntos ficticios a usuarios reales.
- Revisar las pantallas afectadas en móvil y escritorio, navegación, nombres largos, estados, foco y controles accesibles según `DESIGN.md`.
- Informar por separado compilación, tests, prueba web, validación del backend y pruebas físicas. QR óptico, archivos y recorridos en dispositivos físicos sólo se declaran verificados si se probaron realmente.
- No fijar una cobertura porcentual arbitraria. La condición es cubrir los defectos corregidos y los invariantes operativos descritos.

Línea base comprobada el 13 de octubre de 2026: TypeScript sin errores, lint sin errores y 33/33 pruebas locales aprobadas. Todavía no se ha revalidado el backend remoto ni realizado revisión visual en esta tarea.

## Límites

- **Siempre:** conservar datos y permisos; usar operaciones autorizadas del backend; verificar cambios con los comandos aplicables; conservar el diseño; documentar limitaciones verificadas; identificar claramente datos de prueba.
- **Consultar antes:** ampliaciones de producto, cambios de identidad compartida, incorporación de dependencias o cambios de infraestructura que excedan las correcciones autorizadas. Una corrección rutinaria necesaria dentro del alcance se resuelve con criterio sin volver a solicitar autorización ya otorgada.
- **Nunca:** introducir claves privilegiadas en el cliente; asignar roles sin autorización; falsificar tarifas, stock, contactos, saldos o resultados de pruebas; borrar historial; debilitar RLS para que un flujo funcione; presentar funciones futuras como terminadas.

## Criterios de aceptación

- [x] Los recorridos existentes descritos arriba funcionan y los bloqueos detectados están corregidos o identificados con evidencia si dependen de datos/configuración externos.
- [x] Se verifica entrega → recepción → saldo global → reserva → confirmación empresarial con datos de prueba, sin duplicar puntos ni débitos.
- [x] Se verifican saldo insuficiente, stock agotado, acceso ajeno y confirmación repetida.
- [x] Logout/cambio de usuario no muestran información personal anterior.
- [x] TypeScript, lint, tests de regresión y exportación web pasan.
- [x] Se registra el resultado de las pruebas SQL y del backend; los checks no ejecutables figuran como pendientes y no como aprobados.
- [x] Las pantallas modificadas tienen revisión visual móvil/escritorio y mantienen `DESIGN.md`.
- [x] La documentación refleja saldo global, premios/canjes y el alcance real; no promete retiros ni otras funciones futuras como disponibles.
- [x] Las tarifas de Universidad de Pilar siguen diferidas y no se alteraron por inferencia.

## Preguntas abiertas

No hay preguntas de producto que bloqueen este módulo completado. Después de la validación, el usuario confirmó lunes a sábado, 10:00–20:00 y todas las categorías para Universidad de Pilar, y aclaró «es de ejemplo» sobre las cuentas responsables. El mapa actualizado define muestras sin operaciones reales; la tarifa universitaria queda para más adelante.

## Puerta de aprobación

El usuario aprobó esta especificación y el plan en turnos posteriores. Las correcciones y comprobaciones de este módulo están completadas; los resultados, límites y condiciones de publicación se conservan en `tasks/validation.md`. Las muestras solicitadas siguen siendo módulos posteriores.
