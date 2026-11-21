// Strzałka ‹ (#appMenu) w inspekcji w apce – audyt niezależny 19/11/2026 nr 37 (plan 3.2).
// Strzałka była zwykłym linkiem <a href>: wyjście bez leave() – bez zapisu szkicu i bez czekania na wysyłkę w tle.
// Sprawdzamy na prawdziwej stronie inspekcji (app/www po copy-web), apka „natywna” (atrapa Capacitor), ekran wyboru inspekcji:
//  1. wysyłka Gmailem w tle trwa → ‹ nie przerywa jej, strona czeka (leave → OESTSender.whenIdle),
//  2. po wysyłce → wyjście pod adres strzałki (tam, skąd przyszedłem).
// NIE sprawdza (Pixel 8 Pro): prawdziwego WebView i klawisza Wstecz.
// Uruchomienie: node app/tests/menu-wyjscie-ui-check.cjs (po npm run copy-web)
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
const PPM_ID = 'EFA-INS-001';
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
      localStorage.setItem('oest.account', JSON.stringify({ provider: 'local', id: 'menu-test', email: '', first: 'G', last: 'S' }));
      localStorage.setItem('insp.cfg', JSON.stringify({ insp: 'G. Sarna', email: 'demo@example.com' }));
      sessionStorage.setItem('oest.back', JSON.stringify({ h: '#ppm' }));
      window.Capacitor = { isNativePlatform: () => true, isPluginAvailable: n => n === 'App', Plugins: { App: { addListener: () => Promise.resolve({ remove() {} }) } }, convertFileSrc: x => x,
        registerPlugin: () => new Proxy({}, { get: (_, k) => k === 'then' ? undefined : () => Promise.reject(Error('UNAVAILABLE')) }) };
    });
    const page = await ctx.newPage(), errors = [];
    page.setDefaultTimeout(15000);
    page.on('pageerror', e => errors.push(e.message));

    STEP = '1 ‹ czeka na wysyłkę w tle';
    await page.goto(base + '/inspekcje/index.html');
    await page.locator('#appMenu').waitFor({ state: 'visible' });
    const href = await page.locator('#appMenu').getAttribute('href');
    // wysyłka Gmailem w tle (moduly/wysylka) jeszcze trwa: wyjście ma poczekać, aż skończy (leave → whenIdle), nie przerwać jej
    await page.evaluate(() => { window.__idle = null; window.OESTSender.active = () => true; window.OESTSender.whenIdle = () => new Promise(r => { window.__idle = r; }); });
    await page.click('#appMenu');
    await page.waitForTimeout(1500);
    assert.ok(/\/inspekcje\//.test(page.url()), 'w trakcie wysyłki strona inspekcji zostaje, jest ' + page.url());
    assert.equal(await page.evaluate(() => typeof window.__idle), 'function', '‹ czeka na koniec wysyłki (whenIdle)');

    STEP = '2 po wysyłce wyjście tam, skąd przyszedłem';
    await Promise.all([page.waitForURL(u => !/\/inspekcje\//.test(u.pathname), { timeout: 15000 }), page.evaluate(() => window.__idle())]);
    assert.equal(page.url(), new URL(href, base + '/inspekcje/index.html').href, 'wyjście pod adres strzałki');
    assert.deepEqual(errors, []);
    console.log('MENU WYJSCIE UI PASS');
  } catch (e) {
    console.error('MENU WYJSCIE UI FAIL [' + STEP + ']: ' + (e && e.stack || e));
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    server.close();
  }
})();
