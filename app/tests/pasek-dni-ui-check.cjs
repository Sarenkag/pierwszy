// Pasek dni (Grzegorz 07/11/2026): ekran główny i lista Inspekcji = jeden moduł (moduly/pasek-dni),
// dni pracy z grafiku w profilu wyróżnione, wolne nieprzygaszone, oba paski identyczne, PL/EN bez skoków.
// Scenariusz Grzegorza: dziś 07/11/2026, grafik zapisany w profilu: od 02/11/2026, 4 on / 4 off, 08:00–20:00, początek cyklu 02/11/2026.
// Uruchomienie: OEST_PLAYWRIGHT_PATH=… OEST_BROWSER_PATH=… node app/tests/pasek-dni-ui-check.cjs  (po npm run copy-web)
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
const GRAFIK = { effectiveFrom: '2026-11-02', anchor: '2026-11-02', kind: '4on4', start: '08:00', end: '20:00', endNextDay: false };
// oczekiwane dni pracy liczone niezależnie od apki: 4 dni pracy od 02/11, potem 4 wolne
const DAYS = Array.from({ length: 14 }, (_, i) => new Date(Date.UTC(2026, 10, 6 + i)).toISOString().slice(0, 10));
const WORK = DAYS.filter(k => ((Math.round((Date.parse(k) - Date.parse('2026-11-02')) / 864e5) % 8) + 8) % 8 < 4);
const fails = [], R = {};
function check(ok, msg) { if (!ok) fails.push(msg); }

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const url = 'http://127.0.0.1:' + server.address().port;
  let browser; const errors = [];
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.OEST_BROWSER_PATH ? { executablePath: process.env.OEST_BROWSER_PATH } : {}) });
    async function open(withSchedule) {
      const c = await browser.newContext({ viewport: { width: 412, height: 915 } });
      await c.addInitScript(() => { if (!localStorage.getItem('oest.account')) localStorage.setItem('oest.account', JSON.stringify({ provider: 'local', id: 'test', email: '', name: 'Test', t: 1 })); });
      await c.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
      const p = await c.newPage(); p.on('pageerror', e => errors.push(e.message));
      await p.clock.install({ time: new Date('2026-11-07T13:00:00') });
      await p.goto(url + '/index.html#home'); await p.waitForTimeout(500);
      if (withSchedule) await p.evaluate(g => { window.OESTSettings.addSchedule(g); }, GRAFIK);
      await p.goto(url + '/index.html#home'); await p.waitForTimeout(500);
      return { c, p };
    }
    const strip = (p, id) => p.evaluate(id => [...document.querySelectorAll('#' + id + ' [data-day]')].map(b => {
      const r = b.getBoundingClientRect();
      return { k: b.dataset.day, sh: b.classList.contains('sh'), today: b.classList.contains('today'), past: b.classList.contains('past'),
        op: getComputedStyle(b).opacity, bg: getComputedStyle(b).backgroundImage.slice(0, 40), h: Math.round(r.height), w: Math.round(r.width), x: Math.round(r.x - b.parentNode.getBoundingClientRect().x + b.parentNode.scrollLeft),
        txt: [...b.children].map(e => e.textContent).join('|') };
    }), id);

    // ---------- grafik Grzegorza ----------
    const { c, p } = await open(true);
    const lang = {};
    for (const L of ['pl', 'en']) {
      await p.evaluate(L => { window.OESTSettings.update(s => { s.appearance.language = L; }); window.OESTSettingsUI.applyTheme(); }, L);
      await p.evaluate(() => { location.hash = 'home'; }); await p.waitForTimeout(400);
      const home = await strip(p, 'hmDays');
      await p.evaluate(() => { location.hash = 'ppm'; }); await p.waitForTimeout(400);
      const ppm = await strip(p, 'ppmDays');
      lang[L] = { home, ppm };
    }
    await c.close();
    for (const L of ['pl', 'en']) for (const s of ['home', 'ppm']) {
      const d = lang[L][s], tag = L.toUpperCase() + ' ' + (s === 'home' ? 'ekran główny' : 'Inspekcje');
      check(JSON.stringify(d.map(x => x.k)) === JSON.stringify(DAYS), `${tag}: dni paska ${d.map(x => x.k).join(',')} zamiast ${DAYS[0]}…${DAYS[13]}`);
      if (d.length !== DAYS.length) continue;
      const sh = d.filter(x => x.sh).map(x => x.k);
      check(JSON.stringify(sh) === JSON.stringify(WORK), `${tag}: dni pracy ${sh.join(',')} zamiast ${WORK.join(',')}`);
      check(d.filter(x => x.sh).every(x => /gradient/.test(x.bg)), `${tag}: dzień pracy bez gradientu`);
      check(d.filter(x => !x.sh).every(x => !/gradient/.test(x.bg)), `${tag}: dzień wolny z gradientem`);
      check(d.filter(x => !x.past).every(x => x.op === '1'), `${tag}: dzień wolny/przyszły przygaszony (${d.filter(x => !x.past && x.op !== '1').map(x => x.k).join(',')})`);
      check(d.filter(x => x.past).map(x => x.k).join() === '2026-11-06' && d[0].op !== '1', `${tag}: miniony dzień 06/11 nie jest przygaszony`);
      check(d.filter(x => x.today).map(x => x.k).join() === '2026-11-07', `${tag}: „dziś” nie jest 07/11`);
      check(d[1].txt.split('|')[0] === (L === 'pl' ? 'Dziś' : 'Today'), `${tag}: podpis dzisiaj „${d[1].txt.split('|')[0]}”`);
      check(new Set(d.map(x => x.h)).size === 1, `${tag}: kafelki różnej wysokości ${[...new Set(d.map(x => x.h))].join('/')} px`);
    }
    for (const L of ['pl', 'en']) {
      const a = lang[L].home, b = lang[L].ppm;
      if (a.length !== b.length) { check(false, `${L.toUpperCase()}: paski mają różną liczbę dni (${a.length} / ${b.length})`); continue; }
      // oba paski: ten sam wygląd i te same liczniki (różnić się może tylko wybór dnia)
      check(JSON.stringify(a.map(x => [x.k, x.sh, x.today, x.past, x.h, x.w, x.x, x.txt.split('|').slice(0, 2).concat(x.txt.split('|')[3])])) ===
        JSON.stringify(b.map(x => [x.k, x.sh, x.today, x.past, x.h, x.w, x.x, x.txt.split('|').slice(0, 2).concat(x.txt.split('|')[3])])), `${L.toUpperCase()}: pasek na głównej różni się od paska w Inspekcjach`);
    }
    for (const s of ['home', 'ppm']) {
      const a = lang.pl[s], b = lang.en[s];
      check(JSON.stringify(a.map(x => [x.h, x.w, x.x])) === JSON.stringify(b.map(x => [x.h, x.w, x.x])), `${s}: zmiana PL→EN przesuwa kafelki paska`);
    }
    R.roznice = lang.pl.home.map((x, i) => { const y = lang.pl.ppm[i]; if (!y) return [x.k, 'brak w Inspekcjach']; return JSON.stringify([x.h, x.w, x.x, x.txt]) === JSON.stringify([y.h, y.w, y.x, y.txt]) ? null : [x.k, x.h, y.h, x.w, y.w, x.x, y.x, x.txt, y.txt]; }).filter(Boolean).slice(0, 3);
    R.dniPracy = WORK; R.licznikiPL = lang.pl.ppm.map(x => x.k.slice(8) + ':' + x.txt.split('|')[3]).join(' ');
    R.wysokosc = (lang.pl.home[0] || {}).h;

    // ---------- bez grafiku: żaden dzień nie jest wyróżniony ----------
    {
      const { c: c2, p: p2 } = await open(false);
      const h = await strip(p2, 'hmDays');
      await p2.evaluate(() => { location.hash = 'ppm'; }); await p2.waitForTimeout(400);
      const q = await strip(p2, 'ppmDays');
      check(!h.some(x => x.sh) && !q.some(x => x.sh), 'bez grafiku: pasek wyróżnia dni pracy');
      check(h.concat(q).filter(x => !x.past).every(x => x.op === '1'), 'bez grafiku: dni przygaszone');
      await c2.close();
    }
    check(errors.length === 0, 'błędy JS na stronie: ' + errors.slice(0, 3).join(' | '));
  } finally { if (browser) await browser.close(); server.close(); }
  console.log('POMIARY ' + JSON.stringify(R));
  if (fails.length) { console.error('PASEK DNI UI FAIL (' + fails.length + '):\n- ' + fails.join('\n- ')); process.exitCode = 1; return; }
  console.log(`PASEK DNI UI PASS: grafik 4/4 od 02/11 → dni pracy ${WORK.map(k => k.slice(8)).join(',')} na obu paskach, wolne nieprzygaszone, oba paski identyczne, PL/EN bez przesunięć, kafelki ${R.wysokosc} px.`);
})().catch(e => { console.error(e); process.exitCode = 1; });
