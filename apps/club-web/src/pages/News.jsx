import { Async, EmptyState, Link, Skeleton, fmt, toDate, useDocumentTitle, useQuery, useQueryParams } from '@jalingo/shared';
import { api } from '../api.js';
import { useClub } from '../data.jsx';
import { Media, PageHero, SectionHead, StoryCard, StoryMeta, Arrow } from '../components/common.jsx';

export default function News() {
  useDocumentTitle('News · Eland FC');
  const { newsCategories } = useClub();
  const [q, setQ] = useQueryParams();
  const cat = q.get('cat') || 'All';
  const news = useQuery(api, '/club/news');
  return (
    <>
      <PageHero eyebrow="News" title="The club, told properly." lede="Match reports, previews, community work and squad updates." />
      <section className="section on-paper" aria-label="Stories"><div className="wrap">
        <div className="chips" role="group" aria-label="Filter by category">{newsCategories.map((c) => <button key={c} type="button" className="chip" aria-pressed={cat === c} onClick={() => setQ({ cat: c === 'All' ? null : c })}>{c}</button>)}</div>
        <Async query={news} skeleton={<Skeleton lines={6} height={60} />}>{(items) => {
          const list = items.filter((s) => cat === 'All' || s.cat === cat);
          return list.length ? <div className="grid grid--3">{list.map((s) => <StoryCard key={s.id} s={s} />)}</div> : <EmptyState title="No stories in this category yet" />;
        }}</Async>
      </div></section>
    </>
  );
}

export function Story({ id }) {
  const query = useQuery(api, `/club/news/${id}`);
  const more = useQuery(api, '/club/news');
  useDocumentTitle(query.data ? `${query.data.title} · Eland FC` : 'News · Eland FC');
  return (
    <section className="section on-paper" style={{ paddingTop: 'calc(var(--header-h) + 56px)' }}><div className="wrap">
      <Link to="/news" className="text-link" style={{ marginBottom: 24 }}>← All stories</Link>
      <Async query={query}>{(s) => (
        <article className="article">
          <StoryMeta s={s} /><h1 className="view-heading" tabIndex={-1} style={{ fontSize: 'clamp(2.2rem, 5vw, 3.8rem)', margin: '12px 0 16px' }}>{s.title}</h1>
          <p className="lede">{s.dek}</p><Media photo={s.photo} w={1400} alt="" className="reveal" />
          <div style={{ marginTop: 32 }}>{s.body.map((p, i) => <p key={i}>{p}</p>)}</div>
        </article>)}</Async>
      {more.data && <div style={{ marginTop: 72 }}><SectionHead eyebrow="Keep reading" title="More stories" /><div className="grid grid--3">{more.data.filter((s) => s.id !== id).slice(0, 3).map((s) => <StoryCard key={s.id} s={s} />)}</div></div>}
    </div></section>
  );
}
