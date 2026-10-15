# TecnoRAEE — Proyecto y funcionalidades

**Fecha de revisión:** 14 de octubre de 2026.

Este documento describe las funcionalidades presentes en el código del entorno de trabajo, sus flujos y los pendientes. Los resultados de pruebas previas se identifican por fecha; no constituyen una nueva comprobación del servicio remoto.

## Qué es TecnoRAEE

TecnoRAEE conecta personas que tienen residuos de aparatos eléctricos y electrónicos (RAEE) con organizaciones que los reciben. Permite encontrar puntos verdes, registrar una entrega, comprobar su recepción física y reconocer la participación del ciudadano mediante puntos y experiencia de impacto (XP).

La plataforma reúne tres recorridos: ciudadano, empresa receptora y administración. Cada cuenta accede al recorrido que corresponda a sus permisos reales.

## Estado funcional

| Funcionalidad                      | Estado       | Alcance actual                                                                    |
| ---------------------------------- | ------------ | --------------------------------------------------------------------------------- |
| Onboarding y acceso como invitado  | Implementado | Primera apertura con introducción opcional; después, entrada directa a la app.    |
| Registro, login y recuperación     | Implementado | Supabase Auth, confirmación de email y recuperación mediante código.              |
| Acceso según rol                   | Implementado | Login común y redirección automática a ciudadano, empresa o admin.                |
| Catálogo y descubrimiento          | Implementado | Categorías, búsqueda, filtros, mapa y detalle de puntos verdes.                   |
| Alta de puntos e instituciones     | Implementado | Admin crea puntos e instituciones; la participación pública se dirige a Contacto. |
| Portal de empresa                  | Implementado | Configuración de puntos verdes, tarifas de puntos, equipo y cupos.                |
| Entregas y recepción               | Implementado | QR/código, verificación física, cantidades ajustables y acreditación.             |
| Mis RAEE e historial empresarial   | Implementado | Entregas, estados, detalles y saldos reales.                                      |
| XP y niveles de impacto            | Implementado | XP global y umbrales configurables por admin.                                     |
| Panel admin e historial de cambios | Implementado | Gestión administrativa y registro persistente de operaciones.                     |
| Perfil                             | Parcial      | Identidad, saldos y logout; edición de datos y preferencias pendiente.            |
| Solicitud y seguimiento de retiros | Pendiente    | Existen accesos y reconocimiento del tipo de código; falta el circuito operativo. |
| Catálogo y canje de recompensas    | Implementado | Premios reales, reserva con débito global, código y confirmación empresarial.     |
| Métricas agregadas de impacto      | Pendiente    | No hay un dashboard global de indicadores ambientales.                            |

“Implementado” significa que existe código funcional del recorrido. La lectura de QR con cámara y los selectores de archivos/fotos necesitan validación adicional en dispositivos físicos.

## Personas, roles y permisos

| Perfil                                   | Qué puede hacer                                                                                         | Destino de ingreso |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------ |
| Invitado                                 | Explorar Home, categorías y puntos verdes. Las funciones personales solicitan una cuenta.               | `/home`            |
| Ciudadano                                | Registrar entregas, consultar historial, puntos y XP; reservar premios y consultar sus códigos.         | `/home`            |
| Responsable de empresa (`company_owner`) | Configurar su organización, puntos verdes, tarifas y equipo; recibir entregas y consultar su historial. | `/company`         |
| Trabajador (`company_worker`)            | Consultar los puntos de su empresa, recibir entregas y ver su historial.                                | `/company`         |
| Administrador (`platform_admin`)         | Gestionar puntos, premios, búsquedas y cupos; configurar XP/niveles y consultar auditoría.              | `/admin`           |

El usuario no elige su rol en el login. Los permisos se consultan en la base de datos; las membresías deben estar activas y la empresa debe estar habilitada. Si una cuenta tiene autorización de administrador, ese acceso tiene prioridad.

## Experiencia de entrada y cuenta

