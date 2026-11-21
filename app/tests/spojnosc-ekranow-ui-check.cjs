// Spójność całej apki (Grzegorz 19/11/2026: „to jest naruszanie spójności całego programu”): przejście po wszystkich ekranach.
// Po wyjściu z ekranu nic po nim nie zostaje: <body> nie dostaje nowych elementów, żaden obraz/ramka nie jest widoczny poza
// aktywnym ekranem, nie wisi żadne okienko. Nowy ekran dodany do index.html wchodzi do przejścia sam (lista z DOM).
// Uruchomienie: node app/tests/spojnosc-ekranow-ui-check.cjs
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const { chromium } = require('./przegladarka.cjs');
const root = path.resolve(__dirname, '../www'), SHOTS = process.env.OEST_SHOTS || '';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  let p = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0]));
  if (p === root) p = path.join(root, 'index.html');
  if (!p.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(p, (e, b) => { if (e) { res.writeHead(404).end(); return; } res.setHeader('Content-Type', TYPES[path.extname(p)] || 'application/octet-stream'); res.end(b); });
});
const fails = [], check = (ok, msg) => { if (!ok) fails.push(msg); };
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const B = 'http://127.0.0.1:' + server.address().port; let browser; const errors = [];
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.OEST_BROWSER_PATH ? { executablePath: process.env.OEST_BROWSER_PATH } : {}) });
    const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, serviceWorkers: 'block' });
    await ctx.addInitScript(() => { if (!localStorage.getItem('oest.account')) localStorage.setItem('oest.account', JSON.stringify({ provider: 'local', id: 'spojnosc', email: 'demo@example.com', first: 'Greg', last: 'Sarna' })); });
    const pg = await ctx.newPage(); pg.setDefaultTimeout(10000); pg.on('pageerror', e => errors.push(e.message));
    const go = async h => { await pg.evaluate(x => { location.hash = x; }, h); await pg.waitForTimeout(700); };
    const snap = () => pg.evaluate(() => {
      const key = e => e.tagName + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/).sort().join('.') : '');
      const live = document.querySelector('.view:not([hidden])');
      const vis = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
      const stray = [...document.querySelectorAll('img, video, iframe, canvas')].filter(e => vis(e) && !(live && live.contains(e)) && !e.closest('.top, header, nav, footer, [data-status], .oest-status')).map(key);
      return { body: [...document.body.children].filter(e => e.tagName !== 'SCRIPT').map(key).sort(), stray, asks: document.querySelectorAll('.oest-ask').length, live: live && live.id };
    });
    await pg.goto(B + '/#home'); await pg.waitForTimeout(1200);
    const base = await snap();
    const views = await pg.evaluate(() => [...document.querySelectorAll('.view')].map(v => v.id.replace(/^v-/, '')).filter(v => v !== 'start'));
    const routes = [...views, 'settings/vantify', 'profile', 'reactive/new', 'zdjecia', 'home'];
    check(views.length >= 10, 'za mało ekranów w przejściu: ' + views.join(','));
    for (const r of routes) {
      await go('#' + r);
      const s = await snap();
      check(s.stray.length === 0, '#' + r + ': obraz/ramka widoczne poza aktywnym ekranem: ' + s.stray.join(', '));
      const extra = s.body.filter(k => !base.body.includes(k) && !/oest-ask|oest-toast/.test(k));
      check(extra.length === 0, '#' + r + ': nowe elementy doklejone do <body>: ' + extra.join(', '));
    }
    const end = await snap();
    check(end.live === 'v-home', 'po przejściu nie wrócił na ekran główny: ' + end.live);
    check(end.asks === 0, 'po przejściu wisi okienko (' + end.asks + ')');
    check(JSON.stringify(end.body) === JSON.stringify(base.body), 'po przejściu <body> inne niż na starcie:\n  start ' + base.body.join(', ') + '\n  koniec ' + end.body.join(', '));
  } catch (e) { fails.push('wyjątek: ' + (e && e.stack || e)); }
  finally { if (browser) await browser.close(); server.close(); }
  if (errors.length) fails.push('błędy strony: ' + errors.join(' | '));
  if (fails.length) { console.error('SPOJNOSC EKRANOW UI FAIL\n- ' + fails.join('\n- ')); process.exitCode = 1; }
  else console.log('SPOJNOSC EKRANOW UI PASS: po każdym ekranie nic nie zostaje pod spodem ani w <body>, powrót na ekran główny czysty');
})();
