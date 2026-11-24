import { useCallback, useEffect, useRef, useState } from 'react';
import { humanizePortalError } from '@/models/PortalError';

export function usePortalData<T>(loader: () => Promise<T>) {
  const [result, setResult] = useState<{
    loader: () => Promise<T>;
    data: T | null;
    error: string | null;
  } | null>(null);
  const [refreshingLoader, setRefreshingLoader] = useState<(() => Promise<T>) | null>(null);
  const generation = useRef(0);
  const load = useCallback(() => {
    const current = ++generation.current;
    return Promise.resolve()
      .then(loader)
      .then(
        (data) => {
          if (current === generation.current) setResult({ loader, data, error: null });
        },
        (e: unknown) => {
          if (current === generation.current) {
            const message = humanizePortalError(e, 'No pudimos cargar los datos.');
            setResult((previous) => ({
              loader,
              data: previous?.loader === loader ? previous.data : null,
              error: message,
            }));
          }
        }
      )
      .finally(() => {
        if (current === generation.current) setRefreshingLoader(null);
      });
  }, [loader]);
  const invalidate = useCallback(() => {
    generation.current++;
  }, []);
  useEffect(() => {
    void load();
    return invalidate;
  }, [load, invalidate]);
  const refresh = useCallback(async () => {
    setRefreshingLoader(() => loader);
    await load();
  }, [load, loader]);
  const current = result?.loader === loader ? result : null;
  const hasData = current?.data != null;
  const reloading = refreshingLoader === loader;
  return {
    data: current?.data ?? null,
    loading: !current || (reloading && !hasData),
    refreshing: reloading && hasData,
    error: current?.error ?? null,
    refresh,
  };
}
export function usePortalAction() {
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  async function run(action: () => Promise<void>, success = 'Cambios guardados.') {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
      setNotice(success || null);
    } catch (e) {
      setError(humanizePortalError(e, 'No pudimos guardar los cambios.'));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return { busy, error, notice, run };
}
