import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 20000,
  headers: { Accept: 'application/json' },
});

// Session expired or invalid: tell the app once (AuthContext clears state and redirects).
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response && err.response.status;
    const url = (err.config && err.config.url) || '';
    const isAuthProbe = url.startsWith('/auth/');
    if (status === 401 && !isAuthProbe) window.dispatchEvent(new Event('auth:expired'));
    return Promise.reject(err);
  }
);

/** Turns any thrown error into { message, fields, code } that is always safe to show. */
export function apiError(err) {
  const data = err && err.response && err.response.data && err.response.data.error;
  if (data) return { message: data.message, fields: data.fields || {}, code: data.code, extra: data };
  if (err && err.code === 'ECONNABORTED') return { message: 'The request timed out. Please try again.', fields: {}, code: 'TIMEOUT' };
  if (err && !err.response) return { message: "Can't reach the server. Check your connection and try again.", fields: {}, code: 'NETWORK' };
  return { message: 'Something went wrong. Please try again.', fields: {}, code: 'UNKNOWN' };
}

// De-duplicates identical in-flight GETs and caches rarely-changing data briefly.
const inflight = new Map();
const cache = new Map();
export function cachedGet(url, { params, ttl = 60000, signal } = {}) {
  const key = url + JSON.stringify(params || {});
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return Promise.resolve(hit.data);
  if (inflight.has(key)) return inflight.get(key);
  const p = api
    .get(url, { params, signal })
    .then((r) => {
      cache.set(key, { data: r.data, expires: Date.now() + ttl });
      return r.data;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}
export const clearApiCache = () => cache.clear();

export default api;
