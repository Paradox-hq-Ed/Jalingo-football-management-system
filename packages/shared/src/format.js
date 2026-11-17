// Dates come from the API as YYYY-MM-DD (+ HH:MM); build local Dates without timezone drift.
export const toDate = (iso, time = '00:00') => { const [y, m, d] = iso.split('-').map(Number); const [h, mi] = time.split(':').map(Number); return new Date(y, m - 1, d, h, mi); };
const f = (o) => new Intl.DateTimeFormat('en-GB', o);
export const fmt = {
  day: f({ weekday: 'short' }), num: f({ day: 'numeric' }), mon: f({ month: 'short' }), monthYear: f({ month: 'short', year: 'numeric' }),
  long: f({ weekday: 'long', day: 'numeric', month: 'long' }), medium: f({ day: 'numeric', month: 'long', year: 'numeric' }),
  short: f({ weekday: 'short', day: 'numeric', month: 'short' }), dateTime: f({ day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
};
export const fmtDate = (iso, style = 'short') => (iso ? fmt[style].format(toDate(iso.slice(0, 10))) : '—');
export const fmtDateTime = (iso) => (iso ? fmt.dateTime.format(new Date(iso)) : '—');
export const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export const photoUrl = (photos, key, w = 1200) => (photos?.[key] ? `https://images.unsplash.com/photo-${photos[key]}?auto=format&fit=crop&w=${w}&q=70` : '');
export const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
export const cx = (...a) => a.filter(Boolean).join(' ');
