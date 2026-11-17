import { Icon, Link, fmt, toDate, photoUrl } from '@jalingo/shared';
import { DEMO } from '../api.js';
import { useClub } from '../data.jsx';

export const STATUS_LABEL = { win: 'Won', loss: 'Lost', draw: 'Drawn', upcoming: 'Upcoming', postponed: 'Postponed' };
export const FORM_LETTER = { win: 'W', loss: 'L', draw: 'D' };
export const monogram = (role) => role.split(/[\s&-]+/).filter((w) => /^[A-Z]/.test(w)).slice(0, 2).map((w) => w[0]).join('');
export const SampleTag = ({ children = 'Sample' }) => (DEMO ? <span className="tag-demo">{children}</span> : null);

export function Media({ photo, alt = '', w = 900, lazy = true, className = '', eager }) {
  const { photos } = useClub();
  return (
    <div className={`media ${className}`}>
      <img src={photoUrl(photos, photo, w)} alt={alt} loading={eager ? undefined : lazy ? 'lazy' : undefined} decoding="async"
        onError={(e) => e.currentTarget.closest('.media')?.classList.add('img-failed')} />
    </div>
  );
}

export function MatchRow({ m, onOpen }) {
  const { club } = useClub();
  const date = toDate(m.date, m.time);
  const eland = <span className="is-eland">{club.name}</span>, opp = <span>{m.opponent}</span>;
  const [left, right] = m.home ? [eland, opp] : [opp, eland];
  const [h, a] = m.score ? (m.home ? m.score : [m.score[1], m.score[0]]) : [];
  const mid = m.score ? <span className="match__mid" aria-label={`Score ${h} ${a}`}>{h}–{a}</span>
    : m.status === 'postponed' ? <span className="match__mid is-ko">P–P</span>
    : <span className="match__mid is-ko"><span className="sr-only">Kick-off </span>{m.time}</span>;
  return (
    <li>
      <button type="button" className="match" onClick={() => onOpen(m.id)}
        aria-label={`Match details: ${m.home ? `${club.name} v ${m.opponent}` : `${m.opponent} v ${club.name}`}, ${fmt.long.format(date)}, ${STATUS_LABEL[m.status]}`}>
        <span className="match__date"><span className="d">{fmt.day.format(date)}</span><span className="n">{fmt.num.format(date)}</span><span className="m">{fmt.mon.format(date)}</span></span>
        <span className="match__teams"><span className="t1">{left}</span>{mid}<span className="t2">{right}</span></span>
        <span className="match__meta"><span>{m.competition}</span><span>{m.home ? 'Home' : 'Away'}</span><span>{m.venue}</span><span className={`status status--${m.status}`}>{STATUS_LABEL[m.status]}</span></span>
      </button>
    </li>
  );
}

export function PlayerCard({ p, onOpen }) {
  const { positions, availability, squadById } = useClub();
  return (
    <button type="button" className="player-card" onClick={() => onOpen(p.id)}
      aria-label={`Open profile: ${squadById(p.squad).name} number ${p.num}, ${positions[p.pos]}, ${availability[p.availability]}`}>
      <span className="player-card__num" aria-hidden="true">{p.num}</span>
      <span className="player-card__silhouette" aria-hidden="true"><svg><use href="#i-silhouette" /></svg></span>
      <span className="player-card__top"><span className="player-card__pos">{p.pos}</span><SampleTag>Demo</SampleTag></span>
      <span className="player-card__bottom">
        <span className="player-card__name">{p.name || `No. ${p.num} · ${positions[p.pos]}`}</span>
        <span className="player-card__sub">{p.name ? positions[p.pos] : 'Name to be confirmed'}{p.availability !== 'available' ? ` · ${availability[p.availability]}` : ''}</span>
      </span>
    </button>
  );
}

export function StoryMeta({ s }) {
  return <div className="story-meta"><span className="cat">{s.cat}</span><time dateTime={s.date}>{fmt.medium.format(toDate(s.date))}</time></div>;
}
export function StoryCard({ s }) {
  return (
    <Link to={`/news/${s.id}`} className="story-card">
      <Media photo={s.photo} w={700} />
      <div className="story-card__body"><StoryMeta s={s} /><h3>{s.title}</h3><p className="muted" style={{ margin: 0 }}>{s.dek}</p></div>
    </Link>
  );
}

export const Arrow = () => <Icon id="i-arrow" />;
export function SectionHead({ eyebrow, title, id, children }) {
  return <div className="section-head reveal"><div><p className="eyebrow">{eyebrow}</p><h2 id={id}>{title}</h2></div>{children}</div>;
}
export function PageHero({ title, lede, photo, eyebrow }) {
  const { photos } = useClub();
  return (
    <div className={`page-hero${photo ? ' has-image' : ''}`}>
      {photo && <div className="page-hero__media media"><img src={photoUrl(photos, photo, 1600)} alt="" onError={(e) => e.currentTarget.closest('.media')?.classList.add('img-failed')} /></div>}
      <div className="wrap">{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1 className="view-heading" tabIndex={-1}>{title}</h1>{lede && <p className="lede">{lede}</p>}</div>
    </div>
  );
}