- La primera apertura sin sesión presenta tres pasos de onboarding.
- **Saltar** y **Comenzar** abren Home como invitado y guardan la introducción como completada en ese dispositivo/navegador.
- Las siguientes aperturas ingresan directamente a la app; el login se abre cuando el usuario lo elige o necesita una función que requiere cuenta.
- Entrar con una cuenta también completa la introducción. Cerrar sesión conserva esa preferencia y vuelve a la entrada habitual de invitado.
- Si se borra el almacenamiento local o se usa otro navegador/dispositivo, puede mostrarse nuevamente el onboarding.
- El registro usa Supabase Auth y el perfil se crea mediante un trigger del backend.
- La recuperación muestra confirmación visible del envío, permite verificar el código y guardar una nueva contraseña. Al finalizar conserva la sesión verificada y vuelve al inicio correspondiente al rol.

## Descubrimiento de puntos verdes

Home ofrece búsqueda y accesos a las principales funciones. El recorrido de descubrimiento incluye:

- Catálogo de dispositivos recibidos.
- Búsqueda por nombre, dirección, categoría u organización.
- Filtros por categorías, disponibilidad y servicios del punto.
- Consulta de dirección, contacto, categorías y horarios semanales, incluidos turnos partidos y horarios que cruzan medianoche.
- Estado de apertura calculado con la zona horaria del punto.
- Ubicación solicitada sólo por acción del usuario y cálculo de distancia en línea recta.
- Mapa web con Leaflet/OpenStreetMap y mapas nativos con `react-native-maps`.

La publicación pública depende del estado del punto y de la empresa. Tras cargar correctamente un catálogo vacío, la interfaz muestra Universidad de Pilar como punto verde de ejemplo, con dirección, lunes a sábado de 10 a 20 y todas las categorías cargadas. Inicio, fila, ficha y marcador identifican la muestra. El ejemplo no registra entregas reales, tampoco por URL directa, y no se añade cuando hay puntos reales. Carga/error y filtros sin coincidencias conservan estados diferenciados.

## Flujo ciudadano: entrega de RAEE

1. El ciudadano inicia sesión con una cuenta cuyo email esté confirmado.
2. Selecciona un punto publicado de una empresa activa.
3. Elige categorías admitidas, cantidades y, opcionalmente, una nota y una foto.
4. Confirma el registro y obtiene una entrega pendiente con QR y código legible.
5. Lleva los dispositivos al punto verde para su verificación física.
6. El responsable o trabajador recibe la entrega y confirma las cantidades reales.
7. Mis entregas muestra el resultado, el saldo global y el XP.

Registrar una entrega **no acredita puntos**. La acreditación ocurre cuando el equipo de la empresa confirma la recepción.

Reglas principales:

- Cantidades declaradas: enteros entre 1 y 999 por categoría.
- Cantidades recibidas: de 0 a 999, con al menos una unidad efectivamente recibida.
- Foto opcional JPG/PNG de hasta 5 MB, almacenada en un bucket privado.
- Código válido durante 7 días; códigos vencidos o cancelados no acreditan.
- Hasta 20 entregas pendientes no vencidas por ciudadano.
- El titular puede cancelar una entrega pendiente. Las confirmadas no se editan ni cancelan desde el cliente.
- Un trabajador no puede recibir su propia entrega.

## Flujo empresa: alta, configuración y operación

### Solicitud de alta: contrato histórico del backend

Este contrato permanece en DB y sus pruebas. La interfaz pública actual dirige la participación a Contacto; no ofrece este formulario ni una pestaña de revisión de solicitudes en el panel admin.

La organización presenta nombre comercial, razón social, CUIT, datos de contacto, responsable, dirección, actividad y documentación PDF/JPG/PNG de hasta 8 MB. El solicitante puede consultar su estado y corregir información cuando admin lo solicita.

Estados de solicitud: enviada, en revisión, falta información, aprobada y rechazada.

La aprobación crea la empresa y reserva una invitación para el responsable en una transacción. Repetir una aprobación ya realizada no crea otra empresa.

### Configuración del responsable

El responsable acepta la invitación con la cuenta de email verificado correspondiente y puede:

- Editar los datos operativos y de contacto permitidos de su organización.
- Mantener los puntos verdes existentes: ubicación, categorías, horarios, contacto y publicación. El alta corresponde a admin.
- Definir cuántos puntos otorga su empresa por cada categoría de dispositivo.
- Invitar trabajadores y reenviar o cancelar invitaciones pendientes.
- Deshabilitar o reactivar trabajadores, respetando el límite de cupos.
- Solicitar ampliaciones del equipo con un motivo.
- Cambiar de empresa cuando tenga más de una membresía activa.

