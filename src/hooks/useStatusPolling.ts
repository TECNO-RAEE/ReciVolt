import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { didTransitionToConfirmed, shouldPollStatus } from '@/models/ConfirmationWatcher';

type UseStatusPollingOptions<T extends string> = {
  resetKey?: string | null;
  status: T | null | undefined;
  pendingStatuses: readonly T[];
  confirmedStatuses: readonly T[];
  poll: () => Promise<void>;
  onConfirmed: () => void;
  intervalMs?: number;
};

export function useStatusPolling<T extends string>({
  resetKey,
  status,
  pendingStatuses,
  confirmedStatuses,
  poll,
  onConfirmed,
  intervalMs = 2500,
}: Readonly<UseStatusPollingOptions<T>>) {
  const [isFocused, setIsFocused] = useState(true);
  const previousRef = useRef<{ key: string | null | undefined; status: T | null }>({
    key: resetKey,
    status: null,
  });
  const pollRef = useRef(poll);
  const onConfirmedRef = useRef(onConfirmed);
  const inFlightRef = useRef(false);

  useEffect(() => {
    pollRef.current = poll;
    onConfirmedRef.current = onConfirmed;
  });

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      return () => setIsFocused(false);
    }, [])
  );

  useEffect(() => {
    if (previousRef.current.key !== resetKey) {
      previousRef.current = { key: resetKey, status: null };
    }
    const prev = previousRef.current.status;
    const next = status ?? null;
    previousRef.current = { key: resetKey, status: next };

    if (didTransitionToConfirmed(prev, next, pendingStatuses, confirmedStatuses)) {
      onConfirmedRef.current();
    }
  }, [resetKey, status, pendingStatuses, confirmedStatuses]);

  const polling = shouldPollStatus(status, isFocused, pendingStatuses);

  useEffect(() => {
    if (!polling) return;
    const timer = setInterval(() => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      void pollRef.current().finally(() => {
        inFlightRef.current = false;
      });
    }, intervalMs);
    return () => clearInterval(timer);
  }, [polling, intervalMs]);
}
