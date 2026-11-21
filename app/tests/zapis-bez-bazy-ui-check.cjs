// Pamięć telefonu (IndexedDB) niedostępna – audyt niezależny 19/11/2026 nr 21 krok 1, decyzja D11 (plan 3.5).
// Zasada: brak bazy = jawny błąd zapisu (STORAGE_WRITE), nie cichy zapas w pamięci (kolejka i szkic ginęły po zamknięciu apki,
// a ekran mówił, że wszystko w porządku). Sprawdzamy na prawdziwej stronie inspekcji (app/www po copy-web), indexedDB.open zawodzi:
//  1. zmiana w formularzu → komunikat „Nie zapisano szkicu w telefonie” (szkic nie udaje zapisu),
//  2. „Wyślij” → komunikat o błędzie zapisu, raport NIE jest „w kolejce”, okno Udostępnij się nie otwiera, formularz zostaje.
// NIE sprawdza (Pixel 8 Pro): prawdziwego braku miejsca w telefonie.
// Uruchomienie: node app/tests/zapis-bez-bazy-ui-check.cjs (po npm run copy-web)
const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), assert = require('node:assert/strict');
const { chromium } = require('./przegladarka.cjs');
const root = path.resolve(__dirname, '../www');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.docx': 'application/octet-stream' };
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
    await ctx.route('https://www.gstatic.com/generate_204', r => r.fulfill({ status: 204, body: '' }));
    await ctx.addInitScript(() => {
      if (location.protocol === 'about:') return;
      localStorage.setItem('oest.account', JSON.stringify({ provider: 'local', id: 'bez-bazy', email: '', first: 'G', last: 'S' }));
      localStorage.setItem('insp.cfg', JSON.stringify({ insp: 'G. Sarna', email: 'demo@example.com' }));
      // pamięć telefonu niedostępna: każde otwarcie bazy kończy się błędem
      IDBFactory.prototype.open = function () { const rq = {}; setTimeout(() => { rq.error = new DOMException('denied', 'UnknownError'); rq.onerror && rq.onerror({ target: rq }); }, 0); return rq; };
      window.__shareCalls = 0;
      const P = { ReportShare: { share: async () => { window.__shareCalls++; return { status: 'shared' }; } } };
      window.Capacitor = { isNativePlatform: () => true, Plugins: P, isPluginAvailable: n => !!P[n], convertFileSrc: x => x,
        registerPlugin: n => P[n] || new Proxy({}, { get: (_, k) => k === 'then' ? undefined : () => Promise.reject(Error('UNAVAILABLE')) }) };
      new MutationObserver(() => { const a = document.querySelector('.oest-ask:not([data-wy-out])'); const b = a && a.querySelector('[data-a=ok]'); if (b) { console.log('OEST-ASK ' + a.innerText); b.click(); } }).observe(document, { childList: true, subtree: true });
    });
    const page = await ctx.newPage(), errors = [], said = [];
    page.setDefaultTimeout(15000);
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.text().startsWith('OEST-ASK ')) said.push(m.text().slice(9)); });
    await page.goto(base + '/inspekcje/index.html#ppm=' + PPM_ID);
    await page.locator('#toQueue').waitFor({ state: 'visible' });
    await page.waitForTimeout(1500);

    STEP = '1 szkic';
    await page.locator('#nameOn').setChecked(!(await page.locator('#nameOn').isChecked()));
    await page.waitForFunction(() => /Nie zapisano szkicu w telefonie/.test(document.getElementById('formHint').textContent), null, { timeout: 8000 });

    STEP = '2 Wyślij';
    if (await page.locator('#allOk').isVisible().catch(() => false)) await page.click('#allOk');
    await page.click('#toQueue');
    const txt = () => page.evaluate(() => document.body.innerText);
    for (let i = 0; i < 100 && !/Zmiany NIE zostały zapisane/.test(said.join(' ') + await txt()); i++) await page.waitForTimeout(100);
    assert.match(said.join(' ') + await txt(), /Zmiany NIE zostały zapisane/, 'jawny błąd zapisu (STORAGE_WRITE) przy Wyślij');
    await page.waitForFunction(() => /Nie udało się przygotować raportu/.test(document.getElementById('formHint').textContent), null, { timeout: 8000 });
    const hint = await page.locator('#formHint').textContent();
    assert.match(hint, /Zmiany NIE zostały zapisane/, 'podpowiedź pod formularzem: zdanie o niezapisanych zmianach, jest: ' + hint);
    assert.doesNotMatch(said.join(' ') + await txt(), /STORAGE_WRITE/, 'użytkownik widzi zdanie, nie surowy kod błędu');
    assert.equal(await page.evaluate(() => window.__shareCalls), 0, 'bez zapisu w kolejce okno Udostępnij się nie otwiera');
    assert.ok(/\/inspekcje\//.test(page.url()) && await page.locator('#toQueue').isVisible(), 'formularz zostaje');
    assert.doesNotMatch(await txt(), /W kolejce do wysłania/, 'nie udaje „w kolejce”');
    // moduł notatek ma własną bazę i przy jej braku sam zgłasza jawny błąd – to oczekiwane, inne błędy strony nie
    assert.deepEqual(errors.filter(e => !/Nie udało się zapisać notatki w telefonie/.test(e)), []);
    console.log('ZAPIS BEZ BAZY UI PASS');
  } catch (e) {
    console.error('ZAPIS BEZ BAZY UI FAIL [' + STEP + ']: ' + (e && e.stack || e));
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    server.close();
  }
})();
