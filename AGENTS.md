# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# Lenguaje de diseño obligatorio

Antes de crear o modificar pantallas, componentes, estilos, iconos, navegación o textos de interfaz, leer [DESIGN.md](DESIGN.md). Es la guía compartida para todos los agentes y colaboradores del proyecto, basada en la vista del ciudadano.

Esta obligación alcanza a cualquier agente, herramienta de generación, diseñador o desarrollador que trabaje en este repositorio, incluidos colaboradores que lleguen desde Trello o una PR. Leer también [CONTRIBUTING.md](CONTRIBUTING.md). Al comenzar un cambio de interfaz, indicar qué componentes compartidos se reutilizarán; al entregarlo, documentar la revisión realizada.

- Aplicar la misma identidad a ciudadano, autenticación, empresa y admin. La mayor densidad de gestión no autoriza otra paleta, fuente o header.
- Reutilizar `ScreenHeader` en todas las pantallas salvo Inicio, y los componentes de `ActionButton`, `RewardsUI`, `PortalUI` y `AdminPage` según contexto.

## Regla del Header Común Obligatorio (`ScreenHeader`)

Todas las pantallas interiores de la aplicación (en cualquier rol: ciudadano, autenticación, empresa o administración), **con la única excepción de la pantalla de Inicio (`home.tsx`)**, deben implementar de forma obligatoria el componente compartido `ScreenHeader` (`src/components/ui/ScreenHeader.tsx`).

### Reglas de implementación para agentes y colaboradores:
1. **Ubicación estructural:** `ScreenHeader` debe ubicarse en la raíz de la pantalla, **fuera del `ScrollView`**, para permanecer visible y anclado al hacer scroll vertical.
2. **Propiedades estándar:**
   - `title`: Título centrado de la pantalla (Roboto 700, 20px, `colors.text`). No duplicar el título dentro del cuerpo de la pantalla si ya está en el header.
   - `back`: Ruta alternativa de retorno seguro (ej. `back="/my-raee"` o `back="/profile"`). Por defecto usa `router.back()` si hay historial disponible.
   - `onBack`: Handler opcional si la acción de retorno requiere confirmación o lógica personalizada.
   - `action`: Espacio a la derecha (44x44 px) reservado para icono/acción secundaria (ej. búsqueda o ayuda `(?)`), equilibrando la flecha izquierda.
3. **Prohibiciones estrictas:**
   - No crear cabeceras personalizadas o barras de navegación ad-hoc por pantalla.
   - No colocar logos comerciales ni isotipos en las cabeceras de pantallas interiores (la marca reside en Inicio).
   - No añadir botones flotantes o duplicados de volver atrás.
- Importar colores y fuentes desde `@/theme`. Roboto 400/500/700 y la paleta semántica de `DESIGN.md` son la referencia; no agregar variantes de marca incidentales.
- Respetar la navegación, los nombres y los estados reales documentados. No convertir capturas antiguas o datos de muestra en autoridad sobre decisiones recientes del usuario.
- Una desviación existente no es un precedente para nuevas pantallas. Corregirla dentro del alcance de la tarea o identificarla claramente.
- Si cambia una regla compartida aprobada, actualizar implementación, `DESIGN.md` y `.impeccable/design.json` juntos.
- Verificar los criterios de revisión de `DESIGN.md` antes de entregar cambios de interfaz. No declarar una revisión visual que no se realizó.
- Una tarea de interfaz no está terminada hasta revisar su conformidad con `DESIGN.md`. Corregir las desviaciones introducidas por el cambio y registrar cualquier pendiente con su motivo. Si falta revisión, dejarla pendiente de revisión; no afirmar cumplimiento.
- Las skills, los mockups y los generadores de interfaz se adaptan a la guía; no autorizan otra identidad ni reemplazan las decisiones explícitas del usuario. Crear tareas o imágenes no autoriza implementar esas pantallas.

Las instrucciones explícitas más recientes del usuario prevalecen sobre la guía. Las recomendaciones genéricas de skills y herramientas se adaptan a este lenguaje de diseño.
