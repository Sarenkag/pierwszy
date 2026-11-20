// Wstecz telefonu w czasie ładowania strony – audyt niezależny 19/11/2026 nr 41 (plan 3.3).
// Dopóki strona nie zarejestruje nasłuchu backButton (@capacitor/app), Android robi webView.goBack(), czyli cofa po historii
// (Wstecz tuż po wyjściu z inspekcji mógł ją otworzyć ponownie). moduly/wstecz był 34. skryptem apki i 25. inspekcji.
// Sprawdzamy na obu prawdziwych stronach (app/www po copy-web), apka „natywna” (atrapa Capacitor, App.addListener zapisuje nasłuch):
//  1. nasłuch backButton jest rejestrowany, zanim przeglądarka dojdzie do <body> (pierwszy skrypt w <head>),
//  2. Wstecz w czasie ładowania: brak cofania po historii i brak wyjścia z apki,
//  3. po załadowaniu Wstecz działa jak dotąd (ekran główny apki → pytanie „Chcesz wyjść?”; inspekcja → wyjście do rodzica).
// NIE sprawdza (Pixel 8 Pro): prawdziwego AppPlugin i gestu Wstecz.
// Uruchomienie: node app/tests/wstecz-ladowanie-ui-check.cjs (po npm run copy-web)
const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), assert = require('node:assert/strict');
const { chromium } = require(process.env.OEST_PLAYWRIGHT_PATH || 'playwright');
const root = path.resolve(__dirname, '../www');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const p = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(root + path.sep) && p !== root) { res.writeHead(403).end(); return; }
  const file = p === root ? path.join(root, 'index.html') : p;
  fs.readFile(file, (e, b) => { if (e) { res.writeHead(404).end(); return; } res.setHeader('Content-Type', TYPES[path.extname(file)] || 'application/octet-stream'); res.end(b); });
});
let STEP = 'start';
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port;
  let browser;
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.OEST_BROWSER_PATH ? { executablePath: process.env.OEST_BROWSER_PATH } : {}) });
    const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, serviceWorkers: 'block' });
    await ctx.addInitScript(() => {
      if (location.protocol === 'about:') return;
      if (!localStorage.getItem('oest.account')) localStorage.setItem('oest.account', JSON.stringify({ provider: 'local', id: 'wl', email: 'demo@example.com', first: 'G', last: 'S' }));
      window.__bb = []; window.__bbBody = null; window.__exit = 0;
      const App = { addListener: (ev, fn) => { if (ev === 'backButton') { window.__bb.push(fn); if (window.__bbBody === null) window.__bbBody = !!document.body; window.__early = []; queueMicrotask(() => { try { fn(); window.__early.push('ok'); } catch (e) { window.__early.push(e.message); } }); } return Promise.resolve({ remove() {} }); }, exitApp: () => { window.__exit++; } };
      window.Capacitor = { isNativePlatform: () => true, Plugins: { App }, convertFileSrc: x => x,
        registerPlugin: n => n === 'App' ? App : new Proxy({}, { get: (_, k) => k === 'then' ? undefined : () => Promise.reject(Error('UNAVAILABLE')) }) };
      // Wstecz w czasie ładowania: zaraz po rejestracji (jeszcze przed <body>) naciskamy klawisz (w addListener wyżej)
      const hb = history.back.bind(history); window.__hist = 0; history.back = () => { window.__hist++; hb(); };
    });
    for (const [nazwa, url] of [['apka', '/index.html#home'], ['inspekcja', '/inspekcje/index.html']]) {
      STEP = nazwa + ' rejestracja';
      const page = await ctx.newPage(), errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(base + url, { waitUntil: 'load' });
      await page.waitForTimeout(1500);
      const st = await page.evaluate(() => ({ n: window.__bb.length, body: window.__bbBody, early: window.__early, exit: window.__exit, hist: window.__hist, href: location.href }));
      assert.equal(st.n, 1, nazwa + ': jeden nasłuch backButton');
      assert.equal(st.body, false, nazwa + ': nasłuch zarejestrowany w <head>, zanim powstał <body>');
      STEP = nazwa + ' Wstecz w czasie ładowania';
      assert.deepEqual(st.early, ['ok'], nazwa + ': Wstecz w czasie ładowania bez błędu');
      assert.equal(st.exit, 0, nazwa + ': Wstecz w czasie ładowania nie zamyka apki');
      assert.equal(st.hist, 0, nazwa + ': Wstecz w czasie ładowania nie cofa po historii');
      assert.equal(st.href, base + url, nazwa + ': zostaje ta sama strona');
      STEP = nazwa + ' Wstecz po załadowaniu';
      await page.evaluate(() => window.__bb[0]());
      await page.waitForTimeout(1500);
      if (nazwa === 'apka') assert.match(await page.evaluate(() => [...document.querySelectorAll('.oest-ask')].map(a => a.textContent).join(' ')), /Chcesz wyjść z aplikacji/, 'apka: ekran główny → pytanie o wyjście');
      else assert.ok(!/\/inspekcje\//.test(page.url()), 'inspekcja: Wstecz wychodzi do rodzica, jest ' + page.url());
      assert.deepEqual(errors, [], nazwa + ': błędy strony');
      await page.close();
    }
    console.log('WSTECZ LADOWANIE UI PASS');
  } catch (e) {
    console.error('WSTECZ LADOWANIE UI FAIL [' + STEP + ']: ' + (e && e.stack || e));
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    server.close();
  }
})();
