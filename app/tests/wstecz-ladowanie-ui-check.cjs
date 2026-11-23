// Wstecz telefonu w czasie ładowania strony – audyt niezależny 19/11/2026 nr 41 (plan 3.3).
// Dopóki strona nie ma obsługi Wstecz, Android robi webView.goBack(), czyli cofa po historii (Wstecz tuż po wyjściu z inspekcji mógł ją
// otworzyć ponownie). Od szkieletu Ionic (21/11/2026) moduly/wstecz nie istnieje: Wstecz obsługuje Ionic (zdarzenie „backbutton” na document →
// ionBackButton), rejestruje się dopiero po starcie Ionic, a Capacitor cofa po historii tylko gdy ją ma – apka NIGDY nie dodaje wpisów historii.
// Sprawdzamy na obu prawdziwych stronach (app/www po copy-web), apka „natywna” (atrapa Capacitor):
//  1. dokładnie jeden nasłuch „backbutton” na document (Ionic) i apka nie ma wpisów historii, do których dałoby się cofnąć,
//  2. Wstecz w czasie ładowania (przed startem Ionic): nic się nie dzieje – brak cofania po historii, brak wyjścia z apki, ta sama strona,
//  3. po załadowaniu Wstecz działa jak dotąd (ekran główny apki → pytanie „Chcesz wyjść?”; inspekcja → wyjście do rodzica).
// NIE sprawdza (Pixel 8 Pro): prawdziwego AppPlugin i gestu Wstecz.
// Uruchomienie: node app/tests/wstecz-ladowanie-ui-check.cjs (po npm run copy-web)
const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), assert = require('node:assert/strict');
const { chromium } = require('./przegladarka.cjs');
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
      window.__h0 = history.length; window.__bb = 0; window.__bbBody = null; window.__exit = 0; window.__early = [];
      // nasłuchy „backbutton” na document (tak Ionic odbiera Wstecz telefonu): liczymy rejestracje i zapamiętujemy, czy <body> już istniał
      const dodaj = document.addEventListener.bind(document);
      document.addEventListener = function (typ, ...r) { if (typ === 'backbutton') { window.__bb++; if (window.__bbBody === null) window.__bbBody = !!document.body; } return dodaj(typ, ...r); };
      // Wstecz w czasie ładowania: naciśnięty, zanim strona cokolwiek zarejestruje (przed pierwszym skryptem strony)
      const wstecz = () => { try { document.dispatchEvent(new Event('backbutton')); window.__early.push('ok'); } catch (e) { window.__early.push(e.message); } };
      queueMicrotask(wstecz);
      const App = { addListener: () => Promise.resolve({ remove() {} }), exitApp: () => { window.__exit++; } };
      window.Capacitor = { isNativePlatform: () => true, isPluginAvailable: n => n === 'App', Plugins: { App }, convertFileSrc: x => x,
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
      const st = await page.evaluate(() => ({ n: window.__bb, body: window.__bbBody, early: window.__early, exit: window.__exit, hist: window.__hist, histLen: history.length, hist0: window.__h0, href: location.href }));
      assert.equal(st.n, 1, nazwa + ': jeden nasłuch backbutton (Ionic)');
      assert.equal(st.body, true, nazwa + ': Ionic rejestruje Wstecz po starcie (po <body>); wcześniej Wstecz nic nie robi');
      assert.equal(st.histLen, st.hist0, nazwa + ': apka nie dodaje wpisów historii (było ' + st.hist0 + ', jest ' + st.histLen + '), więc Capacitor nie ma do czego cofać');
      STEP = nazwa + ' Wstecz w czasie ładowania';
      assert.deepEqual(st.early, ['ok'], nazwa + ': Wstecz w czasie ładowania bez błędu');
      assert.equal(st.exit, 0, nazwa + ': Wstecz w czasie ładowania nie zamyka apki');
      assert.equal(st.hist, 0, nazwa + ': Wstecz w czasie ładowania nie cofa po historii');
      assert.equal(st.href, base + url, nazwa + ': zostaje ta sama strona');
      STEP = nazwa + ' Wstecz po załadowaniu';
      if (nazwa === 'apka') { // Codex PR #189: okienko zajęte (np. aparat przy edycji) odmawia zamknięcia – zostaje na stosie, Wstecz nie przechodzi pod spód
        const z = await page.evaluate(async () => { let wolno = false, zw = null; zw = OESTOkna.open(() => { if (wolno) zw(); }); document.dispatchEvent(new Event('backbutton')); await new Promise(r => setTimeout(r, 600));
          const a = { ile: OESTOkna.ile(), pytanie: !!document.querySelector('.oest-ask, ion-alert') }; wolno = true; document.dispatchEvent(new Event('backbutton')); await new Promise(r => setTimeout(r, 600)); a.ilePo = OESTOkna.ile(); return a; });
        assert.deepEqual(z, { ile: 1, pytanie: false, ilePo: 0 }, 'apka: zajęte okienko po Wstecz zostaje na stosie, a po zwolnieniu Wstecz je zamyka');
      }
      await page.evaluate(() => document.dispatchEvent(new Event('backbutton')));
      await page.waitForTimeout(1500);
      if (nazwa === 'apka') assert.match(await page.evaluate(() => [...document.querySelectorAll('.oest-ask, ion-alert')].map(a => a.textContent).join(' ')), /Chcesz wyjść z aplikacji/, 'apka: ekran główny → pytanie o wyjście');
      else assert.ok(!/\/inspekcje\//.test(page.url()), 'inspekcja: Wstecz wychodzi do rodzica, jest ' + page.url());
      // Codex PR #189: wyjście z inspekcji nie może zostawić jej w historii WebView – inaczej natywny Wstecz przed startem Ionic (Capacitor goBack) wróciłby do niej
      if (nazwa === 'inspekcja') { const po = await page.evaluate(() => history.length); assert.equal(po, st.histLen, 'inspekcja: wyjście do apki dodało wpis historii (' + st.histLen + ' → ' + po + '), natywny Wstecz wróciłby do inspekcji'); }
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
