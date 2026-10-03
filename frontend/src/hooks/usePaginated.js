import { useCallback, useEffect, useRef, useState } from 'react';
import api, { apiError } from '../api/axios';

const pageCache = new Map();

/**
 * Server-paginated list with "load more". Resets whenever `paramsKey` changes.
 * Uses SWR caching on initial pages so tab switching is instantaneous.
 */
export default function usePaginated(path, params, paramsKey, { limit = 12 } = {}) {
  const cacheKey = `${path}:${paramsKey || ''}`;
  const cached = pageCache.get(cacheKey);

  const [state, setState] = useState({
    items: cached ? cached.items : [],
    page: cached ? cached.page : 0,
    hasMore: cached ? cached.hasMore : false,
    total: cached ? cached.total : 0,
    loading: !cached,
    loadingMore: false,
    error: null,
  });
  const seq = useRef(0);
  const paramsRef = useRef(params);
  paramsRef.current = params;

  const fetchPage = useCallback(
    async (page, { append }) => {
      const id = ++seq.current;
      const isInitial = page === 1 && !append;
      const hasInitialCache = isInitial && pageCache.has(cacheKey);

      setState((s) => (append ? { ...s, loadingMore: true, error: null } : { ...s, loading: !hasInitialCache, error: null }));
      try {
        const { data } = await api.get(path, { params: { ...paramsRef.current, page, limit } });
        if (id !== seq.current) return;
        if (isInitial) {
          pageCache.set(cacheKey, { items: data.items, page, hasMore: Boolean(data.hasMore), total: data.total ?? 0 });
        }
        setState((s) => ({
          items: append ? [...s.items, ...data.items] : data.items,
          page,
          hasMore: Boolean(data.hasMore),
          total: data.total ?? 0,
          extra: data,
          loading: false,
          loadingMore: false,
          error: null,
        }));
      } catch (err) {
        if (id !== seq.current) return;
        setState((s) => ({ ...s, loading: false, loadingMore: false, error: apiError(err) }));
      }
    },
    [path, limit, cacheKey]
  );

  useEffect(() => {
    fetchPage(1, { append: false });
    return () => {
      seq.current += 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey, fetchPage]);

  const loadMore = useCallback(() => fetchPage(state.page + 1, { append: true }), [fetchPage, state.page]);
  const reload = useCallback(() => fetchPage(1, { append: false }), [fetchPage]);
  const setItems = useCallback((fn) => setState((s) => ({ ...s, items: typeof fn === 'function' ? fn(s.items) : fn })), []);
  return { ...state, loadMore, reload, setItems };
}
