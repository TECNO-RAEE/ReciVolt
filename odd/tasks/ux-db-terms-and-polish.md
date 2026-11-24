# UX block 3 & 5: DB integrity, Terms, Apple HIG craft & polish

Branch `feature/ux-db-terms-and-polish` (stacked on `feature/ux-accessibility-consistency`).
Source audit: `/Users/waltercaste/.gemini/antigravity-cli/brain/0cc92043-9634-42d6-a0c8-3522fc7dafb9/ux-audit-raw.md` + Apple HIG (`~/.claude/skills/apple-design/`) + Block 2/4 verification advisories.
Database changes target local Supabase ONLY (`npm run supabase:reset` + `npm run supabase:test`); NEVER touch remote Supabase.

## Specs

- S1 (Block 3 DB — `Adm-F2`, `E-UX-04`, `Adm-F3`, `E-UX-09`, `Adm-F6`):
  - New migration `supabase/migrations/20261124000000_atomic_point_save_and_search.sql`:
    - `private.portal_command` (`admin_save_point` & `save_point`): accept optional `intakePolicies` (`[{ deviceCategoryId, mode }]`) and `intakeConfirmed` (`boolean`) in payload; validate & atomically persist `green_point_device_policies`, sync `green_point_device_categories` from `'onsite'`, restore `intake_confirmed`, and audit `point_device_policy_saved` inside the single RPC transaction (rolling back company/point creation if policy validation fails); permit pickup-only points (`>=1` `'onsite'` or `'pickup'` entry when `intakePolicies` is passed) while preserving legacy `categories`-only error check for callers without `intakePolicies`.
    - `private.portal_command` (`save_company`): upsert `company_details` if absent instead of silently affecting 0 rows.
    - `private.admin_search_records`: include `description` matching for `'users'` (email), `'points'` (address), `'rewards'` (business_name) while keeping `'companies'` on name/ID only.
  - Add pgTAP tests in `supabase/tests/admin-green-points.test.sql` and `supabase/tests/admin-search-edit.test.sql`, verified with `npm run supabase:reset && npm run supabase:test`.
- S2 (Point Editor & AdminPoints — `Adm-F2`, `Adm-F7`, `Adm-F15`, `E-UX-12`):
  - `src/services/portal.service.ts`: pass `intakePolicies` / `intakeConfirmed` in `savePoint` (single atomic RPC); fix `"desde Invitaciones"` -> `"desde esta pantalla"` in `sendCompanyInvitation`.
  - `src/components/portal/CompanyPointEditor.tsx`: use atomic `savePoint`, preserve existing coordinates while editing address text until a suggestion or pin replaces them, add `"Mantener dirección actual"` reset option, use `PortalSelect` for timezones, sync `pickupEnabled` from `'pickup'` policies, adapt draft hint when `isAdmin`, validate upfront (`onsite` or `pickup` >= 1).
  - `src/components/portal/AdminPoints.tsx`: strip `' · Entre calles: '` in `locality()`, lift saved notice across transitions, clarify cancel orientation.
- S3 (Block 3 Terms `A-F02` & Auth/Settings/Index polish — `A-F17..A-F23`, `A-F27`, `A-F30`):
  - `src/models/RegisterInput.ts`, `src/app/(auth)/register.tsx`, `src/app/terms.tsx`: when `!termsUrl`, omit mandatory terms checkbox and show honest `InfoNote` pre-launch notice (`termsAcceptedAt: null`); when `termsUrl` is set, require acceptance with full-label checkbox toggle and `minHeight: 44` terms link. Fix inline email validation, clear stale errors on edit, `returnKeyType`/`onSubmitEditing`, map `weak_password`/`validation_failed`, persistent 6-char hint, remove duplicate body title `"Creá tu cuenta"`, style point link `colors.primaryDark` underlined; fix `terms.tsx` error color (`colors.danger`).
  - `src/app/(auth)/new-password.tsx`: add `AuthArtwork kind="lock"`, persistent 6-char hint, `returnKeyType="next"` ref chaining, clear confirmation.
  - `src/app/settings.tsx`, `src/app/index.tsx`: web sign-out confirmation modal + `destructive` `ActionButton`, role-aware help copy, guard `back` when `!role && !guest`, `ScreenHeader` + `colors.text` + loading logout on `accessError` in `index.tsx`, `colors.danger` on `logoutError`.
