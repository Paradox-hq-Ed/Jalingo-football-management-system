const { chromium } = require('playwright');
const base = 'http://localhost:4000';
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
  const page = await ctx.newPage();
  const problems = [];
  page.on('pageerror', (e) => problems.push('PAGEERROR ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/ERR_FAILED|Failed to load resource: net::/.test(m.text())) problems.push('CONSOLE ' + m.text().slice(0, 200)); });
  page.on('response', (r) => { if (r.url().includes('/api/') && r.status() >= 400 && r.status() !== 401) problems.push(`API ${r.status()} ${r.url().replace(base, '')}`); });
  const routes = ['/', '/club', '/teams/squads', '/teams/squads/u19', '/teams/squads/first?view=contracts', '/teams/staff', '/teams/register', '/matches', '/matches/results', '/news', '/news/n1', '/partners', '/contact/trials', '/admin', '/nope',
    '/?player=p01', '/?player=p01&tab=contract', '/?person=m-owner', '/?match=m01', '/?photo=2'];
  for (const r of routes) {
    await page.goto(base + r); await page.waitForTimeout(500);
    await page.evaluate(() => document.querySelectorAll('.reveal').forEach((e) => e.classList.add('is-in')));
    const h = await page.evaluate(() => ({ h1: document.querySelector('h1, dialog[open] h2')?.textContent?.slice(0, 50), len: document.body.innerText.length, dlg: !!document.querySelector('dialog[open]') }));
    console.log(r.padEnd(38), JSON.stringify(h));
  }
  console.log('\nPROBLEMS:', problems.length ? '\n' + [...new Set(problems)].join('\n') : 'none');
  await browser.close();
})();
