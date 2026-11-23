// Pasek systemowy telefonu (godzina, bateria) zawsze czytelny (Grzegorz 07/11/2026, zrzut z apk-274).
// Od szkieletu Ionic (21/11/2026) apka jest edge-to-edge i czarnego pasa html::after już nie ma: ekran z nagłówkiem ma pod godziną
// nieprzezroczysty pas w ion-header (.oest-pas = wysokość paska telefonu, na ekranie Vue – ion-toolbar z dopełnieniem), więc treść
// nigdy nie przewija się pod godziną; ekran główny i start są przezroczyste, ale ich treść zaczyna się poniżej paska.
// Test przeglądarkowy (Quality Gate G2). Na telefonie wysokość paska podaje Capacitor (--safe-area-inset-top);
// tu ustawiamy ją ręcznie na 48 px, tak jak robi to Android. Wynik z przeglądarki NIE zastępuje sprawdzenia na Pixelu.
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const { chromium } = require('./przegladarka.cjs');
const root = path.resolve(__dirname, '../www');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const p = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(root + path.sep) && p !== root) { res.writeHead(403).end(); return; }
  const file = p === root ? path.join(root, 'index.html') : p;
  fs.readFile(file, (e, b) => { if (e) { res.writeHead(404).end(); return; } res.setHeader('Content-Type', TYPES[path.extname(file)] || 'application/octet-stream'); res.end(b); });
});
const PASEK = 48;
const EKRANY = ['index.html#home', 'index.html#ppm', 'index.html#cal', 'index.html#settings', 'index.html#reactive', 'index.html#keys', 'index.html#handover', 'index.html#powertrace', 'index.html#questions', 'index.html#zdjecia', 'inspekcje/index.html#ppm=EFA-INS-025'];
const fails = [], R = {};
function check(ok, msg) { if (!ok) fails.push(msg); }

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const url = 'http://127.0.0.1:' + server.address().port + '/';
  let browser;
  try {
    browser = await chromium.launch(process.env.OEST_BROWSER_PATH ? { executablePath: process.env.OEST_BROWSER_PATH } : {});
    const c = await browser.newContext({ viewport: { width: 412, height: 915 } });
    await c.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
    await c.addInitScript(() => { if (location.protocol !== 'http:') return; if (!localStorage.getItem('oest.account')) localStorage.setItem('oest.account', JSON.stringify({ provider: 'local', id: 'test', email: '', name: 'Test', t: 1 })); });
    await c.addInitScript(h => { const set = () => document.documentElement && (document.documentElement.style.setProperty('--safe-area-inset-top', h + 'px'), true); if (!set()) new MutationObserver((m, o) => { if (set()) o.disconnect(); }).observe(document, { childList: true }); }, PASEK);
    const p = await c.newPage(); const errors = []; p.on('pageerror', e => errors.push(e.message));
    // pas pod godziną: czym jest pokryty (ion-header), na jaką szerokość, czy nieprzezroczysty
    const pasek = () => p.evaluate(PASEK => {
      const hdr = document.querySelector('ion-header'), r = hdr ? hdr.getBoundingClientRect() : null;
      const pts = [2, innerWidth / 4, innerWidth / 2, innerWidth * 3 / 4, innerWidth - 2].flatMap(x => [1, PASEK / 2, PASEK - 1].map(y => document.elementFromPoint(x, y)));
      const norm = c => { const k = document.createElement('canvas').getContext('2d'); k.fillStyle = '#123456'; k.fillStyle = c; return k.fillStyle; }; // '#rrggbb' = nieprzezroczysty, 'rgba(…)' = z przezroczystością
      const pas = document.querySelector('ion-header .oest-pas'), tb = document.querySelector('ion-header ion-toolbar');
      const tlo = pas ? getComputedStyle(pas).backgroundColor : tb ? getComputedStyle(tb).getPropertyValue('--background').trim() : '';
      // treść ekranu bez nagłówka ramy: stary .wrap (padding-top) albo ekran na Ionic + Vue z własnym ion-header w treści (ekran główny) – dopełnienie jego paska
      const wrap = document.querySelector('.wrap'), wlasny = wrap && wrap.hidden ? document.querySelector('ion-content ion-header ion-toolbar') : null;
      return { jestHeader: !!hdr, top: r ? Math.round(r.top) : null, szerHeader: r ? Math.round(r.width) : null, wysHeader: r ? Math.round(r.height) : null, szer: innerWidth,
        pokryte: pts.filter(el => el && el.closest('ion-header')).length, punkty: pts.length,
        pasH: pas ? Math.round(pas.getBoundingClientRect().height) : null, toolbarPad: tb ? parseFloat(getComputedStyle(tb).paddingTop) || parseFloat(getComputedStyle(tb).getPropertyValue('--padding-top')) || 0 : null,
        tlo, tloOpak: !!tlo && /^#[0-9a-f]{6}$/i.test(norm(tlo)), wrapPad: wlasny ? parseFloat(getComputedStyle(wlasny).paddingTop) : wrap ? parseFloat(getComputedStyle(wrap).paddingTop) : null,
        czarnyPas: getComputedStyle(document.documentElement, '::after').content };
    }, PASEK);
    for (const e of EKRANY) {
      await p.goto('about:blank'); await p.goto(url + e); await p.waitForTimeout(600);
      R.widoki = R.widoki || {}; R.widoki[e] = await p.evaluate(() => (document.querySelector('.view:not([hidden])') || document.body).id || location.pathname);
      const zalogowany = await p.evaluate(() => !(document.getElementById('v-start') && document.getElementById('v-start').offsetParent) && document.body.innerText.length > 50);
      check(zalogowany, `${e}: ekran się nie otworzył (logowanie albo pusto)`);
      const a = await pasek();
      // przed przewinięciem nic widocznego (tekst, przycisk, ikona) nie może zaczynać się pod czarnym pasem (uwaga Codex w PR #81)
      const zasloniete = await p.evaluate(h => [...document.querySelectorAll('body *')].filter(el => {
        if (!el.offsetParent && getComputedStyle(el).position !== 'fixed') return false;
        const r = el.getBoundingClientRect(), s = getComputedStyle(el);
        if (r.width < 2 || r.height < 2 || r.bottom <= 0 || s.visibility === 'hidden' || +s.opacity === 0) return false;
        const tresc = /^(BUTTON|A|INPUT|SELECT|TEXTAREA|IMG|svg|H1|H2|H3)$/.test(el.tagName) || [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
        return tresc && r.top < h;
      }).map(el => (el.id || el.getAttribute('class') || el.tagName).toString().slice(0, 30) + '@' + Math.round(el.getBoundingClientRect().top)), PASEK);
      R[e + ' zasloniete'] = zasloniete.slice(0, 5);
      check(zasloniete.length === 0, `${e}: pod czarnym pasem jest treść przed przewinięciem: ${zasloniete.slice(0, 4).join(', ')}`);
      const przewinieto = await p.evaluate(() => { if (window.OESTEkrany) OESTEkrany.przewin(600); scrollTo(0, 600); document.querySelectorAll('*').forEach(el => { if (el.scrollHeight > el.clientHeight + 50 && /auto|scroll/.test(getComputedStyle(el).overflowY)) el.scrollTop = 600; }); return (window.OESTEkrany ? OESTEkrany.przewiniecie() : 0) + scrollY; });
      await p.waitForTimeout(200);
      const b = await pasek();
      R[e] = { header: a.jestHeader, wysHeader: a.wysHeader, pasH: a.pasH, tlo: a.tlo, przewinieto, pokryte: [a.pokryte, b.pokryte, a.punkty] };
      const naglowek = !/#home$/.test(e) && a.jestHeader; // ekran z nagłówkiem (każdy poza głównym i inspekcją-stroną bez ramy)
      check(a.czarnyPas === 'none' || a.czarnyPas === 'normal', `${e}: czarny pas html::after wrócił (${a.czarnyPas}) – apka jest edge-to-edge`);
      if (!/#home$/.test(e)) check(a.jestHeader || /inspekcje\//.test(e), `${e}: ekran z nagłówkiem nie ma ion-header z pasem pod godziną`);
      if (naglowek) {
        check(a.top === 0 && a.szerHeader === a.szer, `${e}: pas pod godziną nie stoi na górze na całej szerokości (top ${a.top}, ${a.szerHeader}/${a.szer} px)`);
        check(a.wysHeader >= PASEK, `${e}: nagłówek ma ${a.wysHeader} px, a pasek telefonu ${PASEK} px`);
        check(a.pasH === null || a.pasH === PASEK, `${e}: .oest-pas ma ${a.pasH} px zamiast wysokości paska ${PASEK} px`);
        check(a.toolbarPad === null || a.toolbarPad >= PASEK, `${e}: ion-toolbar ma dopełnienie ${a.toolbarPad} px zamiast ≥ ${PASEK} px (pod paskiem telefonu)`);
        check(a.tloOpak, `${e}: tło pasa pod godziną nie jest nieprzezroczyste (${a.tlo})`);
        check(a.pokryte === a.punkty && b.pokryte === b.punkty, `${e}: pas pod godziną nie zasłania całej szerokości nagłówkiem przed/po przewinięciu (${a.pokryte}/${b.pokryte} z ${a.punkty} punktów) – treść przewija się pod godziną`);
      } else {
        check(a.wrapPad >= PASEK, `${e}: treść ekranu bez nagłówka zaczyna się pod paskiem telefonu (padding-top ${a.wrapPad} < ${PASEK})`);
        check(a.jestHeader || przewinieto === 0 || /#home$/.test(e), `${e}: ekran przewija się (${przewinieto} px) bez nagłówka pod godziną`);
      }
    }
    // okienko na wierzchu (np. pytanie, aparat) nie zasłania paska
    await p.goto(url + 'index.html#home'); await p.waitForTimeout(500);
    await p.evaluate(() => { if (window.OESTPytaj) OESTPytaj({ title: 'Test', text: 'x' }); }); await p.waitForTimeout(400);
    R.okienko = await p.evaluate(() => { let m = 0; document.querySelectorAll('body *').forEach(el => { const s = getComputedStyle(el); if (s.position === 'fixed') m = Math.max(m, +s.zIndex || 0); }); return m; });
    check(R.okienko < 2147483647, 'okienko ma z-index ' + R.okienko + ' – zasłoniłoby pasek');
    // w przeglądarce bez paska systemowego: wysokość 0, nic nie zasłania
    const c2 = await browser.newContext({ viewport: { width: 412, height: 915 } });
    await c2.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
    await c2.addInitScript(() => { if (location.protocol !== 'http:') return; if (!localStorage.getItem('oest.account')) localStorage.setItem('oest.account', JSON.stringify({ provider: 'local', id: 'test', email: '', name: 'Test', t: 1 })); });
    const q = await c2.newPage(); await q.goto(url + 'index.html#ppm'); await q.waitForTimeout(500);
    // stary ekran: .oest-pas; ekran na Ionic + Vue: dopełnienie ion-toolbar pod godziną
    R.bezPaska = await q.evaluate(() => { const pas = document.querySelector('ion-header .oest-pas'), tb = document.querySelector('ion-header ion-toolbar'); return pas ? pas.getBoundingClientRect().height : tb ? parseFloat(getComputedStyle(tb).paddingTop) : null; });
    check(R.bezPaska === 0, 'bez paska systemowego pas pod godziną (.oest-pas / ion-toolbar) ma ' + R.bezPaska + ' px (powinno 0)');
    if (process.env.OEST_PASEK_ZRZUT) { await p.goto('about:blank'); await p.goto(url + 'index.html#ppm'); await p.waitForTimeout(600); await p.evaluate(() => { if (window.OESTEkrany) OESTEkrany.przewin(140); scrollTo(0, 140); }); await p.waitForTimeout(200); await p.screenshot({ path: process.env.OEST_PASEK_ZRZUT }); }
    check(errors.length === 0, 'błędy JS: ' + errors.slice(0, 3).join(' | '));
  } finally { if (browser) await browser.close(); server.close(); }
  console.log('POMIARY ' + JSON.stringify(R));
  if (fails.length) { console.error('PASEK SYSTEMOWY UI FAIL (' + fails.length + '):\n- ' + fails.join('\n- ')); process.exitCode = 1; return; }
  console.log(`PASEK SYSTEMOWY UI PASS: pas pod godziną ${PASEK} px (nagłówek ion-header, nieprzezroczysty, cała szerokość) albo treść poniżej paska na ${EKRANY.length} ekranach, także po przewinięciu; bez paska 0 px.`);
})().catch(e => { console.error(e); process.exitCode = 1; });
