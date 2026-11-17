import { useEffect, useState } from 'react';
import { Async, Icon, Link, Skeleton, fmt, toDate, useDocumentTitle, useQuery, useQueryParams, photoUrl } from '@jalingo/shared';
import { api } from '../api.js';
import { useClub } from '../data.jsx';
import { FORM_LETTER, Media, MatchRow, PlayerCard, SampleTag, SectionHead, StoryMeta, STATUS_LABEL, Arrow } from '../components/common.jsx';

function Countdown({ target }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t); }, []);
  const diff = Math.max(0, target - now);
  return <div className="countdown" aria-hidden="true">{[[Math.floor(diff / 864e5), 'Days'], [Math.floor(diff / 36e5) % 24, 'Hrs'], [Math.floor(diff / 6e4) % 60, 'Mins']].map(([v, l]) => <div key={l}><b>{String(v).padStart(2, '0')}</b><small>{l}</small></div>)}</div>;
}

export default function Home() {
  useDocumentTitle('Eland FC · Jalingo');
  const { club, photos } = useClub();
  const [, setQ] = useQueryParams();
  const matches = useQuery(api, '/club/matches');
  const news = useQuery(api, '/club/news');
  const players = useQuery(api, '/club/players', { squad: 'first' });
  const gallery = useQuery(api, '/club/gallery');
  const openMatch = (id) => setQ({ match: id }, { replace: false });

  const upcoming = (matches.data || []).filter((m) => m.status === 'upcoming');
  const results = (matches.data || []).filter((m) => m.status !== 'upcoming').reverse();
  const next = upcoming[0];
  const form = results.filter((m) => FORM_LETTER[m.status]).slice(0, 5);

  return (
    <>
      <div className="hero">
        <div className="hero__media media">
          <img alt="Floodlit football pitch at night" fetchPriority="high" src={photoUrl(photos, 'night', 1600)} srcSet={[900, 1600, 2200].map((w) => `${photoUrl(photos, 'night', w)} ${w}w`).join(', ')} sizes="100vw" onError={(e) => e.currentTarget.closest('.media')?.classList.add('img-failed')} />
          <span className="photo-credit">Illustrative photography</span>
        </div>
        <div className="wrap hero__content">
          <p className="eyebrow">Eland Football Club · Jalingo, Taraba State</p>
          <h1 className="view-heading" tabIndex={-1}>Jalingo football, taken seriously<span className="accent">.</span></h1>
          <p className="lede">A grassroots club with its own home online: fixtures, the squad, club news and a clear way in for players, supporters and partners.</p>
          <div className="btn-row"><Link className="btn btn--primary" to="/club">Explore the club <Arrow /></Link><Link className="btn btn--ghost" to="/matches">View fixtures</Link></div>
        </div>
        {next && (() => {
          const when = toDate(next.date, next.time), [a, b] = next.home ? [club.name, next.opponent] : [next.opponent, club.name];
          return (
            <div className="next-strip" aria-label="Next match"><div className="wrap">
              <div className="next-strip__label"><strong>Next match</strong><SampleTag>Sample fixture</SampleTag></div>
              <div><div className="next-strip__teams">{a}<span>v</span>{b}</div><div className="next-strip__when">{fmt.long.format(when)} · {next.time} · {next.competition}</div></div>
              <Countdown target={when.getTime()} />
              <Link className="btn btn--ghost" to="/matches">Match centre <Arrow /></Link>
            </div></div>
          );
        })()}
      </div>

      <section className="section on-light" aria-labelledby="mc-title"><div className="wrap">
        <SectionHead eyebrow="Match centre" title="Every fixture, in one place" id="mc-title"><Link className="text-link" to="/matches">Full match centre <Arrow /></Link></SectionHead>
        <Async query={matches} skeleton={<Skeleton lines={6} height={56} />}>{() => (
          <div className="mc-grid reveal">
            <div className="mc-col">
              <h3>Recent results <span className="form-guide" aria-label={`Recent form: ${form.map((m) => STATUS_LABEL[m.status]).join(', ')}`}>{form.map((m) => <span key={m.id} style={{ background: `var(--${m.status})` }} aria-hidden="true">{FORM_LETTER[m.status]}</span>)}</span></h3>
              <ul className="match-list">{results.slice(0, 4).map((m) => <MatchRow key={m.id} m={m} onOpen={openMatch} />)}</ul>
            </div>
            <div className="mc-col">
              <h3>Coming up <SampleTag>Sample data</SampleTag></h3>
              <ul className="match-list">{upcoming.slice(0, 3).map((m) => <MatchRow key={m.id} m={m} onOpen={openMatch} />)}</ul>
            </div>
          </div>
        )}</Async>
      </div></section>

      <section className="section" aria-labelledby="name-title"><div className="wrap statement">
        <Media photo="duel" w={900} alt="Two players competing for the ball" className="statement__media reveal" />
        <div className="reveal">
          <p className="eyebrow">The name</p><h2 id="name-title">Big, patient, and very hard to stop<span className="accent">.</span></h2>
          <p className="lede" style={{ marginTop: 24 }}>The eland is Africa’s largest antelope. That gives the club a ready-made identity: strength over show, endurance over flair, and a team that’s tough to get past.</p>
          <SampleTag>Proposed brand story · for the club to confirm</SampleTag>
        </div>
      </div></section>

      <section className="section on-paper" aria-labelledby="news-home-title"><div className="wrap">
        <SectionHead eyebrow="Club news" title="From the training ground" id="news-home-title"><Link className="text-link" to="/news">All stories <Arrow /></Link></SectionHead>
        <Async query={news} skeleton={<Skeleton lines={5} height={40} />}>{(items) => { const [lead, ...rest] = items; return lead && (
          <div className="editorial reveal">
            <Link to={`/news/${lead.id}`} className="story-feature"><Media photo={lead.photo} w={1400} alt={lead.title} /><div className="story-feature__body"><StoryMeta s={lead} /><h3>{lead.title}</h3><p className="muted">{lead.dek}</p></div></Link>
            <div className="story-stack">{rest.slice(0, 3).map((s) => <Link key={s.id} to={`/news/${s.id}`} className="story-row"><div><StoryMeta s={s} /><h3>{s.title}</h3></div><Media photo={s.photo} w={300} /></Link>)}</div>
          </div>); }}</Async>
      </div></section>

      <section className="section" aria-labelledby="squad-home-title"><div className="wrap">
        <SectionHead eyebrow="The squad" title="Names on the back of the shirt" id="squad-home-title" />
        <Async query={players} skeleton={<Skeleton lines={4} height={80} />}>{(list) => <div className="squad-track reveal" tabIndex={0} aria-label="Squad preview, scrollable">{list.slice(0, 10).map((p) => <PlayerCard key={p.id} p={p} onOpen={(id) => setQ({ player: id }, { replace: false })} />)}</div>}</Async>
        <div className="row" style={{ marginTop: 28, gap: '16px 32px' }}>
          <p className="muted" style={{ margin: 0, flex: '1 1 320px' }}>First-team profiles are placeholders until the club confirms its squad.</p>
          <Link to="/teams/squads" className="text-link">All squads <Arrow /></Link><Link to="/teams/staff" className="text-link">Technical &amp; medical team <Arrow /></Link><Link to="/teams/register" className="text-link">Player register <Arrow /></Link>
        </div>
      </div></section>

      <section className="join on-light" aria-labelledby="join-title">
        <Media photo="amateur" w={1200} alt="Amateur players contesting the ball" className="join__media" />
        <div className="join__body reveal"><p className="eyebrow">Play for Eland</p><h2 id="join-title">Think you can get in this team?</h2><p className="lede">Send a trial enquiry with your position and experience. The club decides how and when trials happen. This form simply makes it easy to ask.</p><div><Link className="btn btn--primary" to="/contact/trials">Send a trial enquiry <Arrow /></Link></div></div>
      </section>

      <section className="section on-ink-2" aria-labelledby="gallery-home-title"><div className="wrap">
        <SectionHead eyebrow="Matchday" title="Grass, dust and floodlights" id="gallery-home-title"><SampleTag>Illustrative photography, to be replaced with club images</SampleTag></SectionHead>
        <Async query={gallery} skeleton={<Skeleton lines={4} height={60} />}>{(items) => <div className="mosaic reveal">{items.map((g, i) => <button key={g.id} type="button" className="mosaic__item media" aria-label={`View photo: ${g.alt}`} onClick={() => setQ({ photo: i }, { replace: false })}><img src={photoUrl(photos, g.photo, 900)} alt="" loading="lazy" decoding="async" onError={(e) => e.currentTarget.closest('.media')?.classList.add('img-failed')} /></button>)}</div>}</Async>
      </div></section>

      <section className="section on-sand" aria-labelledby="partner-home-title"><div className="wrap">
        <div className="partner-band">
          <div className="reveal"><p className="eyebrow">Partnerships</p><h2 id="partner-home-title">Put your name behind Jalingo football.</h2></div>
          <div className="reveal"><p>Local businesses can back the club through matchday, kit, player and community partnerships, with visibility on the pitch and online.</p><Link className="btn btn--primary" to="/partners">See partnership options <Arrow /></Link></div>
        </div>
        <div className="grid grid--2" style={{ marginTop: 32 }}><div className="slot">Principal partner<br />· available ·</div><div className="slot">Kit partner<br />· available ·</div></div>
      </div></section>
    </>
  );
}