- S4 (Remaining Citizen Sev-2 & Advisories — `C-F06`, `C-F09`, `C-F15`, `C-F24`, `C-F25`, `C-F27`, Advisories):
  - `green-points.tsx`: use `FlatList` for list view, avoid crowded overlapping notices.
  - `my-activity.tsx`: style retry cards with clear button cue, stronger `entry.title` weight/size.
  - `rewards.tsx`: `minHeight: 44` on `.tab`, show `PointsBadge` + status badge on `MyRedemptions`.
  - `my-raee.tsx` / `PickupHistory.tsx`: avoid duplicate pickup CTA inside `'Todos'` empty pickup state.
  - `redemption/[id].tsx`: not-found empty state + CTA, `accessibilityRole="image"` on QR, `"Ver mis canjes"` link in `Reserved`.
  - `new-delivery.tsx`: preserve `notes` and compatible items across point change, surface `rates` error, `flexWrap: 'wrap'` on `stepperSectionRow`, `accessibilityLabel` on inputs, `accessibilityViewIsModal` on modals, `maxWidth: 960`.
  - `delivery/[id].tsx`: `destructive` on `"Sí, cancelar"`.
- S5 (Company, Admin, PortalError & Design Doc Advisories — `E-UX-07..09`, `E-UX-14..16`, `Adm-F8`, `Adm-F13..15`, Advisories):
  - `PortalError.ts` + `tests/portal-error.test.mjs`: add `'esta'`, `'este'`, `'ajeno'` to `SPANISH_MARKERS`.
  - `company/index.tsx`, `company/points.tsx`, `company/profile.tsx`, `company/pickups/[id]/coordinate.tsx`: pass `refreshing` + load before menu on `company/index.tsx`; `"Política pendiente"` badge + `"Solicitar punto verde"` on `company/points.tsx`; `"Datos de la empresa"` + `phone-pad`/`url` + legal `/contact` link on `company/profile.tsx`; `'Reprogramación guardada.'` + preserve custom legacy slot in `coordinate.tsx`.
  - `company/scanner.tsx`, `ScannerLookupView.tsx`, `DeliveryConfirmationView.tsx`, `DeliveryPhotoPreview.tsx`: migrate `scanner.tsx` to `PortalPage` (`maxWidth: 960`), reuse `ActionButton`/`InfoNote`/`PortalFeedback`, notice above action buttons, `"Actualizar estado"`, `accessibilityLiveRegion="polite"`, stepper `+/-` `accessibilityLabel`s, `flexWrap: 'wrap'`, photo load error/retry.
  - `CompanyTeam.tsx`, `CompanyRewards.tsx`: confirm disabling active worker, replace 1-option disabled role dropdown with static text; hide raw UUIDs and empty search in `CompanyRewards`, add `/contact?topic=reward` empty CTA, adopt `PortalListItem` + `PortalBadge`.
  - `AdminRewards.tsx`, `AdminChangelog.tsx`, `Changelog.ts` + `tests/changelog.test.mjs`: compute `'Vencido'` status with `endsAt`, icon fallback for 64px `RewardPhoto` thumbnails, `PortalSelect` for category + trim `imageUrl` + preview, translate `changelogChanges` keys/booleans, `"Limpiar filtros"` in `AdminChangelog`.
  - `DESIGN.md`, `.impeccable/design.json`: add `overlay` to `DESIGN.md` frontmatter, add `borderControl` to `.impeccable/design.json` `colorMeta` and `#748591` to `.ds-field`/`.ds-select`.

## Tasks

| ID | Specs | Route | Commit |
|---|---|---|---|
| T1 | S1-S2 | delegated + local Supabase (`admin_save_point`, `save_company`, `admin_search_records`) | a5fe6b3 |
| T2a | S3 (Terms A-F02 + auth/settings/index) | delegated + verified | 14780b3 |
| T2b | S4 (citizen Sev-2 & advisories) | delegated + verified | 5026f47 |
| T3 | S5 (company/admin/HIG polish & DESIGN.md) | delegated + verified | 8cc812f |

## Log

- L1: User invoked `/goal termina con todos los bloques, para las decisiones hace lo que recomiendes` and requested using `apple-design` skill. Local Supabase started cleanly; implementing Blocks 3 & 5 + Apple HIG craft + all Block 2/4 advisories.
- L2 (2026-11-24): Independent verifier (`odd-verifier`) passed S1, S2, S3, S5 and flagged 1 blocker in S4 (`src/app/new-delivery.tsx` `stepperSectionRow` missing `flexWrap: 'wrap'`) plus leftover unused styles in `new-delivery.tsx` and duplicate empty CTA on `my-raee.tsx` `'Retiros'` tab. Fixed all three, verified `tsc` (0), `lint` (0), `node --test` (89/89).
