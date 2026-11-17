const { chromium } = require('playwright');
const base = 'http://localhost:4000/league';
(async () => {
  const browser = await chromium.launch();
  const mk = async () => { const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } }); await ctx.route(/^https?:\/\/(?!localhost)/, (r) => r.abort()); return ctx; };
  const problems = [];
  const watch = (page, tag) => { page.on('pageerror', (e) => problems.push(`${tag} PAGEERROR ${e.message}`)); page.on('console', (m) => { if (m.type() === 'error' && !/ERR_FAILED|Failed to load resource/.test(m.text())) problems.push(`${tag} CONSOLE ${m.text().slice(0, 160)}`); }); page.on('response', (r) => { if (r.url().includes('/api/') && r.status() >= 400 && r.status() !== 401) problems.push(`${tag} API ${r.status()} ${r.url().replace('http://localhost:4000', '')}`); }); };
  const visit = async (page, path) => { await page.goto(base + path); await page.waitForTimeout(450); await page.evaluate(() => document.querySelectorAll('.reveal').forEach((e) => e.classList.add('is-in'))); return page.evaluate(() => ({ h1: document.querySelector('h1')?.textContent?.slice(0, 44), len: document.body.innerText.length })); };
  const login = async (page, email, to) => { await page.goto(base + to); await page.fill('input[type=email]', email); await page.fill('input[type=password]', 'ChangeMe!123'); await page.click('button[type=submit]'); await page.waitForTimeout(700); };

  // ---- public
  const pub = await (await mk()).newPage(); watch(pub, 'pub');
  const ids = await pub.request.get('http://localhost:4000/api/league/bootstrap').then((r) => r.json());
  const fx = await pub.request.get('http://localhost:4000/api/league/fixtures?when=results').then((r) => r.json());
  const done = fx.find((f) => f.status === 'completed');
  for (const r of ['/', '/matches', '/matches?when=results&division=d-sen', `/matches/${done.id}`, `/matches/${done.id}?tab=lineups`, '/tables', '/tables?division=d-u17', '/stats', '/stats?tab=teams', '/teams', '/teams/t-cre-s', '/players', '/players?q=ade', '/players/p001', '/officials', '/officials/o01', '/news', '/news/n1', '/competition', '/contact', '/portal', '/admin', '/nope']) {
    const h = await visit(pub, r); console.log(r.padEnd(46), JSON.stringify(h));
  }
  const rows = await pub.evaluate(() => 0);
  await pub.goto(base + '/tables'); await pub.waitForSelector('.standings'); console.log('standings rows:', await pub.$$eval('.standings tbody tr', (r) => r.length), '| first:', (await pub.textContent('.standings tbody tr')).replace(/\s+/g, ' ').slice(0, 60));
  await pub.screenshot({ path: '/tmp/league-tables.png' });
  await visit(pub, '/'); await pub.screenshot({ path: '/tmp/league-home.png' });
  await visit(pub, `/matches/${done.id}`); await pub.screenshot({ path: '/tmp/league-match.png' });

  // ---- admin
  const ad = await (await mk()).newPage(); watch(ad, 'admin');
  await login(ad, 'admin@jfl.example', '/admin');
  console.log('\nadmin KPIs:', await ad.$$eval('.kpi', (k) => k.length));
  await ad.screenshot({ path: '/tmp/league-admin.png' });
  for (const s of ['fixtures', 'fixtures?tab=generate', 'fixtures?tab=drafts', 'results', 'officials', 'teams', 'teams?tab=teams', 'players', 'players?tab=transfers', 'discipline', 'content', 'content?tab=news', 'content?tab=documents', 'content?tab=sponsors', 'enquiries', 'settings', 'audit']) {
    const h = await visit(ad, '/admin/' + s); console.log(('admin/' + s).padEnd(30), JSON.stringify(h));
  }
  // approve a provisional result through the UI
  await visit(ad, '/admin/results'); const before = await ad.$$eval('tbody tr', (r) => r.length);
  const btn = ad.locator('button:has-text("Approve")').first();
  if (await btn.count()) { await btn.click(); await ad.waitForTimeout(900); const conf = ad.locator('dialog[open] button:has-text("Proceed anyway")'); if (await conf.count()) { await conf.click(); await ad.waitForTimeout(700); } console.log('approve toast:', await ad.locator('.toast').first().textContent().catch(() => 'none')); }
  // scheduling conflict via UI: edit a fixture onto a day the team already plays
  await visit(ad, '/admin/fixtures');
  await ad.locator('button:has-text("Add fixture")').click(); await ad.waitForSelector('dialog[open]');
  const opts = await ad.$$eval('#f-homeId option', (o) => o.map((x) => x.value).filter(Boolean));
  await ad.selectOption('#f-homeId', opts[0]); await ad.selectOption('#f-awayId', opts[0]); await ad.click('dialog[open] button:has-text("Save fixture")'); await ad.waitForTimeout(600);
  console.log('same-team error shown:', await ad.locator('dialog[open] .form-error, dialog[open] .field__error:not(:empty)').first().textContent().catch(() => 'none'));

  // ---- portals
  const tm = await (await mk()).newPage(); watch(tm, 'team');
  await login(tm, 'team@jfl.example', '/portal');
  console.log('\nteam portal h1:', await tm.textContent('h1'), '| sheet buttons:', await tm.locator('button:text-matches("(Submit|Update) team sheet")').count());
  await tm.locator('button:text-matches("(Submit|Update) team sheet")').first().click(); await tm.waitForSelector('dialog[open] table'); console.log('team-sheet rows:', await tm.$$eval('dialog[open] tbody tr', (r) => r.length));
  await tm.screenshot({ path: '/tmp/league-sheet.png' });
  await tm.click('dialog[open] button:has-text("Submit team sheet")'); await tm.waitForTimeout(600); console.log('empty sheet error:', (await tm.locator('dialog[open] .form-error').textContent()).slice(0, 80));
  const rf = await (await mk()).newPage(); watch(rf, 'ref');
  await login(rf, 'referee@jfl.example', '/portal'); console.log('referee appointments:', await rf.locator('.panel.panel__body').count());
  await visit(rf, '/portal?tab=reports'); console.log('report buttons:', await rf.locator('button:has-text("Submit report")').count());

  console.log('\nPROBLEMS:', problems.length ? '\n' + [...new Set(problems)].join('\n') : 'none');
  await browser.close();
})().catch((e) => { console.error('TEST CRASH', e.message.slice(0, 400)); process.exit(1); });
