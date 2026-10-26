# EcoRAEE

La descripción funcional del proyecto, los recorridos por rol y los pendientes están en [Proyecto y funcionalidades](PROYECTO_Y_FEATURES.md).

El backlog priorizado de interfaz, acceso y preparación operativa está en [PENDIENTES.md](PENDIENTES.md), incluido el modal personalizado para credenciales incorrectas.

El [lenguaje de diseño](DESIGN.md) es obligatorio para quienes trabajen en la interfaz. Define la identidad basada en la vista del ciudadano, los componentes compartidos, el header común, los estilos y los criterios de revisión para ciudadano, empresa y admin. Leerlo antes de cambiar pantallas; [AGENTS.md](AGENTS.md) establece la misma obligación para los agentes.

Toda contribución humana o asistida por IA sigue [CONTRIBUTING.md](CONTRIBUTING.md). Los cambios de interfaz incluyen revisión contra `DESIGN.md`, evidencia visual y pendientes explícitos antes de considerarse terminados. La plantilla de PR recuerda estos criterios al equipo.

El nombre comercial está centralizado en `src/config/brand.json`. La guía [Cambiar el nombre de la app](CAMBIO_DE_NOMBRE.md) explica cómo actualizarlo, revisar los recursos visuales y conservar los identificadores compatibles con los datos y enlaces existentes.

Aplicación de gestión de RAEE con React Native, Expo SDK 57, Expo Router, TypeScript y Supabase. El código activo está en `src/app/`; servicios en `src/services/`, modelos en `src/models/` y estilos compartidos en `src/theme/`.

La app permite explorar puntos verdes, registrar entregas con QR, confirmar cantidades recibidas, sumar puntos globales y canjear premios. El equipo del comercio confirma la entrega del premio sin un segundo débito. La procedencia de los créditos se conserva por empresa; el saldo canjeable es único para toda la red.

## Ejecutar

Requiere Node 22.13 o posterior y npm.

```powershell
npm install
npm run web
```

