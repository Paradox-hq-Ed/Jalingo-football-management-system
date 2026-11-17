export class ApiError extends Error {
  constructor(status, message, details) { super(message); this.name = 'ApiError'; this.status = status; this.details = details; }
}

/** One client per product so club and league sessions never mix. */
export function createApi({ storageKey, base = '' } = {}) {
  const store = {
    get: () => { try { return localStorage.getItem(storageKey); } catch { return null; } },
    set: (v) => { try { v ? localStorage.setItem(storageKey, v) : localStorage.removeItem(storageKey); } catch { /* storage unavailable */ } }
  };
  const listeners = new Set();

  async function api(path, { method = 'GET', body, signal, query } = {}) {
    const qs = query ? `?${new URLSearchParams(Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== 'all'))}` : '';
    let res;
    try {
      res = await fetch(`${base}/api${path}${qs}`, {
        method, signal,
        headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(store.get() ? { Authorization: `Bearer ${store.get()}` } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body)
      });
    } catch (e) {
      if (e.name === 'AbortError') throw e;
      throw new ApiError(0, 'Could not reach the server. Check your connection and try again.');
    }
    const data = res.status === 204 ? null : await res.json().catch(() => ({}));
    if (res.status === 401 && store.get()) { store.set(null); listeners.forEach((fn) => fn()); } // expired session
    if (!res.ok) throw new ApiError(res.status, data?.error || 'Something went wrong.', data?.details);
    return data;
  }
  api.token = { get: store.get, set: store.set };
  api.onSessionExpired = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
  return api;
}
