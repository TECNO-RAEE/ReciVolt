export const activityFilters = ['Todos', 'Entregas', 'Retiros', 'Canjes'] as const;
export type ActivityFilter = (typeof activityFilters)[number];
export type ActivityEntryKind = 'DELIVERY' | 'PICKUP' | 'REDEMPTION';

const kindForFilter: Record<Exclude<ActivityFilter, 'Todos'>, ActivityEntryKind> = {
  Entregas: 'DELIVERY',
  Retiros: 'PICKUP',
  Canjes: 'REDEMPTION',
};

/**
 * Resolves a route `tab` search param into a valid activity filter, defaulting to `'Todos'`.
 */
export function resolveActivityFilter(tab?: string | string[] | null): ActivityFilter {
  const raw = Array.isArray(tab) ? tab[0] : tab;
  const normalized = raw?.trim().toLowerCase();
  if (!normalized) return 'Todos';
  return activityFilters.find((item) => item.toLowerCase() === normalized) ?? 'Todos';
}

/**
 * Filters activity entries according to the active filter chip.
 */
export function filterActivityEntries<T extends { kind: ActivityEntryKind }>(
  entries: readonly T[],
  filter: ActivityFilter
): T[] {
  if (filter === 'Todos') return [...entries];
  const expectedKind = kindForFilter[filter];
  return entries.filter((entry) => entry.kind === expectedKind);
}

export interface ActivityEmptyStateInput {
  filter: ActivityFilter;
  visibleCount: number;
  totalCount: number;
  hasPickups: boolean;
  mayHaveMorePickups: boolean;
  loading: boolean;
  error: string | null;
}

export interface ActivityPresentationState {
  showLoading: boolean;
  showInitialError: boolean;
  showRetirementInfo: boolean;
  showEmptySectionMessage: boolean;
}

/**
 * Computes mutually consistent empty, loading, error, and pickup-onboarding visibility states.
 */
export function getActivityPresentationState(
  input: ActivityEmptyStateInput
): ActivityPresentationState {
  const showLoading = input.loading;
  const showInitialError = !showLoading && Boolean(input.error) && input.totalCount === 0;
  const showRetirementInfo =
    !showLoading &&
    !showInitialError &&
    input.filter === 'Retiros' &&
    !input.hasPickups &&
    !input.mayHaveMorePickups;
  const showEmptySectionMessage =
    !showLoading && !showInitialError && input.visibleCount === 0 && !showRetirementInfo;

  return {
    showLoading,
    showInitialError,
    showRetirementInfo,
    showEmptySectionMessage,
  };
}
