import { useCallback, useEffect, useRef, useState, type DependencyList } from "react";
import { usePulse } from "./pulse";

/** Minimal data-loading hook: { data, error, loading, reload }. With `live`, it fetches again (quietly,
 *  no spinner) whenever something of the customer's changes on the server. */
export function useAsync<T>(fn: () => Promise<T>, deps: DependencyList = [], opts: { live?: boolean } = {}) {
  const [data, setData] = useState<T | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(fn, deps);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await load());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [load]);

  useEffect(() => {
    reload();
  }, [reload]);

  const pulse = usePulse();
  const seen = useRef(pulse);
  useEffect(() => {
    if (!opts.live || pulse === seen.current) return;
    seen.current = pulse;
    load()
      .then(setData)
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pulse]);

  return { data, error, loading, reload };
}
