# Mapa de capacidades: cierre del alcance actual de ReciVolt

Estado: los cuatro módulos (`cierre-flujos`, `alta-universidad`, `alta-cafe`, `validacion-cierre`) están aprobados y completados para el alcance web de ejemplo el 14 de octubre de 2026. Alcance actualizado con la aclaración «es de ejemplo»; module ids y dependencias conservados. Evidencia y límites en `tasks/validation.md`. Sin despliegue ni altas operativas.

## Pedido

Dejar terminada la app con las funciones que ya tiene, crear un punto verde llamado **Universidad de Pilar** y una empresa llamada **Cafe del Pellegrini** con un premio canjeable: **Un café**.

## Supuestos de alcance

- “Con lo que tiene” significa completar, corregir y verificar los recorridos existentes de ciudadano, empresa y administración. No se incorporan retiros, notificaciones, nuevas métricas ambientales ni preferencias que todavía no tienen circuito implementado.
- Se conserva la identidad de `DESIGN.md`, Expo SDK 57 y la arquitectura actual. El saldo canjeable es global; el XP se conserva separado.
- La demostración representa Universidad de Pilar como punto verde y Cafe del Pellegrini como comercio independiente. El circuito operativo existente usa saldo global entre organizaciones; estas muestras no generan créditos ni canjes.
- La aclaración más reciente «es de ejemplo», en respuesta a las cuentas responsables, se interpreta como una demostración de ambos lugares. Sustituye la expectativa inicial de altas operativas: se preparan muestras identificadas, sin cuentas ficticias, roles, entregas, canjes ni stock real. Si se solicitan altas operativas más adelante, requerirán su configuración correspondiente.
- Se preservan usuarios, permisos, entregas, movimientos y canjes existentes. La carga de los nuevos registros debe poder repetirse sin duplicarlos.
- Se usan los datos confirmados abajo. No se inventan coordenadas, días de atención, contactos ni disponibilidad del café para publicar los registros.

## Datos y decisiones vigentes

| Registro                 | Configuración                                                                                                                                                                                                             |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Universidad de Pilar     | Punto verde de ejemplo en Av. Honorio Pueyrredón, Ruta 25 Nº1837, Villa Rosa, Provincia de Buenos Aires. Lunes a sábado de 10:00 a 20:00; todas las categorías disponibles. Zona horaria: America/Argentina/Buenos_Aires. |
| Cafe del Pellegrini      | Empresa de canje en la misma dirección que Universidad de Pilar. El horario de canje no fue informado.                                                                                                                    |
| Un café                  | Premio de gastronomía asociado a Cafe del Pellegrini, costo inicial de 100 puntos globales, decidido por el agente por autorización expresa del usuario.                                                                  |
| Puntos por entregar RAEE | El usuario los definirá después. No se fijan ni se presentan tarifas como aprobadas; las tarifas existentes tampoco se sobrescriben.                                                                                      |

La elección de 100 puntos es el costo de muestra del premio, no una equivalencia económica ni una tarifa de acreditación por dispositivo. No habilita un canje real.

## Módulos

| Module id         | Responsabilidad                                                                                                                                                                          | Depende de                  |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| cierre-flujos     | Revisar y corregir los recorridos existentes de acceso, descubrimiento, entregas, saldo global, premios, canjes y portales; resolver bloqueos y estados engañosos dentro de ese alcance. | —                           |
| alta-universidad  | Mostrar Universidad de Pilar como punto verde de ejemplo, con dirección, horarios y todas las categorías; distinguirlo de puntos operativos y bloquear entregas reales.                  | cierre-flujos               |
| alta-cafe         | Mostrar Cafe del Pellegrini con Un café por 100 puntos como muestra, con la dirección indicada; bloquear canjes reales y no inventar cuentas, horarios ni stock.                         | cierre-flujos               |
| validacion-cierre | Revisar ambos ejemplos, sus estados y navegación; comprobar que no generan operaciones reales y conservar la evidencia del circuito operativo probado con fixtures locales.              | alta-universidad, alta-cafe |

Orden: cierre-flujos → alta-universidad, alta-cafe → validacion-cierre.

Cada módulo tendrá su especificación `SPEC-<module-id>.md`, siguiendo la skill solicitada. La primera es `SPEC-cierre-flujos.md`. Este mapa no sustituye las especificaciones ni es un plan de implementación.

## Evidencia inicial (histórica)

Estos hallazgos corresponden al inicio de la iniciativa. Las correcciones y comprobaciones posteriores están registradas en `tasks/validation.md`.

- El código contiene catálogo y detalle de premios, reservas de canjes, validación desde el lector empresarial, administración de premios y saldo global.
- `README.md` y `PROYECTO_Y_FEATURES.md` conservan descripciones anteriores que marcan recompensas como pendientes y presentan saldos por empresa. Deben reconciliarse con la implementación verificada.
- La existencia de código y migraciones no confirma que el backend remoto esté actualizado ni que el circuito real funcione; eso queda por comprobar.
- Los accesos a retiros siguen informando que el flujo no está habilitado. No se presentan como una función terminada.
- No se realizó todavía una revisión visual ni una validación en dispositivos físicos.

## Datos pendientes y límites de las muestras

1. La tarifa por categoría queda expresamente diferida por el usuario; no bloquea una muestra informativa.
2. El café no tiene horario ni stock confirmado. La muestra no los inventará ni necesitará una cuenta responsable.
3. Coordenadas: verificar antes de representar un marcador o calcular distancias. Si no se obtiene una ubicación verificable, mantener dirección y ficha útiles sin un marcador ficticio.
4. No se escribirán estas muestras en Supabase ni aparecerán como organizaciones administrables. El backend real y sus permisos se conservan.
