const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 800 } }); await ctx.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
  const p = await ctx.newPage(); const bad = [];
  const club = ['/', '/club', '/teams/squads', '/teams/squads/first?view=contracts', '/teams/staff', '/teams/register', '/matches', '/news', '/news/n1', '/partners', '/contact/trials', '/admin'];
  const league = ['/', '/matches', '/matches/f044', '/tables', '/stats', '/teams', '/teams/t-cre-s', '/players', '/players/p001', '/officials', '/news', '/competition', '/contact', '/portal'];
  for (const [base, routes] of [['http://localhost:4000', club], ['http://localhost:4000/league', league]]) for (const r of routes) {
    await p.goto(base + r); await p.waitForTimeout(500);
    const m = await p.evaluate(() => { const o = document.documentElement.scrollWidth - innerWidth; let culprit = null; if (o > 0) { for (const e of document.querySelectorAll('body *')) { const r = e.getBoundingClientRect(); if (r.right > innerWidth + 1 && r.width > 0 && !e.closest('.table-wrap, .tabs, .squad-track, .subnav, dialog')) { culprit = e.tagName + '.' + (e.className?.baseVal ?? e.className); break; } } } return { o, culprit }; });
    if (m.o > 0) bad.push(`${base.endsWith('league') ? 'league' : 'club'}${r}  +${m.o}px  ${m.culprit}`);
  }
  console.log(bad.length ? bad.join('\n') : 'no horizontal overflow on any route at 390px');
  await b.close();
})();
