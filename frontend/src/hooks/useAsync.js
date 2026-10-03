import { useCallback, useEffect, useRef, useState } from 'react';
import { apiError } from '../api/axios';

export function useDebounce(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const clientCache = new Map();

export function setMemoryCache(key, data, ttlMs = 30000) {
  if (!key) return;
  clientCache.set(key, { data, expires: Date.now() + ttlMs });
}

export function getMemoryCache(key) {
  if (!key) return undefined;
  const hit = clientCache.get(key);
  if (!hit) return undefined;
  if (hit.expires < Date.now()) {
    return hit.data; // Serve stale while revalidating
  }
  return hit.data;
}

export function clearMemoryCache(prefix = '') {
  if (!prefix) return clientCache.clear();
  for (const k of clientCache.keys()) {
    if (k.startsWith(prefix)) clientCache.delete(k);
  }
}

/**
 * Runs an async loader and exposes { data, loading, error, reload }.
 * Supports in-memory caching and Stale-While-Revalidate (SWR).
 */
export function useAsync(loader, deps = [], options = {}) {
  const cacheKey = typeof options === 'string' ? options : options.cacheKey;
  const ttl = options.ttl || 30000;

  const cached = cacheKey ? getMemoryCache(cacheKey) : undefined;
  const [state, setState] = useState({
    data: cached !== undefined ? cached : null,
    loading: cached === undefined,
    error: null,
  });
  const seq = useRef(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const run = useCallback(async ({ silent = false } = {}) => {
    const id = ++seq.current;
    const hasData = state.data !== null || (cacheKey && getMemoryCache(cacheKey) !== undefined);
    if (!silent && !hasData) {
      setState((s) => ({ ...s, loading: true, error: null }));
    }
    try {
      const data = await loaderRef.current();
      if (cacheKey) setMemoryCache(cacheKey, data, ttl);
      if (id === seq.current) setState({ data, loading: false, error: null });
    } catch (err) {
      if (id === seq.current) setState((s) => ({ data: silent || hasData ? s.data : null, loading: false, error: apiError(err) }));
    }
  }, [cacheKey, ttl, state.data]);

  useEffect(() => {
    run();
    return () => {
      seq.current += 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { ...state, reload: run, setData: (data) => setState((s) => ({ ...s, data })) };
}

export function useInterval(fn, ms, enabled = true) {
  const saved = useRef(fn);
  saved.current = fn;
  useEffect(() => {
    if (!enabled) return undefined;
    const id = setInterval(() => {
      if (!document.hidden) saved.current();
    }, ms);
    return () => clearInterval(id);
  }, [ms, enabled]);
}

export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · SkillSwap` : 'SkillSwap';
  }, [title]);
}

/** Countdown seconds helper for OTP resend cooldowns. */
export function useCountdown(initial = 0) {
  const [left, setLeft] = useState(initial);
  useEffect(() => {
    if (left <= 0) return undefined;
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  return [left, setLeft];
}
