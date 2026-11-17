import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const RouterContext = createContext(null);
export const useRouter = () => useContext(RouterContext);

/** Clean-URL router on the History API. `basename` lets the league app live under /league. */
export function Router({ basename = '', children }) {
  const read = useCallback(() => {
    let p = location.pathname;
    if (basename && p.startsWith(basename)) p = p.slice(basename.length);
    return { path: p.replace(/\/+$/, '') || '/', search: location.search };
  }, [basename]);
  const [loc, setLoc] = useState(read);
  useEffect(() => {
    const on = () => setLoc(read());
    addEventListener('popstate', on);
    return () => removeEventListener('popstate', on);
  }, [read]);

  const navigate = useCallback((to, { replace = false, scroll = true } = {}) => {
    const url = /^https?:/.test(to) ? to : basename + to;
    history[replace ? 'replaceState' : 'pushState'](null, '', url);
    setLoc(read());
    if (scroll) window.scrollTo({ top: 0, behavior: 'instant' });
  }, [basename, read]);

  const value = useMemo(() => ({ path: loc.path, query: new URLSearchParams(loc.search), navigate, basename }), [loc, navigate, basename]);
  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function Link({ to, replace, scroll, onClick, children, ...rest }) {
  const { navigate, basename } = useRouter();
  const external = /^(https?:|mailto:|tel:)/.test(to);
  return (
    <a href={external ? to : basename + to} {...rest} onClick={(e) => {
      onClick?.(e);
      if (e.defaultPrevented || external || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || rest.target === '_blank') return;
      e.preventDefault();
      navigate(to, { replace, scroll });
    }}>{children}</a>
  );
}

/** Link that sets aria-current when the URL matches (`end` = exact match only). */
export function NavLink({ to, end = false, ...rest }) {
  const { path } = useRouter();
  const on = end ? path === to : path === to || path.startsWith(`${to}/`);
  return <Link to={to} aria-current={on ? 'page' : undefined} {...rest} />;
}

export function matchPath(pattern, path) {
  const a = pattern.split('/').filter(Boolean), b = path.split('/').filter(Boolean), params = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '*') { params['*'] = b.slice(i).join('/'); return params; }
    if (b[i] === undefined) return null;
    if (a[i].startsWith(':')) params[a[i].slice(1)] = decodeURIComponent(b[i]);
    else if (a[i] !== b[i]) return null;
  }
  return a.length === b.length ? params : null;
}

/** routes: [{ path: '/matches/:id', render: (params) => <Page/> }] ; first match wins. */
export function Routes({ routes, fallback = null }) {
  const { path } = useRouter();
  for (const r of routes) {
    const params = matchPath(r.path, path);
    if (params) return r.render(params);
  }
  return fallback;
}

export const Redirect = ({ to }) => { const { navigate } = useRouter(); useEffect(() => navigate(to, { replace: true }), [to, navigate]); return null; };

/** Read and update ?query params without adding history entries for every keystroke. */
export function useQueryParams() {
  const { path, query, navigate } = useRouter();
  const set = useCallback((updates, { replace = true } = {}) => {
    const q = new URLSearchParams(window.location.search);
    Object.entries(updates).forEach(([k, v]) => (v === null || v === undefined || v === '' ? q.delete(k) : q.set(k, v)));
    const s = q.toString();
    navigate(`${path}${s ? `?${s}` : ''}`, { replace, scroll: false });
  }, [path, navigate]);
  return [query, set];
}
