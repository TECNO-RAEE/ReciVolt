# Contribuir a EcoRAEE

Estas reglas se aplican a desarrolladores, diseñadores y agentes de IA. Una tarea de Trello, una PR o una herramienta distinta no cambia el lenguaje de diseño compartido.

## Antes de empezar

1. Leer [AGENTS.md](AGENTS.md) y [DESIGN.md](DESIGN.md), incluidos los acuerdos pendientes de implementación.
2. Respetar el alcance solicitado: una imagen de referencia o una tarea planificada no autoriza su implementación.
3. Para cambios de interfaz, identificar los componentes y tokens existentes que se reutilizarán. Para escribir código de Expo, consultar primero la documentación exacta del SDK indicada en `AGENTS.md`.

`CLAUDE.md` remite a `AGENTS.md`. Cualquier configuración futura de otro asistente debe remitir a la misma guía en lugar de copiar o reinterpretar la identidad.

## Una sola identidad

- Ciudadano, autenticación, Empresa, Admin y futuras secciones conservan Roboto 400/500/700, la paleta semántica y los patrones de `DESIGN.md`.
- Importar colores y fuentes desde `@/theme`. Reutilizar `ScreenHeader` salvo en Inicio, `ActionButton` y `RewardsUI`, `PortalUI` o `AdminPage` según la tarea.
- Respetar nombres, navegación, estados y permisos aprobados. Identificar los datos de muestra y las funcionalidades pendientes.
- Adaptar skills, generadores y referencias visuales a esta identidad. Una desviación existente no autoriza repetirla.
- Si falta una variante compartida, revisar la posibilidad de ampliar el componente existente. Cambiar una regla de identidad requiere una decisión explícita del usuario; al implementarla, actualizar código, `DESIGN.md` y `.impeccable/design.json` juntos.

## Antes de entregar o marcar Hecho

Usar la sección “Revisión antes de entregar” de `DESIGN.md` y completar la plantilla de PR. En Trello, registrar la misma evidencia en la tarjeta.

- Explicar qué cambió y qué componentes compartidos se reutilizaron.
- Para cambios visuales, adjuntar capturas en móvil y escritorio de las pantallas afectadas. Comprobar nombres largos, texto ampliado, estados de carga/vacío/error/éxito aplicables, foco y áreas táctiles.
- Indicar qué se comprobó realmente, en qué tamaños o plataformas, y qué queda pendiente. No presentar una captura web como prueba física ni como auditoría completa de accesibilidad.
- Corregir las desviaciones introducidas por el cambio antes de considerarlo terminado. Si falta revisión, conservar el estado pendiente de revisión.
- Para cambios sin efecto visual, indicar “No aplica” y el motivo. Ejecutar las verificaciones técnicas apropiadas al alcance, según `README.md`.

La checklist documenta la revisión del autor y del revisor. No constituye un bloqueo automático de GitHub ni reemplaza las comprobaciones: no se configuraron reglas de protección de ramas ni una validación visual automática.
