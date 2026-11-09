// Moduł checkboxa (moduly/checkbox): wyskok ✓ TYLKO po dotknięciu przez użytkownika (Grzegorz 02/11/2026 – ruch zaznaczenia;
// 09/11/2026 – ekran startowy inspekcji drgał: checkboxy ustawień „wyskakiwały” przy każdym otwarciu i zmianie języka, bramka PL/EN złapała 20 → 21 px).
// Sprawdza w Chrome (412×915 jak Pixel 8 Pro):
//  1) otwarcie ekranu z zaznaczonymi checkboxami (inspekcje #home, PL i EN): żadnej animacji oest-cb-pop, każdy checkbox 20×20 od pierwszej klatki,
//  2) zaznaczenie z kodu (np. wczytanie ustawień): bez animacji i bez zmiany rozmiaru,
//  3) dotknięcie palcem: kwadrat wyskakuje (oest-cb-pop), po animacji wraca do 20×20 i klasa znika.
// Uruchomienie: OEST_PLAYWRIGHT_PATH=… OEST_BROWSER_PATH=… node app/tests/checkbox-ui-check.cjs  (po npm run copy-web)
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const { chromium } = require(process.env.OEST_PLAYWRIGHT_PATH || 'playwright');
const root = path.resolve(__dirname, '../www');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const p = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(root + path.sep) && p !== root) { res.writeHead(403).end(); return; }
  const file = p === root ? path.join(root, 'index.html') : p;
  fs.readFile(file, (e, b) => { if (e) { res.writeHead(404).end(); return; } res.setHeader('Content-Type', TYPES[path.extname(file)] || 'application/octet-stream'); res.end(b); });
});
const fails = [], R = {};
function check(ok, msg) { if (!ok) fails.push(msg); }
const IDS = ['s-scope', 's-auto', 's-wifi'];
const stan = ids => ids.map(id => { const e = document.getElementById(id), r = e.getBoundingClientRect();
  return { id, checked: e.checked, w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10, pop: e.getAnimations().filter(a => a.animationName === 'oest-cb-pop').length }; });

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const url = 'http://127.0.0.1:' + server.address().port;
  let browser; const errors = [];
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.OEST_BROWSER_PATH ? { executablePath: process.env.OEST_BROWSER_PATH } : {}) });
    const c = await browser.newContext({ viewport: { width: 412, height: 915 }, serviceWorkers: 'block' });
    await c.addInitScript(() => {
      localStorage.setItem('oest.account', JSON.stringify({ provider: 'local', id: 'test', email: 'test@example.com', name: 'Test', t: 1 }));
      // ustawienia jak u Grzegorza: zakres, wysyłka automatyczna i czekanie na Wi-Fi zaznaczone
      window.__pop = 0; document.addEventListener('animationstart', e => { if (e.animationName === 'oest-cb-pop') window.__pop++; }, true);
    });
    await c.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
    const p = await c.newPage(); p.on('pageerror', e => errors.push(e.message));
    for (const l of ['pl', 'en']) {
      await p.goto(url + '/inspekcje/index.html#home'); await p.evaluate(l => localStorage.setItem('oest.lang', l), l); await p.reload();
      const zaraz = await p.evaluate(stan, IDS); // pierwsza chwila po wczytaniu – wtedy dawniej szedł wyskok
      await p.waitForTimeout(600);
      const potem = await p.evaluate(stan, IDS), pop = await p.evaluate(() => window.__pop);
      R['otwarcie-' + l] = { zaraz, potem, pop };
      check(zaraz.every(x => x.checked), `${l}: checkboxy ustawień nie są zaznaczone – test nie sprawdza wyskoku (${JSON.stringify(zaraz)})`);
      check(pop === 0 && zaraz.every(x => !x.pop), `${l}: otwarcie ekranu uruchamia wyskok checkboxa (${pop}×)`);
      for (const x of zaraz.concat(potem)) check(x.w === 20 && x.h === 20, `${l}: ${x.id} ma ${x.w}×${x.h} zamiast 20×20`);
    }
    // zaznaczenie z kodu (wczytanie ustawień): bez wyskoku
    const kod = await p.evaluate(async id => {
      const e = document.getElementById(id); e.scrollIntoView({ block: 'center' }); window.__pop = 0;
      e.checked = false; await new Promise(r => requestAnimationFrame(r)); e.checked = true; await new Promise(r => setTimeout(r, 120));
      const r = e.getBoundingClientRect(); return { pop: window.__pop, w: r.width };
    }, 's-scope');
    R.zKodu = kod;
    check(kod.pop === 0 && kod.w === 20, `zaznaczenie z kodu: wyskok ${kod.pop}×, szerokość ${kod.w}`);
    // dotknięcie palcem: wyskok jest. Ten ekran ustawień jest pod spodem widoku (nie da się w niego kliknąć myszą Playwrighta),
    // więc stuknięcie = el.click(): przeglądarka wysyła click + change dokładnie jak przy dotknięciu (zaznaczenie z kodu „change” nie wysyła).
    await p.evaluate(async () => { const e = document.getElementById('s-auto'); e.click(); await new Promise(r => setTimeout(r, 450)); }); // odznacz
    await p.evaluate(() => document.getElementById('s-auto').click()); // zaznacz
    const klik = await p.evaluate(() => { const e = document.getElementById('s-auto'); return { checked: e.checked, pop: e.getAnimations().filter(a => a.animationName === 'oest-cb-pop').length, klasa: e.classList.contains('oest-cb-pop') }; });
    await p.waitForTimeout(600);
    const poKliku = await p.evaluate(() => { const e = document.getElementById('s-auto'), r = e.getBoundingClientRect(); return { w: r.width, klasa: e.classList.contains('oest-cb-pop') }; });
    R.dotkniecie = { klik, poKliku };
    check(klik.checked && klik.pop === 1, `dotknięcie: brak wyskoku (${JSON.stringify(klik)})`);
    check(poKliku.w === 20 && !poKliku.klasa, `po wyskoku checkbox nie wrócił do 20×20 albo została klasa (${JSON.stringify(poKliku)})`);
    check(!errors.length, 'błędy JS: ' + errors.join(' | '));
  } catch (e) { fails.push('wyjątek: ' + (e && e.stack || e)); }
  finally { if (browser) await browser.close(); server.close(); }
  console.log('POMIARY ' + JSON.stringify(R));
  if (fails.length) { console.log('CHECKBOX UI FAIL (' + fails.length + '):\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log('CHECKBOX UI PASS (otwarcie PL/EN bez wyskoku, zaznaczenie z kodu bez wyskoku, dotknięcie z wyskokiem, 20×20)');
})();
