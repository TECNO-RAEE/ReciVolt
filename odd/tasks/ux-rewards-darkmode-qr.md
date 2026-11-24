# UX Follow-up: Reward fallback photos, Apple HIG Dark Mode, QR confirmation modal

Branch `feature/ux-rewards-darkmode-qr` (stacked on `feature/ux-db-terms-and-polish`).
Delivery strategy: `exception-ok` (stacked branch; dark mode spans `@/theme` and consumers cleanly in cohesive work-unit commits). Chain strategy: `stacked-to-main`.
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

## Tasks

| ID | Specs | Route | Commit |
|---|---|---|---|
| T1 | S1 (Missing reward photos + unified thumbnail) | inline | done (committed after 90/90 unit + tsc + lint) |
| T2 | S2 (Theme infrastructure + HIG dark tokens + DESIGN.md/design.json + shared UI) | inline | pending |
| T3 | S2 (Migrate screen/component `@/theme` consumers to `useColors()`) | delegated parallel writers (disjoint surfaces) | pending |
| T4 | S3 (QR confirmation watcher, silent polling, ScanSuccessModal) | inline | pending |

## Log

- L1: User requested in follow-up messages (after Blocks 1–5): (1) "otra cosa, algunos premios no tienen foto, revisa y agregales si falta", (2) "hace un modo oscuro luego de que tengas todas los bloques hechosm recorda modo oscuro que respete apple design", (3) "otra cosa, si estas en la pagina de qr y la empresa te escanea y confirma te tiene que aparecer un modal de exito con un boton de volver al inicio". Orca resume directive (`msg_9c8b97be4811`) confirmed executing them in this exact order.
