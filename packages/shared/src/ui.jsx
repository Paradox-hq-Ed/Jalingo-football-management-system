import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from 'react';

/* ---------- form fields: label, hint and error are wired up for assistive tech ---------- */
function FieldShell({ label, hint, error, optional, full, children, id }) {
  return (
    <div className={`field${full ? ' field--full' : ''}${error ? ' has-error' : ''}`}>
      {label && <label className="field__label" htmlFor={id}>{label}{optional && <span className="field__opt"> (optional)</span>}</label>}
      {children}
      {hint && !error && <p className="field__hint" id={`${id}-hint`}>{hint}</p>}
      <p className="field__error" id={`${id}-err`} role={error ? 'alert' : undefined}>{error || ''}</p>
    </div>
  );
}
const aria = (id, error, hint) => ({ 'aria-invalid': error ? 'true' : undefined, 'aria-describedby': [error && `${id}-err`, hint && !error && `${id}-hint`].filter(Boolean).join(' ') || undefined });

export function Input({ label, hint, error, optional, full, id: idProp, ...rest }) {
  const auto = useId(), id = idProp || auto;
  return <FieldShell {...{ label, hint, error, optional, full, id }}><input className="input" id={id} {...aria(id, error, hint)} {...rest} /></FieldShell>;
}
export function Textarea({ label, hint, error, optional, full = true, id: idProp, ...rest }) {
  const auto = useId(), id = idProp || auto;
  return <FieldShell {...{ label, hint, error, optional, full, id }}><textarea className="input" rows={4} id={id} {...aria(id, error, hint)} {...rest} /></FieldShell>;
}
export function Select({ label, hint, error, optional, full, id: idProp, options, placeholder, children, ...rest }) {
  const auto = useId(), id = idProp || auto;
  return (
    <FieldShell {...{ label, hint, error, optional, full, id }}>
      <select className="input" id={id} {...aria(id, error, hint)} {...rest}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options?.map((o) => (typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>))}
        {children}
      </select>
    </FieldShell>
  );
}
export function Checkbox({ label, error, full = true, id: idProp, ...rest }) {
  const auto = useId(), id = idProp || auto;
  return (
    <div className={`field${full ? ' field--full' : ''}${error ? ' has-error' : ''}`}>
      <label className="check" htmlFor={id}><input type="checkbox" id={id} {...aria(id, error)} {...rest} /> <span>{label}</span></label>
      <p className="field__error" id={`${id}-err`} role={error ? 'alert' : undefined}>{error || ''}</p>
    </div>
  );
}
export const FormGrid = ({ children }) => <div className="form-grid">{children}</div>;
export const FormError = ({ error }) => (error ? <p className="form-error" role="alert">{error}</p> : null);

export function Button({ variant = 'primary', size, loading, children, className = '', ...rest }) {
  return (
    <button type="button" className={`btn btn--${variant}${size ? ` btn--${size}` : ''} ${className}`} disabled={loading || rest.disabled} aria-busy={loading || undefined} {...rest}>
      {loading && <span className="spinner" aria-hidden="true" />}{children}
    </button>
  );
}

/* ---------- status pills ---------- */
export const Pill = ({ tone = 'neutral', children }) => <span className={`pill pill--${tone}`}>{children}</span>;

/* ---------- loading, empty, error ---------- */
export const Skeleton = ({ lines = 3, height = 16 }) => (
  <div className="skeleton" aria-hidden="true">{Array.from({ length: lines }, (_, i) => <span key={i} style={{ height, width: `${100 - (i % 3) * 12}%` }} />)}</div>
);
export const EmptyState = ({ title, children, action }) => (
  <div className="empty"><h3>{title}</h3>{children && <p className="muted">{children}</p>}{action}</div>
);
export const ErrorState = ({ error, onRetry }) => (
  <div className="empty empty--error" role="alert"><h3>{error?.status === 404 ? 'We couldn’t find that' : 'We couldn’t load this'}</h3><p className="muted">{error?.message}</p>{onRetry && error?.status !== 404 && <Button variant="ghost" onClick={onRetry}>Try again</Button>}</div>
);

/** Renders loading skeleton / error / data from a useQuery result. */
export function Async({ query, children, skeleton, empty }) {
  if (query.error) return <ErrorState error={query.error} onRetry={query.reload} />;
  if (!query.data) return skeleton ?? <div className="wrap"><Skeleton lines={5} height={20} /></div>;
  if (empty && Array.isArray(query.data) && !query.data.length) return empty;
  return children(query.data);
}

/* ---------- modal / side sheet on the native <dialog> (focus trap + Esc for free) ---------- */
export function Modal({ open, onClose, title, eyebrow, footer, size = 'md', variant = 'center', children }) {
  const ref = useRef(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current; if (!d) return;
    if (open && !d.open) { d.showModal(); document.documentElement.classList.add('is-locked'); }
    if (!open && d.open) d.close();
    return () => document.documentElement.classList.remove('is-locked');
  }, [open]);
  if (!open) return null;
  return (
    <dialog ref={ref} className={`modal modal--${variant} modal--${size}`} aria-labelledby={titleId}
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}>
      <div className="modal__panel">
        <header className="modal__head">
          <div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h2 id={titleId}>{title}</h2></div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">×</button>
        </header>
        <div className="modal__body">{children}</div>
        {footer && <footer className="modal__foot">{footer}</footer>}
      </div>
    </dialog>
  );
}

