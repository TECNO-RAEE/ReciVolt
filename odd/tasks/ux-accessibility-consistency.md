# UX block 4: accessibility and consistency

Branch `feature/ux-accessibility-consistency` (stacked on `feature/ux-incoherent-flows`). Source audit: `/Users/waltercaste/.gemini/antigravity-cli/brain/0cc92043-9634-42d6-a0c8-3522fc7dafb9/ux-audit-raw.md`.
Token/doc baseline updated first by parent: `src/theme/colors.ts`, `DESIGN.md`, `.impeccable/design.json` (`navInactive: '#53676D'` AA 5.95:1; `borderControl: '#748591'` AA non-text 3.81:1; `.ds-chip` 44px).

## Specs

- S1 (Shared error translation & refresh resilience — C-F36, E-UX-13, Adm-F4, A-F12): Create `src/models/PortalError.ts` with `humanizePortalError(cause, fallback)` so raw PostgREST/Postgres/network/JWT errors never reach users while Spanish SQL business exceptions pass through. Update `usePortalData.ts` to use it, preserve prior `data` on refresh failures, and expose `refreshing`. Update `PortalPage`, `CompanyPage`, `AdminPage` to pass `refreshing` and render `PortalFeedback` inline when `data && error`.
- S2 (Shared UI a11y & controls — Adm-F10, Adm-F11, Adm-F12, A-F14, E-UX-10, E-UX-16):
  - `ActionButton.tsx`: keep `accessibilityLabel={title}` while `loading`, add optional `destructive` variant.
  - `AuthTextField.tsx`: use `minHeight` instead of fixed `height` on label/inputContainer so scaled text never clips; use `colors.borderControl` border.
  - `SearchBar.tsx`: >=44x44 clear/submit touch targets, `colors.textSecondary` placeholder, `colors.borderControl` border.
  - `PortalUI.tsx`: `PortalField` `borderControl` border, `104px` width for compact `suffix` inputs (supporting up to 7 digits in `category-points.tsx`), default `autoCapitalize="sentences"`; `PortalChoice` optional `role` (`checkbox`|`radio`|`button`) + `flex: 1, minWidth: 0`; `PortalToggle` full-row pressable; `CompanyPage` guard mentions retiros + `"Volver a Mi empresa"` button.
- S3 (Admin clarity & confirmations — Adm-F5, Adm-F6, Adm-F9, Adm-F10):
  - `AdminSearch.tsx`: translate `'ACTIVE'`/`'SUSPENDED'` to Spanish `PortalBadge` (`Activa`/`Suspendida`); hide pagination on empty page 0; split `CompanyFields` save vs suspend feedback; require confirmation + 5-char hint for suspension.
  - `LimitsManager.tsx`: relabel pending `"Cupo autorizado"` -> `"Cupo solicitado"`; show org reason above admin reason input; keep `"Revisión guardada."` visible at parent level across refresh.
- S4 (Citizen tabs, contrast, & touch targets — C-F01, C-F05, C-F06, C-F13, C-F14):
  - `(app)/_layout.tsx`: use `colors.navInactive` (`#53676D`).
  - `(app)/green-points.tsx`: `ViewToggle` pills `minHeight: 44, justifyContent: 'center'`; fix `"0 puntos de ejemplo"` demo label when filters match 0.
  - `(app)/rewards.tsx`: replace render-time `setState` with `useEffect` syncing `params.tab` both ways; chips `minHeight: 44`; replace `'#fff'` with `colors.textOnPrimary`; add clear search button (`44x44`) and `"Limpiar filtros"` empty CTA; hide empty demo category chips when preview has 0 items for that category.
- S5 (Citizen balance, home/profile IA, & impact — C-F02, C-F03, C-F04, C-F10, C-F12, C-F17):
  - `RewardsUI.tsx`: dynamic `accessibilityLabel` on `PointsCard` and `RewardsBalance` for `error` / `!onPress`.
  - `CitizenBalanceCard.tsx` + `(app)/my-points.tsx`: unify balance card to `PointsCard`/`PointsCoin` (no lightning icon) and unify wallet+history error messaging.
  - `(app)/home.tsx`: relabel `"Impacto"` quick access -> `"Preparar equipos"`, remove `"RAEE"` jargon in `impactHint`, show `locationError` with `colors.danger` + `accessibilityRole="alert"`, `#DCEBE0` -> `colors.primarySoft`.
  - `(app)/profile.tsx`: unify title `"Perfil"` for guest & signed-in; route `"Mis entregas"` -> `/my-raee` and add `"Mi actividad"` -> `/my-activity`; add web sign-out confirmation modal.
  - `impact.tsx`: relabel `"Mi impacto"` -> `"Preparar dispositivos"` and add direct link to `/device-categories`.
- S6 (Citizen detail screens, false affordances, & auth polish — C-F18..C-F23, C-F28, A-F13, A-F16, A-F26):
  - `device-categories.tsx` & `device-unaccepted.tsx`: remove false `accessibilityRole="button"` / `chevron-forward` on static rows; include `'especiales'` in global categories; hide search when `!point` in `device-unaccepted`; use `CitizenPage` and return to `/point/${pointId}` when set.
  - `point/[id].tsx`: parameterize `AccountRequired` title per action and drop duplicate back button; color closed/unknown hours with `colors.danger`/`colors.textSecondary`; remove WIP photo placeholder text; humanize timezone; gate `"Ver listado completo"` at `> 4` categories.
  - `reward/[id].tsx`: show `"Saldo no disponible"` on `wallet.error`, use `pointsLabel`, add `"Ver otros premios"` when `!reward`, use `colors.overlay`.
  - `delivery/[id].tsx`: reuse `CopyableCode`, use `pointsLabel` / `"unidades"`, drop raw enum fallback, use `ActionButton` in modal, use `CitizenPage` (`maxWidth: 960`).
  - `(auth)/forgot-password.tsx` & `(auth)/login.tsx`: OTP accessibility (`no-hide-descendants` on visual boxes, `colors.borderControl` border, disable verify `< 6` digits, resend cooldown, step-2 header back returns to step 1, `router.replace('/login')`); login invalid-credentials modal uses `colors.overlay`, `colors.danger`/`dangerBackground`, passes `?email=` to `/forgot-password`, and clears stale errors on input.

## Tasks

| ID | Specs | Route | Commit |
|---|---|---|---|
| T0 | Token & design doc sync | inline (`colors.ts`, `DESIGN.md`, `design.json`) | 394478c |
| T1a | S1 (error humanization & refresh resilience) | delegated + parent seam (`admin/index.tsx`, `CompanyPortalProvider.tsx`) | 8ac9928 |
| T1b | S2 (44px targets, scalable fields, control borders) | delegated parallel (Unit 1) | cfbbb2a |
| T1c | S3 (admin search & limits review) | delegated parallel (Unit 1) | a713c25 |
| T2 | S4-S5 (citizen tabs, balance card, home/profile IA) | delegated parallel (Unit 2) | 7bf0b20 |
| T3a | S6 (citizen detail screens) | delegated parallel (Unit 3) | next commit |
| T3b | S6 (auth forgot-password OTP & login error modal) | delegated parallel (Unit 3) | final commit on branch |

## Log

- L1: User approved continuing with Block 4 (`"si"`).
