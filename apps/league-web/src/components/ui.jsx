import { Link, Pill, fmt, toDate, cx } from '@jalingo/shared';
import { useLeague } from '../data.jsx';

export function Crest({ club, size = 32 }) {
  const c = club || { c1: '#586179', c2: '#fff', short: '?', shape: 'shield' };
  const path = c.shape === 'round' ? 'M20 2a18 18 0 1 0 0 36 18 18 0 0 0 0-36Z' : c.shape === 'diamond' ? 'M20 1 38 20 20 39 2 20Z' : 'M20 2 36 7v13c0 9-6 15-16 18C10 35 4 29 4 20V7Z';
  return (
    <span className="crest" style={{ '--s': `${size}px` }} aria-hidden="true">
      <svg viewBox="0 0 40 40"><path d={path} fill={c.c1} stroke={c.c2} strokeWidth="2" /><path d="M8 24h24v5H8z" fill={c.c2} opacity=".9" clipPath="inset(0)" /><text x="20" y="21" textAnchor="middle" fontSize="11" fontWeight="800" fill={c.c2} fontFamily="Saira Condensed, sans-serif">{c.short}</text></svg>
    </span>
  );
}

export function TeamName({ id, link = true, size = 28, side, slot, plain }) {
  const { team, club } = useLeague();
  const t = team(id);
  if (!t) return <span className={cx('team', side === 'away' && 'team--away')}><Crest size={size} /><span className="n slotname">{slot || 'To be decided'}</span></span>;
  const inner = <><Crest club={club(id)} size={size} /><span className="n">{t.name}</span></>;
  return link && !plain ? <Link to={`/teams/${t.id}`} className={cx('team', side === 'away' && 'team--away')}>{inner}</Link> : <span className={cx('team', side === 'away' && 'team--away')}>{inner}</span>;
}

export const STATUS = { scheduled: ['Scheduled', 'info'], awaiting: ['Awaiting confirmation', 'warn'], live: ['In progress', 'ok'], completed: ['Full time', 'ok'], postponed: ['Postponed', 'warn'], cancelled: ['Cancelled', 'neutral'], abandoned: ['Abandoned', 'bad'], review: ['Under review', 'warn'] };
export const StatusPill = ({ status }) => <Pill tone={STATUS[status][1]}>{STATUS[status][0]}</Pill>;

export function slotText(slot) {
  if (!slot) return 'To be decided';
  if (slot.startsWith('W:')) return 'Winner of earlier tie';
  return slot[1] === '1' ? `Winner Group ${slot[0]}` : `Runner-up Group ${slot[0]}`;
}

export function Score({ f }) {
  if (f.result && ['completed', 'awaiting', 'review', 'abandoned'].includes(f.status)) {
    const pen = f.result.pens ? ` (${f.result.pens[0]}–${f.result.pens[1]} pens)` : '';
    return <span className={cx('score', f.status !== 'completed' && 'score--prov')} aria-label={`Score ${f.result.h} ${f.result.a}${pen}${f.status !== 'completed' ? ', provisional' : ''}`}>{f.result.h}<span aria-hidden="true">–</span>{f.result.a}</span>;
  }
  return <span className="score score--ko">{f.status === 'postponed' ? 'P–P' : f.time}</span>;
}

export function FixtureRow({ f, showDivision = true }) {
  const { division, venue } = useLeague();
  const d = toDate(f.date, f.time);
  const { homeId, awayId } = f.resolved;
  return (
    <li>
      <Link to={`/matches/${f.id}`} className="fixture">
        <span className="fixture__time">{fmt.short.format(d).split(' ').slice(0, 2).join(' ')}<small>{f.time}</small></span>
        <TeamName id={homeId} slot={slotText(f.slotH)} link={false} />
        <Score f={f} />
        <TeamName id={awayId} slot={slotText(f.slotA)} side="away" link={false} />
        <span />
        <span className="fixture__meta">
          {showDivision && <span>{division(f.divisionId)?.short}</span>}{f.label && <span>{f.label.split('·')[0].trim()}</span>}
          <span>{venue(f.venueId)?.name}</span><StatusPill status={f.status} />
        </span>
      </Link>
    </li>
  );
}

export function FixtureList({ fixtures, grouped = true, showDivision }) {
  if (!grouped) return <ul className="fixture-list">{fixtures.map((f) => <FixtureRow key={f.id} f={f} showDivision={showDivision} />)}</ul>;
  const days = [];
  fixtures.forEach((f) => { const last = days[days.length - 1]; if (last?.date === f.date) last.items.push(f); else days.push({ date: f.date, items: [f] }); });
  return days.map((d) => <section key={d.date}><h3 className="day-head">{fmt.long.format(toDate(d.date))}</h3><ul className="fixture-list">{d.items.map((f) => <FixtureRow key={f.id} f={f} showDivision={showDivision} />)}</ul></section>);
}

export function FormGuide({ form }) { return <span className="form" aria-label={`Form: ${form.join(', ')}`}>{form.map((r, i) => <i key={i} className={r} aria-hidden="true">{r}</i>)}</span>; }

export function StandingsTable({ rows, highlight, compact }) {
  const { team, club } = useLeague();
  return (
    <div className="table-wrap"><table className="table standings">
      <caption className="sr-only">League table</caption>
      <thead><tr><th>#</th><th>Team</th>{['P', 'W', 'D', 'L', ...(compact ? [] : ['GF', 'GA']), 'GD', 'Pts'].map((h) => <th key={h} className="num">{h}</th>)}{!compact && <th>Form</th>}</tr></thead>
      <tbody>{rows.map((r) => (
        <tr key={r.id} className={cx(r.pos === 1 && 'is-lead', highlight === r.id && 'is-mine')}>
          <td className="pos">{r.pos}</td><td><Link to={`/teams/${r.id}`} className="team"><Crest club={club(r.id)} size={26} /><span className="n">{team(r.id)?.name}</span></Link></td>
          {[r.p, r.w, r.d, r.l, ...(compact ? [] : [r.gf, r.ga]), r.gd > 0 ? `+${r.gd}` : r.gd].map((v, i) => <td key={i} className="num">{v}</td>)}<td className="num pts">{r.pts}</td>{!compact && <td><FormGuide form={r.form} /></td>}
        </tr>))}</tbody>
    </table></div>
  );
}

export function PageHead({ title, lede, crumbs, children }) {
  return (
    <div className="page-head stripes"><div className="wrap">
      {crumbs && <nav className="crumbs" aria-label="Breadcrumb">{crumbs.map(([to, l], i) => <span key={l}>{i > 0 && ' / '}{to ? <Link to={to}>{l}</Link> : l}</span>)}</nav>}
      <div className="row row--between"><div><h1 className="view-heading" tabIndex={-1}>{title}</h1>{lede && <p className="lede">{lede}</p>}</div>{children}</div>
    </div></div>
  );
}
export const initials = (first, last) => `${first[0]}${last[0]}`;