Las invitaciones pendientes reservan un cupo. El responsable no puede elevar el límite por su cuenta ni asignar permisos de administrador de plataforma.

### Recepción de entregas

El equipo puede escanear el QR con cámara o ingresar manualmente su contenido/código. Antes de confirmar, consulta ciudadano, punto, categorías, cantidades declaradas, notas y foto privada, si existe.

La confirmación consume el código, guarda las cantidades recibidas, acredita puntos y XP y registra la operación en una sola transacción. Repetir la confirmación devuelve el resultado original y no duplica la acreditación.

## Puntos, XP y niveles

Los puntos y el XP cumplen funciones distintas:

- **Puntos globales:** cada organización define su tarifa por dispositivo y se conserva la procedencia de sus créditos. El ciudadano dispone de un único saldo canjeable en toda la red, descontando las reservas de premios. Los créditos por empresa no son billeteras independientes para gastar.
- **XP global:** lo configura la administración de TecnoRAEE y determina el nivel de impacto del ciudadano, independientemente de la empresa receptora.

Las tarifas y el XP por unidad quedan guardados al registrar la entrega. Cambiar la configuración después no recalcula esa entrega ni su histórico. La acreditación final usa las cantidades físicamente recibidas.

Los saldos se calculan a partir de movimientos registrados en el backend; no existe un saldo que el cliente pueda editar directamente. Mis entregas, Mis puntos, Premios y Perfil comparten esa información.

## Premios y canjes

Admin publica premios y los asocia a una empresa activa, con costo en puntos, dirección, descripción, vigencia y stock opcional. El catálogo permite buscar por premio/comercio y filtrar por categoría. Cuando no hay publicaciones, los ejemplos se identifican y no habilitan canjes; un error de consulta no se reemplaza por muestras.

El ciudadano con email confirmado y saldo suficiente reserva un premio tras confirmar el costo. La transacción descuenta puntos globales una sola vez, guarda una copia del premio y reduce stock si corresponde. El código QR, código de barras y texto quedan disponibles en Mis canjes; una recarga conserva la ficha solicitada.

El equipo del comercio valida el código desde `/company/scanner` y confirma la entrega. La confirmación no vuelve a descontar puntos y repetirla devuelve el resultado original. Otros ciudadanos y empresas no pueden acceder a ese canje. Las reservas concurrentes no pueden exceder el saldo ni consumir dos veces la última unidad. El XP no se gasta.

## Administración e historial de cambios

El panel actual tiene Puntos verdes, Premios, Buscador, Límites, Configuración global e Historial de cambios. La cabecera y las pestañas mantienen un tamaño estable; el contenido se desplaza por separado y la navegación horizontal se adapta a móvil.

Los administradores pueden:

- Dar de alta puntos verdes e instituciones responsables sin asignar permisos a cuentas automáticamente.
- Publicar y editar premios; buscar y editar usuarios, empresas, puntos y premios.
- Aprobar o rechazar ampliaciones de cupos.
- Configurar XP por categoría y crear o editar niveles de impacto.
- Consultar el registro de operaciones mediante filtros, búsqueda y paginación.

Los comandos históricos de solicitudes, revisión documental y suspensión se conservan en el backend y en sus pruebas; eso no significa que el panel actual muestre todas esas operaciones. El ingreso público `/company-application` redirige a Contacto.

El historial conserva autor, email, fecha, operación, referencia, empresa y motivo cuando corresponde. Los cambios de solicitudes, cupos, estado de empresas, XP y niveles incorporan valores anteriores y nuevos dentro de la misma transacción.

También se registran las consultas de documentación privada desde admin y los intentos y resultados de envío de invitaciones. La identidad del autor queda guardada aunque después cambie su nombre o pierda sus permisos.

El cliente no puede insertar, modificar ni borrar registros del historial. Los registros antiguos se conservan sin inventar valores anteriores que no se hayan almacenado. Los comandos fallidos no se presentan como cambios realizados. El historial no registra contraseñas ni clics de navegación; los cambios manuales directos en la base requieren auditoría operativa aparte.

Una empresa suspendida deja de estar publicada y pierde acceso a operaciones protegidas. El histórico y los puntos ya obtenidos se conservan.