/* ---------- toasts + confirm ---------- */
const FeedbackContext = createContext(null);
export const useToast = () => useContext(FeedbackContext).toast;
export const useConfirm = () => useContext(FeedbackContext).confirm;

export function FeedbackProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [ask, setAsk] = useState(null);
  const toast = useCallback((message, tone = 'ok') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === 'bad' ? 7000 : 4500);
  }, []);
  const confirm = useCallback((opts) => new Promise((resolve) => setAsk({ ...opts, resolve })), []);
  const done = (v) => { ask.resolve(v); setAsk(null); };
  const value = useMemo(() => ({ toast, confirm }), [toast, confirm]);
  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <div className="toasts" role="status" aria-live="polite">{toasts.map((t) => <div key={t.id} className={`toast toast--${t.tone}`}>{t.message}</div>)}</div>
      <Modal open={!!ask} onClose={() => done(false)} title={ask?.title || 'Are you sure?'} size="sm"
        footer={<><Button variant="ghost" onClick={() => done(false)}>Cancel</Button><Button variant={ask?.danger ? 'danger' : 'primary'} onClick={() => done(true)}>{ask?.confirmLabel || 'Confirm'}</Button></>}>
        <p>{ask?.message}</p>
      </Modal>
    </FeedbackContext.Provider>
  );
}

/* ---------- tabs (roving focus with arrow keys) ---------- */
export function Tabs({ tabs, value, onChange, label = 'Sections' }) {
  const onKey = (e) => {
    const i = tabs.findIndex((t) => t.key === value);
    const next = e.key === 'ArrowRight' ? (i + 1) % tabs.length : e.key === 'ArrowLeft' ? (i - 1 + tabs.length) % tabs.length : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : -1;
    if (next < 0) return;
    e.preventDefault(); onChange(tabs[next].key);
    requestAnimationFrame(() => document.getElementById(`tab-${tabs[next].key}`)?.focus());
  };
  return (
    <div className="tabs" role="tablist" aria-label={label} onKeyDown={onKey}>
      {tabs.map((t) => (
        <button key={t.key} id={`tab-${t.key}`} role="tab" type="button" aria-selected={value === t.key} tabIndex={value === t.key ? 0 : -1} onClick={() => onChange(t.key)}>
          {t.label}{t.badge ? <span className="tabs__badge">{t.badge}</span> : null}
        </button>
      ))}
    </div>
  );
}
export const TabPanel = ({ id, active, children }) => (active ? <div role="tabpanel" aria-labelledby={`tab-${id}`} tabIndex={0}>{children}</div> : null);

/* ---------- sortable table ---------- */
export function DataTable({ columns, rows, rowKey = 'id', onRowClick, caption, empty = 'Nothing to show.', initialSort }) {
  const [sort, setSort] = useState(initialSort || null);
  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key); if (!col) return rows;
    const val = col.sortValue || ((r) => r[col.key]);
    return [...rows].sort((a, b) => { const x = val(a), y = val(b); return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x ?? '').localeCompare(String(y ?? ''))) * (sort.dir === 'asc' ? 1 : -1); });
  }, [rows, sort, columns]);
  if (!rows.length) return <EmptyState title={empty} />;
  const toggle = (c) => setSort((s) => (s?.key === c.key ? { key: c.key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key: c.key, dir: c.numeric ? 'desc' : 'asc' }));
  return (
    <div className="table-wrap">
      <table className="table">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead><tr>{columns.map((c) => (
          <th key={c.key} scope="col" className={c.numeric ? 'num' : c.className} aria-sort={sort?.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
            {c.sortable === false ? c.header : <button type="button" className="sort-btn" onClick={() => toggle(c)}>{c.header}<span aria-hidden="true">{sort?.key === c.key ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ' ↕'}</span></button>}
          </th>))}</tr></thead>
        <tbody>{sorted.map((r) => (
          <tr key={typeof rowKey === 'function' ? rowKey(r) : r[rowKey]} className={onRowClick ? 'is-click' : undefined}>
            {columns.map((c, i) => <td key={c.key} data-label={typeof c.header === 'string' ? c.header : undefined} className={c.numeric ? 'num' : c.className}>
              {i === 0 && onRowClick ? <button type="button" className="row-link" onClick={() => onRowClick(r)}>{c.render ? c.render(r) : r[c.key]}</button> : c.render ? c.render(r) : r[c.key]}
            </td>)}
          </tr>))}</tbody>
      </table>
    </div>
  );
}

export const Icon = ({ id, className }) => <svg aria-hidden="true" className={className}><use href={`#${id}`} /></svg>;
