// Edytor zdjęć – lifting wyglądu (Grzegorz 07/11/2026: „tylko lifting UI/UX, bez zmian logiki i przepływu Cancel/Undo/Save”).
// Sprawdza w Chrome (412×915 jak Pixel 8 Pro), PL i EN, na prawdziwym OESTAparat.edit():
//  – wszystkie narzędzia, kolory i grubości widoczne na ekranie bez przewijania (wcześniej „Linia”/„Kadruj” ucięte – „samotne L”), także przy 360 i 320 px,
//  – jedna wysokość przycisków (44 px), hierarchia: Zapisz (gradient) > Cofnij (ramka) > Anuluj (bez tła i ramki),
//  – PL↔EN: panel narzędzi w identycznym miejscu, przyciski na górze na tej samej wysokości,
//  – dokładnie jedno aktywne narzędzie / kolor / grubość,
//  – przepływ bez zmian: Anuluj → null, rysunek + Cofnij + Zapisz bez zmian → null, rysunek + Zapisz → nowe zdjęcie JPEG.
// Uruchomienie: OEST_PLAYWRIGHT_PATH=… OEST_BROWSER_PATH=… node app/tests/edytor-zdjec-ui-check.cjs  (po npm run copy-web)
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
const W = 412, H = 915;
const fails = [], R = {};
function check(ok, msg) { if (!ok) fails.push(msg); }

