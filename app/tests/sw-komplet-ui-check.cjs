'use strict';
// Pamięć offline strony inspekcji (inspekcje/sw.js, wersja przeglądarkowa): nowa strona trafia do pamięci tylko RAZEM
// ze wszystkimi swoimi częściami (SHELL). Scenariusz z przeglądu PR #206: serwer ma już nową stronę, ale jedna część
// (insp.css) nie dochodzi (słaby zasięg). Wtedy w pamięci ma zostać stara strona; po powrocie zasięgu – nowa z kompletem.
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const { chromium } = require('./przegladarka.cjs'), root = path.resolve(__dirname, '../www');
const ZNAK = '<!-- sw-komplet: wersja B -->';
let wersjaB = false, cssPada = false;
const server = http.createServer((req, res) => {
  let sciezka = decodeURIComponent(req.url.split('?')[0]);
  if (sciezka.endsWith('/')) sciezka += 'index.html'; // jak hosting strony: katalog = jego index.html (SHELL ma "./")
  const p = path.resolve(root, '.' + sciezka);
  if (!p.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  if (cssPada && sciezka === '/inspekcje/insp.css') { res.writeHead(503).end(); return; }
  fs.readFile(p, (e, b) => {
    if (e) { res.writeHead(404).end(); return; }
    if (wersjaB && sciezka === '/inspekcje/index.html') b = Buffer.from(b.toString('utf8').replace('</head>', ZNAK + '\n</head>'));
    res.setHeader('Content-Type', p.endsWith('.js') ? 'text/javascript' : p.endsWith('.css') ? 'text/css' : p.endsWith('.json') || p.endsWith('.webmanifest') ? 'application/json' : p.endsWith('.png') ? 'image/png' : 'text/html; charset=utf-8');
    res.end(b);
  });
});

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const url = 'http://127.0.0.1:' + server.address().port + '/inspekcje/index.html', bledy = [];
  let browser, sprawdzen = 0;
  const sprawdz = (warunek, opis) => { sprawdzen++; if (!warunek) bledy.push(opis); };
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.OEST_BROWSER_PATH ? { executablePath: process.env.OEST_BROWSER_PATH } : {}) });
    const ctx = await browser.newContext({ viewport: { width: 412, height: 915 } });
    const pg = await ctx.newPage();
    // co jest w pamięci SW: strona (z ZNAK czy bez) i czy jest insp.css
    const pamiec = () => pg.evaluate(async () => {
      const c = await caches.open('inspekcje-v2');
      const s = await c.match('./index.html'), css = await c.match('./insp.css');
      return { strona: s ? await s.text() : null, css: !!css };
    });
    const czekajNa = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await f()) return true; await pg.waitForTimeout(200); } return false; };

    // 1. pierwsza wizyta: SW instaluje się i zapisuje komplet (wersja A)
    await pg.goto(url); await pg.waitForLoadState('networkidle');
    sprawdz(await czekajNa(() => pg.evaluate(() => !!navigator.serviceWorker.controller), 5000) || (await pg.reload(), await pg.evaluate(() => !!navigator.serviceWorker.controller)), 'SW nie przejął strony');
    const a = await pamiec();
    sprawdz(a.strona && !a.strona.includes(ZNAK) && a.css, 'po instalacji brak kompletu wersji A w pamięci');

    // 2. serwer ma wersję B, ale insp.css nie dochodzi: w pamięci ma zostać wersja A
    wersjaB = true; cssPada = true;
    await pg.reload(); await pg.waitForLoadState('networkidle'); await pg.waitForTimeout(1500);
    const b1 = await pamiec();
    sprawdz(b1.strona && !b1.strona.includes(ZNAK), 'nowa strona trafiła do pamięci bez kompletu części (insp.css nie doszedł)');
    sprawdz(b1.css, 'insp.css zniknął z pamięci');
    // offline: strona z pamięci ma style (insp.css z pamięci)
    await ctx.setOffline(true);
    await pg.reload(); await pg.waitForLoadState('domcontentloaded');
    const stylOffline = await pg.evaluate(() => [...document.styleSheets].some(s => (s.href || '').endsWith('/insp.css') && s.cssRules.length > 0));
    sprawdz(stylOffline, 'offline strona bez insp.css');
    await ctx.setOffline(false);

    // 3. zasięg wraca: komplet wersji B trafia do pamięci
    cssPada = false;
    await pg.reload(); await pg.waitForLoadState('networkidle');
    sprawdz(await czekajNa(async () => { const m = await pamiec(); return m.strona && m.strona.includes(ZNAK) && m.css; }, 5000), 'po powrocie zasięgu wersja B nie trafiła do pamięci');
  } catch (e) {
    bledy.push('wyjątek: ' + (e && e.stack || e));
  } finally {
    if (browser) await browser.close();
    server.close();
  }
  if (bledy.length) { console.log('SW KOMPLET UI FAIL (' + sprawdzen + ' sprawdzeń):\n - ' + bledy.join('\n - ')); process.exit(1); }
  console.log('SW KOMPLET UI PASS: ' + sprawdzen + ' sprawdzeń – strona w pamięci tylko z kompletem części, offline ze stylami, po zasięgu nowa wersja');
})();
