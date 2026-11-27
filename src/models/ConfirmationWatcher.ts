export function didTransitionToConfirmed<T extends string>(
  previousStatus: T | null | undefined,
  nextStatus: T | null | undefined,
  pendingStatuses: readonly T[],
  confirmedStatuses: readonly T[]
): boolean {
  if (!previousStatus || !nextStatus) return false;
  return pendingStatuses.includes(previousStatus) && confirmedStatuses.includes(nextStatus);
}

export function shouldPollStatus<T extends string>(
  status: T | null | undefined,
  isFocused: boolean,
  pendingStatuses: readonly T[]
): boolean {
  if (!isFocused || !status) return false;
  return pendingStatuses.includes(status);
}