// otwiera edytor na sztucznym zdjęciu 1600×1200; wynik edit() trafia do window.__wynik
async function otworz(p) {
  await p.evaluate(() => new Promise(ok => {
    const c = document.createElement('canvas'); c.width = 1600; c.height = 1200; const g = c.getContext('2d');
    g.fillStyle = '#8a8f99'; g.fillRect(0, 0, 1600, 1200); g.fillStyle = '#d6d8dc'; g.fillRect(300, 150, 1000, 900);
    c.toBlob(b => { window.__wynik = undefined; window.OESTAparat.edit(b).then(r => { window.__wynik = r ? { type: r.type, size: r.size } : null; }); ok(); }, 'image/jpeg', 0.9);
  }));
  await p.waitForSelector('.oest-editor canvas'); await p.waitForTimeout(300);
}
// edytor zamyka się płynnie (moduly/wyglad: pomniejszenie okienka), więc czekamy aż zniknie
async function wynik(p) {
  await p.waitForFunction(() => window.__wynik !== undefined, null, { timeout: 10000 });
  await p.waitForFunction(() => !document.querySelector('.oest-editor'), null, { timeout: 3000 }).catch(() => {});
  return p.evaluate(() => window.__wynik);
}
async function rysuj(p) {
  const b = await p.locator('.oest-editor canvas').boundingBox();
  await p.mouse.move(b.x + b.width * .2, b.y + b.height * .7); await p.mouse.down();
  await p.mouse.move(b.x + b.width * .5, b.y + b.height * .4, { steps: 6 }); await p.mouse.up();
}

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const url = 'http://127.0.0.1:' + server.address().port;
  let browser; const errors = [];
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.OEST_BROWSER_PATH ? { executablePath: process.env.OEST_BROWSER_PATH } : {}) });
    for (const lang of ['pl', 'en']) {
      const c = await browser.newContext({ viewport: { width: W, height: H } });
      await c.addInitScript(() => { localStorage.setItem('oest.account', JSON.stringify({ provider: 'local', id: 'test', email: '', name: 'Test', t: 1 })); });
      await c.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
      const p = await c.newPage(); p.on('pageerror', e => errors.push(lang + ': ' + e.message));
      await p.goto(url + '/index.html'); await p.waitForTimeout(400);
      await p.evaluate(l => { window.OESTSettings.update(s => { s.appearance.language = l; }); window.OESTSettingsUI.applyTheme(); }, lang);

      // 1. wygląd
      await openAndMeasure(p, lang);
      // 2. przepływ: Anuluj → null
      await p.click('.oest-editor [data-a="cancel"]');
      check((await wynik(p)) === null, `${lang}: Anuluj nie zwrócił null`);
      check(await p.locator('.oest-editor').count() === 0, `${lang}: edytor nie zamknął się po Anuluj`);
      // 3. rysunek + Cofnij + Zapisz → bez zmian (null)
      await otworz(p); await rysuj(p); await p.click('.oest-editor [data-a="undo"]'); await p.click('.oest-editor [data-a="save"]');
      check((await wynik(p)) === null, `${lang}: Cofnij nie usunął rysunku (Zapisz zwrócił zdjęcie)`);
      // 4. kółko + strzałka + Zapisz → JPEG
      await otworz(p); await p.click('.oest-editor [data-t="c2"]');
      const cb = await p.locator('.oest-editor canvas').boundingBox(); await p.mouse.click(cb.x + cb.width * .6, cb.y + cb.height * .3);
      await p.click('.oest-editor [data-t="arrow"]'); await rysuj(p); await p.click('.oest-editor [data-a="save"]');
      const w = await wynik(p);
      check(!!w && w.type === 'image/jpeg' && w.size > 1000, `${lang}: Zapisz po rysunku nie dał zdjęcia JPEG (${JSON.stringify(w)})`);
      await c.close();
    }

    // wąskie ekrany (mniejszy telefon albo większy „Rozmiar wyświetlania” na Pixelu): wszystko nadal na ekranie, bez przewijania
    for (const sz of [360, 320]) {
      const c = await browser.newContext({ viewport: { width: sz, height: 780 } });
      await c.addInitScript(() => { localStorage.setItem('oest.account', JSON.stringify({ provider: 'local', id: 'test', email: '', name: 'Test', t: 1 })); });
      await c.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
      const p = await c.newPage(); p.on('pageerror', e => errors.push(sz + ': ' + e.message));
      await p.goto(url + '/index.html'); await p.waitForTimeout(400); await otworz(p);
      const m = await p.evaluate(() => {
        const box = document.querySelector('.oest-editor'), out = [];
        box.querySelectorAll('button').forEach(b => { const r = b.getBoundingClientRect(); out.push({ k: b.dataset.a || b.dataset.t || b.dataset.c || ('w' + b.dataset.w), x: r.x, r: r.right, h: Math.round(r.height), w: r.width }); });
        const pan = box.querySelector('.ed-panel').getBoundingClientRect();
        return { out, pan: { x: pan.x, r: pan.right }, przewijanie: [...box.querySelectorAll('.ed-panel *')].some(e => e.scrollWidth > e.clientWidth + 1) };
      });
      check(m.out.length === 19, `${sz} px: ${m.out.length} przycisków zamiast 19`);
      for (const v of m.out) {
        check(v.x >= 0 && v.r <= sz, `${sz} px/${v.k}: poza ekranem (x ${v.x.toFixed(1)}–${v.r.toFixed(1)})`);
        check(v.x >= m.pan.x - 0.5 && v.r <= m.pan.r + 0.5, `${sz} px/${v.k}: wychodzi poza panel`);
        check(v.h === 44, `${sz} px/${v.k}: wysokość ${v.h} px zamiast 44`);
        check(v.w >= 23, `${sz} px/${v.k}: za wąski do dotyku (${v.w.toFixed(1)} px)`);
      }
      check(!m.przewijanie, `${sz} px: panel narzędzi przewija się w poziomie`);
      R['szer' + sz] = m.out.map(v => v.k + ':' + v.w.toFixed(1)).join(' ');
      await c.close();
    }

    // PL ↔ EN: panel i górny pasek bez skoków
    const klucze = Object.keys(R.pl.przyciski);
    check(klucze.length === 19, `liczba przycisków ${klucze.length} zamiast 19 (3 górne + 7 narzędzi + 6 kolorów + 3 grubości)`);
    for (const k of klucze) {
      const a = R.pl.przyciski[k], b = R.en.przyciski[k];
      if (!b) { fails.push(`EN: brak przycisku ${k}`); continue; }
      if (/^(cancel|undo|save)$/.test(k)) check(a.y === b.y && a.h === b.h, `${k}: górny przycisk PL y=${a.y}/h=${a.h}, EN y=${b.y}/h=${b.h}`);
      else check(a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h, `${k}: przesuwa się przy PL↔EN (${JSON.stringify(a)} vs ${JSON.stringify(b)})`);
    }
    check(errors.length === 0, 'błędy strony: ' + errors.join(' | '));
  } catch (e) { fails.push('wyjątek: ' + (e && e.stack || e)); }
  finally { if (browser) await browser.close(); server.close(); }
  console.log(JSON.stringify(R, null, 1));
  if (fails.length) { console.error('EDYTOR ZDJEC UI FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log('EDYTOR ZDJEC UI PASS (PL/EN, 19 przycisków na ekranie także przy 360 i 320 px, 44 px, hierarchia Zapisz>Cofnij>Anuluj, przepływ Anuluj/Cofnij/Zapisz bez zmian)');

  async function openAndMeasure(p, lang) {
    await otworz(p);
    await p.click('.oest-editor [data-t="c3"]'); await p.click('.oest-editor [data-c="#2f8bff"]'); await p.click('.oest-editor [data-w="14"]');
    await p.waitForTimeout(350);
    const m = await p.evaluate(() => {
      const box = document.querySelector('.oest-editor'), out = {};
      box.querySelectorAll('button').forEach(b => { const r = b.getBoundingClientRect(), s = getComputedStyle(b);
        out[b.dataset.a || b.dataset.t || b.dataset.c || ('w' + b.dataset.w)] = { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
          tlo: s.backgroundImage !== 'none' ? 'gradient' : s.backgroundColor, ramka: s.borderTopColor, radius: s.borderTopLeftRadius, on: b.classList.contains('on') }; });
      const pan = box.querySelector('.ed-panel'), ps = getComputedStyle(pan);
      return { przyciski: out, przewijanie: [...box.querySelectorAll('.ed-panel *')].some(e => e.scrollWidth > e.clientWidth + 1), panelTlo: ps.backgroundColor,
        aktywne: { t: box.querySelectorAll('[data-t].on').length, c: box.querySelectorAll('[data-c].on').length, w: box.querySelectorAll('[data-w].on').length } };
    });
    R[lang] = m;
    for (const [k, v] of Object.entries(m.przyciski)) {
      check(v.x >= 0 && v.x + v.w <= W && v.y >= 0 && v.y + v.h <= H, `${lang}/${k}: poza ekranem (${JSON.stringify(v)})`);
      check(v.h === 44, `${lang}/${k}: wysokość ${v.h} px zamiast 44`);
    }
    check(!m.przewijanie, `${lang}: panel narzędzi przewija się w poziomie`);
    const { cancel, undo, save } = m.przyciski;
    check(save.tlo === 'gradient', `${lang}: Zapisz bez gradientu (${save.tlo})`);
    check(undo.tlo !== 'rgba(0, 0, 0, 0)' && undo.ramka !== 'rgba(0, 0, 0, 0)', `${lang}: Cofnij bez tła/ramki`);
    check(cancel.tlo === 'rgba(0, 0, 0, 0)' && cancel.ramka === 'rgba(0, 0, 0, 0)', `${lang}: Anuluj ma tło/ramkę (ma być najbardziej neutralny)`);
    check(cancel.radius === undo.radius && undo.radius === save.radius, `${lang}: różne zaokrąglenia górnych przycisków ${cancel.radius}/${undo.radius}/${save.radius}`);
    check(m.aktywne.t === 1 && m.aktywne.c === 1 && m.aktywne.w === 1, `${lang}: aktywne ${JSON.stringify(m.aktywne)} zamiast po jednym`);
    check(m.przyciski.c3.on && m.przyciski['#2f8bff'].on && m.przyciski.w14.on, `${lang}: wybrane narzędzie/kolor/grubość nie jest podświetlone`);
    await p.screenshot({ path: path.join(require('node:os').tmpdir(), `edytor-zdjec-${lang}.png`) });
  }
})();
