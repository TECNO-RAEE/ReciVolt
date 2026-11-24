# UX Follow-up: Reward fallback photos, Apple HIG Dark Mode, QR confirmation modal

Branch `feature/ux-rewards-darkmode-qr` (accumulates UX Blocks 1–5 + follow-ups over `main`).
Delivery strategy: `exception-ok` (user-selected consolidated PR to `main` with `size:exception`; work-unit commits remain cohesive). Chain strategy: `single-to-main`.
Test runner: `npx tsc --noEmit && npm run lint && node --test tests/*.test.mjs`.

## Specs

- S1 (Missing reward photos — `"otra cosa, algunos premios no tienen foto, revisa y agregales si falta"`):
  - `src/models/Reward.ts` & `src/data/rewardExamples.ts`: export curated HTTPS fallback photo resolver `rewardCategoryFallbackImage(category)` and `rewardEffectiveImageUrl(reward, allowFallback?)` covering every `RewardCategory` (`food`, `wellness`, `education`, `shopping`, `other`) using HTTP-200 verified Unsplash images; cover with unit tests in `tests/reward.test.mjs`.
  - `src/components/rewards/RewardsUI.tsx`: update `RewardPhoto` to accept optional `category?: RewardCategory` and resolve `imageUrl` -> category fallback (plus error fallback to category photo unless disabled for strict URL preview); add shared circular `RewardThumbnail` component (`size`, `reward`).
  - Pass `category` in `RewardCard.tsx`, `reward/[id].tsx`, `redemption/[id].tsx`, `rewards.tsx` (`MyRedemptions`), `AdminRewards.tsx`, and `CompanyRewards.tsx` (removing duplicate `RewardThumbnail` / `RewardThumb`).
  - `AdminRewards.tsx` (`RewardEditor`): inform admin that blank `imageUrl` uses the default category photo and preview it cleanly; validate typed URLs without masking invalid external URLs during editor preview.
- S2 (Dark Mode — `"hace un modo oscuro luego de que tengas todas los bloques hechosm recorda modo oscuro que respete apple design"`):
  - Respect Apple HIG Dark Mode (`~/.claude/skills/apple-design/references/hig/dark-mode.md`): follow systemwide appearance automatically (`app.json` `"userInterfaceStyle": "automatic"`, no app-specific toggle), dimmed base background + elevated foreground surface hierarchy, semantic adaptive colors meeting >= 4.5:1 WCAG AA contrast, preserve crisp `#FFFFFF` quiet zone behind QR codes, and adapt `EcoArtwork` & map containers without blinding white glare.
  - Extend `src/theme/colors.ts` & `src/theme/index.ts` with `lightColors`, `darkColors`, `ThemeColors`, `getColors(scheme)`, `ThemeProvider`, and `useColors()`.
  - Convert shared theme consumers (`src/app/_layout.tsx` `<StatusBar style="auto" />`, `PortalUI`, `RewardsUI`, `EcoArtwork`, map components, hardcoded hexes in `DeliverySummary`, `pickup/[id]`, etc.) and all `@/theme` screen/component files to dynamic `useColors()` + `useMemo` styles.
  - Update `DESIGN.md` & `.impeccable/design.json` together with dark palette tokens; verify contrast ratios for both light & dark palettes and JSON parsing.
- S3 (QR scan confirmation modal — `"otra cosa, si estas en la pagina de qr y la empresa te escanea y confirma te tiene que aparecer un modal de exito con un boton de volver al inicio"`):
  - `src/models/ConfirmationWatcher.ts` + `tests/confirmation-watcher.test.mjs`: pure `didTransitionToConfirmed(previousStatus, nextStatus, pendingStatuses, confirmedStatuses)`.
  - `src/hooks/useStatusPolling.ts`: silent focus-aware polling (~2500ms while `useIsFocused()` is true and status is pending), without triggering loading spinners (local Supabase excludes `realtime`).
  - `src/components/ui/ScanSuccessModal.tsx`: shared accessible Apple-HIG modal (`accessibilityViewIsModal`, `SuccessArtwork`, primary `ActionButton` `"Volver al inicio"` -> `router.replace('/home')`, secondary `"Ver detalle"`).
  - Integrate on `src/app/delivery/[id].tsx` (`PENDING_RECEPTION` -> `CONFIRMED` + `wallet.refresh()`), `src/app/redemption/[id].tsx` (`RESERVED` -> `REDEEMED`), and `src/app/pickup/[id].tsx` (`REQUESTED`/`COORDINATED`/`IN_TRANSIT` -> `COMPLETED` + `wallet.refresh()` + close details modal).
- S4 (Settings & Home appearance toggle — `"dede configuraciones deberias poder cambiar el modo oscuro"` + `"se me ocurre que ademas de que el modo oscuro este en configuraciones, tambien puede estar en lugdar del icono de perfil en inicio en la esquina superior derecha con una lunita para oscuro y sol cuando esta claro"`):
  - Extend `src/theme/{palette,ThemeContext,colors,index}.ts` with `ThemePreference = 'system' | ColorScheme`, `parseThemePreference`, `resolveColorScheme`, persisted preference (`recivolt:theme_preference:v1` via synchronous `window.localStorage` read on web + `AsyncStorage` hydration), `Appearance.setColorScheme` on native, web `colorScheme`/`backgroundColor` sync, and `useThemePreference()`.
  - Add `"Apariencia"` radio card (`Automático`, `Claro`, `Oscuro`) in `src/app/settings.tsx` (`accessibilityRole="radio"`, `accessibilityState={{ checked }}`, `aria-checked={selected}`), plus clean explicit `accessibilityLabel`s in `src/app/(app)/profile.tsx` and unit test in `tests/theme.test.mjs`.
  - Replace top-right profile circle in `src/app/(app)/home.tsx` with a 44×44 appearance toggle button (`sunny` icon when light, `moon` icon when dark, `aria-pressed={isDark}`, descriptive `accessibilityLabel`/`accessibilityHint`, press feedback `opacity: 0.7`, calling `setPreference(isDark ? 'light' : 'dark')`) while `Perfil` stays accessible via bottom tab bar.
  - Update `DESIGN.md` and `.impeccable/design.json` together to document the explicit user appearance preference decision (`Automático` default + Settings + Home header toggle).