## Arquitectura y persistencia

- **Cliente:** React Native, React, TypeScript, Expo SDK 57 y Expo Router, con destinos web, Android e iOS.
- **Identidad:** Supabase Auth, persistencia de sesión y recuperación de contraseña.
- **Datos:** PostgreSQL de Supabase con Row Level Security (RLS) y permisos explícitos.
- **Archivos:** Supabase Storage privado para documentación y fotos; URLs firmadas de duración limitada para su consulta.
- **Operaciones:** comandos/RPC que validan identidad, rol y estado antes de modificar datos.
- **Invitaciones:** Edge Function `company-invitation`, con validación de identidad y autorización en servidor antes del envío.
- **Consistencia:** transacciones, bloqueos e idempotencia para evitar duplicados de empresas, entregas y acreditaciones.

Organización del código:

```text
src/app/          Pantallas y rutas por flujo
src/components/   Componentes de interfaz reutilizables
src/models/       Tipos y reglas de dominio
src/services/     Acceso a Auth, datos, archivos y comandos
src/providers/    Estado compartido de sesión y descubrimiento
src/hooks/        Carga de datos y ejecución de acciones
src/theme/        Colores, fuentes y estilos del producto
supabase/         Configuración y funciones
```

Los roles se leen desde asignaciones confiables de la base, nunca desde metadatos editables del usuario. Las credenciales privilegiadas del backend no forman parte del cliente. La documentación legal privada se mantiene separada de los datos públicos de descubrimiento.

Algunas migraciones base se mantienen sólo en este entorno; el repositorio incluye las excepciones declaradas en `.gitignore`. No se puede reconstruir toda la base usando únicamente las migraciones versionadas.

## Ejecución y validación

El proyecto requiere Node 22.13 o posterior y npm.

```bash
npm install
npm run web
# Para dispositivos: npm run android / npm run ios
```

La configuración admite `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Para usar otro entorno hay que configurar también las URLs de Auth y de invitación; una configuración local no sustituye los enlaces de un despliegue público o nativo.

Comprobaciones principales:

```bash
npx tsc --noEmit
npm run lint
npx expo export --platform web
```

El cierre del alcance web de ejemplo está documentado en [tasks/validation.md](tasks/validation.md): TypeScript, lint, 38 pruebas locales (33 iniciales y cinco de muestras), 321 comprobaciones SQL locales, pruebas de concurrencia/navegación, circuito operativo entre organizaciones de prueba, seis escenarios web de muestras y recorrido conjunto final. Las capturas están en `output/verification/`. Se distinguen pruebas locales, lecturas remotas y límites físicos pendientes; no se repitieron checks aprobados sin cambios que lo justificaran.

Queda por validar en dispositivos físicos la lectura óptica, la selección de documentación/fotos y los recorridos nativos completos. Las exportaciones de bundles y una vista web móvil no sustituyen esas comprobaciones. La entrega de emails de invitación a la bandeja de una persona real no está documentada como verificada en esos reportes.

## Estado y próximas funcionalidades

1. **Retiros:** solicitud, asignación, seguimiento y confirmación de retiro.
2. **Muestras completadas:** Universidad de Pilar y Cafe del Pellegrini con Un café por 100 puntos globales, dirección compartida, avisos de ejemplo y entregas/canjes reales bloqueados. Módulos y revisión conjunta final verificados en web. El usuario aclaró que son ejemplos; no se crean cuentas ni operaciones reales. Tarifa universitaria diferida.
3. **Impacto agregado:** indicadores y reportes globales basados en operaciones confirmadas.
4. **Perfil y preferencias:** edición de datos personales, ubicación, notificaciones y configuración.
5. **Operación y publicación:** validación nativa física, URLs/deep links del entorno publicado y comprobación de invitaciones de extremo a extremo.

La base actual permite descubrir puntos, registrar y recibir entregas, acreditar puntos globales, reservar premios y confirmar su entrega. Las muestras no habilitan esas operaciones. Retiros y otras funciones futuras no se presentan como operativas. La publicación comercial requiere completar altas operativas, responsables, contacto y términos, además de la validación física. Sigue identificado el recorte de etiquetas de navegación inferior observado con texto ampliado mediante CSS; no se declara accesibilidad completa aprobada.
