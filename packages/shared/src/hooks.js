import { useCallback, useEffect, useRef, useState } from 'react';

/** GET with loading / error / reload, aborting stale requests. `path` null = skip. */
export function useQuery(api, path, query) {
  const key = path ? path + JSON.stringify(query || {}) : null;
  const [state, setState] = useState({ data: null, error: null, loading: !!path });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!path) { setState({ data: null, error: null, loading: false }); return; }
    const ctl = new AbortController();
    setState((s) => ({ data: s.data, error: null, loading: true }));
    api(path, { signal: ctl.signal, query })
      .then((data) => setState({ data, error: null, loading: false }))
      .catch((error) => { if (error.name !== 'AbortError') setState({ data: null, error, loading: false }); });
    return () => ctl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, tick]);
  return { ...state, reload: useCallback(() => setTick((t) => t + 1), []) };
}

/** Wrap a write: { run, pending, error }. run() rethrows so callers can react. */
export function useMutation(fn) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const run = useCallback(async (...args) => {
    setPending(true); setError(null);
    try { return await fn(...args); } catch (e) { setError(e); throw e; } finally { setPending(false); }
  }, [fn]);
  return { run, pending, error };
}

export function useDocumentTitle(title) {
  useEffect(() => { if (title) document.title = title; }, [title]);
}

export function useDebounced(value, ms = 250) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

/** Adds .is-in to .reveal elements as they scroll into view (immediately with reduced motion). */
export function useReveals(dep) {
  useEffect(() => {
    const items = [...document.querySelectorAll('.reveal:not(.is-in)')];
    if (!items.length) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) { items.forEach((el) => el.classList.add('is-in')); return; }
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -6% 0px', threshold: 0.04 });
    items.forEach((el) => io.observe(el));
    return () => io.disconnect();
  });
  useEffect(() => { const t = setTimeout(() => document.querySelectorAll('.reveal').forEach((e) => e.classList.add('is-in')), 1800); return () => clearTimeout(t); }, [dep]); // never leave content hidden
}

/** Form state with server-side validation errors mapped onto fields. */
export function useForm(initial, onSubmit) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const live = useRef(onSubmit); live.current = onSubmit;
  const set = useCallback((name, value) => { setValues((v) => ({ ...v, [name]: value })); setErrors((e) => (e[name] ? { ...e, [name]: undefined } : e)); }, []);
  const bind = (name) => ({ name, id: `f-${name}`, value: values[name] ?? '', onChange: (e) => set(name, e.target.type === 'checkbox' ? e.target.checked : e.target.value) });
  const bindCheck = (name) => ({ name, id: `f-${name}`, checked: !!values[name], onChange: (e) => set(name, e.target.checked) });
  const submit = async (e) => {
    e?.preventDefault();
    setSubmitting(true); setFormError(null); setErrors({});
    try { await live.current(values); }
    catch (err) {
      if (err?.details && typeof err.details === 'object' && !Array.isArray(err.details) && !err.details.conflicts) setErrors(err.details);
      setFormError(err?.message || 'Something went wrong.');
      requestAnimationFrame(() => document.querySelector('[aria-invalid="true"]')?.focus());
    } finally { setSubmitting(false); }
  };
  const reset = (next = initial) => { setValues(next); setErrors({}); setFormError(null); };
  return { values, set, bind, bindCheck, errors, setErrors, formError, setFormError, submit, submitting, reset };
}