- S5 (Playwright E2E installation & checks — `"instala playwright y hace las comprobaciones"`):
  - Install `playwright` (`package.json`, `package-lock.json`).
  - Add `tests/integration/darkmode-qr-rewards.test.mjs` covering Home sun/moon toggle, reload persistence, Settings bidirectional radio sync, mobile/desktop light & dark captures, reward category fallback image rendering in dark mode, and live local Supabase QR confirmation -> `ScanSuccessModal` + `"Volver al inicio"`.
  - Align stale selectors/fixtures in `tests/integration/card10-pickup-ops.test.mjs` (`Localidad *`, `'Perfil'` tab), `tests/integration/point-examples.test.mjs` (`PointCardPreview`, `intake_confirmed`, `green_point_device_policies`, `PointFilterSheet`), and `tests/integration/reward-examples.test.mjs` (`'500 puntos'`).

## Tasks

| ID | Specs | Route | Commit |
|---|---|---|---|
| T1 | S1 (Missing reward photos + unified thumbnail) | inline | 0a7d37c |
| T2 | S2 (Theme infrastructure + HIG dark tokens + DESIGN.md/design.json + shared UI) | inline | a7b0294 |
| T3 | S2 (Migrate screen/component `@/theme` consumers to `useColors()`) | delegated parallel writers (disjoint surfaces) | a7b0294 |
| T4 | S3 (QR confirmation watcher, silent polling, ScanSuccessModal) | inline | da34b95 |
| T5 | S4 (Settings Apariencia radio group, Home sun/moon toggle, theme persistence & docs sync) | inline | 5416784 |
| T6 | S5 (Install Playwright, add darkmode-qr-rewards E2E suite, update E2E suites & verify all checks) | inline | 92763e4 |

## Log

- L1: User requested in follow-up messages (after Blocks 1–5): (1) "otra cosa, algunos premios no tienen foto, revisa y agregales si falta", (2) "hace un modo oscuro luego de que tengas todas los bloques hechosm recorda modo oscuro que respete apple design", (3) "otra cosa, si estas en la pagina de qr y la empresa te escanea y confirma te tiene que aparecer un modal de exito con un boton de volver al inicio". Orca resume directive (`msg_9c8b97be4811`) confirmed executing them in this exact order.
- L2 (2026-11-24): Implemented S1 (`0a7d37c`), S2 across 94 files (`a7b0294`, 3 parallel writers + `tests/theme.test.mjs` WCAG AA audit + `DESIGN.md` & `.impeccable/design.json` synced), and S3 QR polling/modal (`da34b95`, `ConfirmationWatcher`, `useStatusPolling`, `ScanSuccessModal`, `delivery/[id]`, `redemption/[id]`, `pickup/[id]`). Verified `tsc` (0), `lint` (0), `node --test tests/*.test.mjs` (96/96), and local Supabase integration tests (5/5).
- L3 (2026-11-24): Independent `odd-verifier` verified `da34b95` vs `817ba33` across S1, S2, and S3 with verdict PASS (0 blockers). Live OS/browser screenshot checks remain pending outside CLI scope.
- L4 (2026-11-24): User requested installing Playwright, running web checks, adding Dark Mode switching in Settings (`Configuraciones`), and replacing Home's top-right profile button with a sun/moon appearance toggle. Implemented S4 & S5 inline. Verified `npx tsc --noEmit` (0 errors), `npm run lint` (0 errors/warnings), `node --test tests/*.test.mjs` (97/97), `recovery` + `reward-concurrency` integration (5/5), `npm run supabase:test` (318/318), `.impeccable/design.json` valid JSON, and all 5 Playwright E2E suites (11/11 pass) against `npx expo export --platform web` static build served locally with visual review of light/dark mobile & desktop screenshots under `output/verification/`.
- L5 (2026-11-24): Metro dev server (`expo start --web`) intermittently raises `Metro error: Requiring unknown module` on first cold lazy-SSR document load/reload of routes (already documented in `tests/integration/card10-pickup-ops.test.mjs`); serving the static `expo export --platform web` build (`app.json` `"web": { "output": "static" }`) passes 11/11 reliably without SSR flakes.
- L6 (2026-11-24): Independent `independent-verifier` (`1ff51f7f`) checked `cb3284b..ca44c89` (`5416784`, `92763e4`, `ca44c89`) in a fresh `/tmp` scratch copy (`tsc` 0, `lint` 0, unit 97/97, WCAG AA contrast audit, `expo export --platform web` 57 routes, Playwright E2E 11/11, Supabase integration 5/5) and issued `VERDICT: PASS` (0 blockers).
