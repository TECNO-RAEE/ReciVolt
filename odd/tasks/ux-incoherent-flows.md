# UX block 2: incoherent flows

Branch `feature/ux-incoherent-flows` (stacked on `feature/ux-dead-ends`). Source audit: `/Users/waltercaste/.gemini/antigravity-cli/brain/0cc92043-9634-42d6-a0c8-3522fc7dafb9/ux-audit-raw.md`.
Deferred pending decisions/backend: `A-F02` (legal decision on Terms), `Adm-F2` / `E-UX-04` (Supabase RPCs).
Every UI change must follow AGENTS.md and DESIGN.md (ScreenHeader, theme tokens, shared components).

## Specs

- S1 (C-F16): In `src/app/my-raee.tsx`, `'Todos'` must not mirror `'Entregas'` alone; show both deliveries and pickups (e.g., both sections/histories) and both `"Registrar entrega"` and `"Solicitar retiro a domicilio"` CTAs, while `'Entregas'` and `'Retiros'` show their respective list and CTA.
- S2 (C-F07, C-F08): In `src/app/(app)/my-activity.tsx`, fix `listEmpty` so `'Todos'` shows `"Todavía no hay actividad en esta sección."` when empty instead of returning `null`, and restrict `"Tus retiros aparecerán acá"` (`showRetirementInfo`) to `'Retiros'` when no pickups exist. Also sync `filter` when `params.tab` changes across tab revisits.
- S3 (C-F33, C-F34): In `src/app/pickup/[id].tsx`, relabel `"Ver detalle de la solicitud"` to `"Ver código / QR de retiro"`, fix the web cancel modal so `"Conservar solicitud"` is primary and `"Sí, cancelar retiro"` is secondary, and fix quantity pluralization using `confirmedQuantity ?? declaredQuantity`.
- S4 (C-F29, C-F30, C-F31): In `src/app/pickup/new.tsx`, remove hardcoded `'Pilar'` default on `locality` (start empty with `"Ej. Pilar"` placeholder), preserve typed address/contact/notes across point changes, prevent duplicate categories in items/picker, handle `0` categories gracefully with `"Elegir otro punto"`, label phone optional/required clearly, and allow tapping submit to display inline validation errors instead of disabling silently.
- S5 (E-UX-01, E-UX-02, E-UX-03): In `company/scanner.tsx` and scanner views + `DeliveryHistory.tsx`: auto-run `lookup(initialCode)` when `?code=` is passed (with loading state) and rename `"Ver recepción"` to `"Ver entrega"`; handle `PICKUP` codes via `getPickupByCode` (querying `pickups` by `company_id` + `verification_token` and routing to `/company/pickups/[id]/receive`, with fallback if a manual `TR-` code belongs to a pickup rather than delivery), remove the unreachable reward error branch, and mention both `TR-…` and `TRR-…` in lookup/help copy; rename `"Cancelar y volver"` to `"Escanear otro código"` and clarify the 0-unit notice that exiting leaves the delivery pending.
- S6 (E-UX-05, UX-11): In `src/models/Pickup.ts` and `src/app/company/pickups/**`: add `'CANCELLED'` (`"Cancelados"`) tab to `pickups/index.tsx`; allow rescheduling/cancelling `COORDINATED` pickups (`canCoordinatePickup` or dedicated helper matching SQL `pickup_command`), prefill existing coordination values in `coordinate.tsx`, and show `"Reprogramar o cancelar"` in `receive.tsx` for `COORDINATED`; add `back="/company/pickups"` on `coordinate.tsx` and `receive.tsx`; guard `router.canGoBack()` on cancel in `coordinate.tsx` and style `"Confirmar cancelación"` as secondary (not primary green); warn/require confirmation before completing a pickup with `0` units in `receive.tsx`.
- S7 (A-F04, A-F05): In `src/app/(auth)/onboarding.tsx`: on slide 0 when `!router.canGoBack()`, pass `hideBack` to `ScreenHeader` instead of calling `finish()` into guest `/home`; on slide 3 (`index === 2`), align copy and actions by offering `"Crear cuenta"` as primary CTA (`continueAsGuest()` then `router.push('/register')`) and `"Explorar sin cuenta"` as secondary CTA (`finish()`), while preserving `accessibilityLabel="Saltar introducción"` on the top-right skip button.
- S8 (A-F08, A-F09): In `src/config/contact.ts`, `src/app/contact.tsx`, `src/app/company-application.tsx`: add a general `'support'` topic (`"Soporte o consulta"`) as default when `?topic` is not `'point'` or `'reward'` (preserving `/company-application` -> `?topic=point`); when `contactEmail` is empty, hide the disabled `"Preparar correo"` button and interactive template checklist in favor of an honest `InfoNote` notice; when `contactEmail` is set, allow copying email/template as fallback; fix error text color (`colors.danger`) and unselected radio icon contrast (`colors.textSecondary`).

## Tasks

| ID | Specs | Route | Commit |
|---|---|---|---|
| T1 | S1-S3 | delegated parallel (Unit A: citizen activity & QR) | f7312ee |
| T2 | S4 | delegated parallel (Unit A: pickup draft) | fbe1c1c |
| T3 | S5-S6 | delegated parallel (Unit B: company scanner & pickups) | 07270ab |
| T4 | S7-S8 | delegated parallel (Unit B: onboarding & contact) | final commit on branch |

## Log

- L1: User requested UX audit & fixes with `ux-heuristics` and `impeccable`; Block 1 (`feature/ux-dead-ends`) verified PASS; continuing with Block 2 (`feature/ux-incoherent-flows`) excluding legal/DB-blocked items `A-F02` and `Adm-F2`.