Para dispositivos: `npm run android` / `npm run ios`. La configuración conserva por defecto el proyecto Supabase existente. Los overrides locales son opcionales: `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

**Cierre del 14/10/2026:** alcance web de ejemplo completado y revisión conjunta aprobada. Universidad de Pilar y Cafe del Pellegrini están implementados como muestras identificadas, sin operaciones reales. Supabase remoto activo; las definiciones de los RPC principales coinciden con el entorno local probado y las 21 tablas públicas tienen RLS habilitado. No se crearon empresas, puntos ni premios reales. Los cuatro módulos están cerrados en [el mapa de cierre](CAPABILITY-MAP-cierre-app.md); evidencia y límites en [tasks/validation.md](tasks/validation.md).

La primera apertura muestra onboarding; Saltar o Comenzar abre Home como invitado y las siguientes visitas abren la app directamente. El login es opcional y redirige según permisos reales. Las entradas directas y recargas conservan la ruta solicitada una vez recuperada la sesión. La evidencia de pruebas y las limitaciones de publicación están en [tasks/validation.md](tasks/validation.md).

El mapa web usa Leaflet/OpenStreetMap, con atribución y carga diferida compatible con renderizado estático. Android/iOS usan `react-native-maps`. Expo Go no requiere una clave propia; para un build Android configurar `GOOGLE_MAPS_ANDROID_API_KEY` restringida a la app y su SHA-1. iOS usa Apple Maps. La ubicación se solicita sólo al tocar el botón y permanece en memoria; la búsqueda funciona sin habilitarla. Las distancias son en línea recta.

## Supabase local

Con Docker disponible, iniciar el stack mínimo usado en las pruebas:

```powershell
npx supabase start --exclude realtime,storage-api,imgproxy,mailpit,postgres-meta,studio,edge-runtime,logflare,vector,supavisor
npx supabase status
```

Puertos de EcoRAEE: API 55321 y PostgreSQL 55322. Las migraciones se conservan localmente y no se incluyen en esta branch. Para reproducir el esquema en otro entorno se necesitan esos archivos por separado.

Se preserva `profiles` y su trigger. Las tablas nuevas tienen RLS y grants explícitos. La función del trigger no se puede invocar directamente desde la API pública. Los comandos de empresa/admin verifican los permisos en DB y ejecutan cambios relacionados en una transacción. Las invitaciones usan la Edge Function `company-invitation`, desplegada en el remoto y autenticada dentro de la función.

Para usar documentación/invitaciones/fotos localmente se necesita Storage, Mailpit y Edge Runtime; el stack mínimo del comando anterior sólo cubre Auth/DB. Las URLs de retorno de Auth e invitaciones deben configurarse para el entorno de despliegue.

Registrar una entrega requiere una cuenta con email confirmado y un punto publicado por una empresa activa. Crear el QR no acredita puntos: owner o worker debe confirmar la recepción desde `/company/scanner`. Se permite ingresar el código manualmente, sin cámara. Fotos opcionales privadas, JPG/PNG hasta 5 MB; el QR vence en 7 días. Mis entregas y Perfil muestran el saldo global real.

Admin da de alta los puntos verdes y publica premios; el responsable mantiene los puntos existentes y las tarifas de su empresa. El ciudadano reserva un premio con saldo suficiente y recibe un código persistente en Mis canjes. Sólo el equipo del comercio correspondiente puede confirmar su entrega.

Copiar `.env.example` a `.env.local` y reemplazar la key por la **publishable key local** para conectar la app a ese stack. Reiniciar Expo después de cambiar esas variables. Nunca colocar secret keys o service_role en EXPO_PUBLIC ni en el cliente.

Los roles de empresa/admin se asignan únicamente desde un backend seguro o DB administrada. Ciudadano corresponde a una identidad sin asignaciones activas. Los nuevos registros siempre reciben su perfil por trigger; el cliente no hace upsert.

## Verificar

```powershell
npx tsc --noEmit
npm run lint
node --test tests/*.test.mjs
npx supabase test db supabase/tests
npx supabase db advisors --local --type security --fail-on warn
npx supabase db lint --local --schema public,private --level error --fail-on error
npx expo install --check
npx expo-doctor
npx expo export --platform web
```

No existen scripts npm `test` o `typecheck`: se invocan las herramientas directamente. Las pruebas SQL necesitan el esquema local completo; algunas migraciones base y suites históricas se conservan sólo en este entorno. Las pruebas de integración nuevas están en `tests/integration/`: concurrencia requiere Docker y el stack local; recuperación requiere además Mailpit. La regresión de navegación necesita Playwright/Chrome y la app local; `PLAYWRIGHT_MODULE_DIR` permite usar el paquete de herramientas instalado sin agregarlo a las dependencias del producto.

```powershell
node --test tests/integration/reward-concurrency.test.mjs
node --test tests/integration/recovery.test.mjs
# Con Playwright disponible y la app local en http://localhost:8083
node --test tests/integration/navigation.test.mjs
```

La recuperación local usa `supabase/templates/recovery.html` para enviar el OTP de seis dígitos que pide la app. El proyecto alojado necesita configurar su plantilla de recuperación por separado; modificar `config.toml` no actualiza automáticamente el remoto.

## Próximas etapas

Universidad de Pilar aparece como punto verde de ejemplo sólo después de cargar correctamente un catálogo real vacío: lunes a sábado de 10 a 20, todas las categorías cargadas y la dirección indicada. Inicio, mapa, lista y ficha identifican la muestra; no permite entregas reales, incluso mediante URL directa. Las coordenadas corresponden a la Sede Pellegrini del mapa enlazado por la universidad, sin afirmar un servicio RAEE real allí. Los errores de consulta conservan reintento y no muestran ejemplos.

Cafe del Pellegrini aparece en el catálogo de ejemplos con Un café por 100 puntos y la misma dirección de la universidad. Conserva el ID `example-cafe`, aviso y botón de ejemplo deshabilitado para invitado y ciudadano, incluso con saldo suficiente. No se creó una empresa operativa ni un premio en Supabase; tampoco se inventaron horario o stock.

La revisión final conjunta está completada: Inicio → universidad → Puntos verdes → Premios → café, recargas, datos y avisos correctos, sin llamadas de entrega/canje ni errores de página. Se conservaron las verificaciones anteriores válidas; no hubo cambios nuevos de producto durante el cierre.

La tarifa de entregas queda para después. Retiros, nuevas métricas agregadas y preferencias no implementadas siguen fuera del alcance. Cámara, archivos y recorridos nativos requieren comprobación física; contacto oficial y términos necesitan configuración antes de publicar. La simulación web de texto ampliado detectó recorte en etiquetas de la barra inferior existente. El cierre corresponde al alcance web de ejemplo y no es un despliegue ni una validación de producción completa.
