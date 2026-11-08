// ZASADA (Grzegorz, UX-001/UX-002, QG-024; audyt 06/11/2026 pkt 4): każdy ekran ma PL (domyślnie) i EN, a zmiana języka NIC NIE PRZERYSOWUJE
// ani nie drga – zmienia się tylko tekst, układ zostaje (miejsce na dłuższe napisy zarezerwowane z góry).
// Ten test przechodzi KAŻDY ekran apki (lista niżej; test sam sprawdza, że nie pominięto strony Ustawień ani ekranu, do którego prowadzi
// przycisk na ekranie głównym) oraz stronę inspekcji (ustawienia, kolejka, formularz każdego rodzaju z listy PPM).
// A. Ekran z przełącznikiem PL/EN: test klika przełącznik PL → EN → PL jak użytkownik i sprawdza:
//  1. przerysowanie: żaden element nie zostaje usunięty ani dodany (MutationObserver) – wolno zmienić tylko tekst i atrybuty,
//  2. drganie: każdy widoczny element ma tę samą pozycję w pionie i wysokość; przyciski, kafelki i bloki także tę samą pozycję w poziomie
//     (tekst w linii – <span>, <b> – może zmienić szerokość, bo to sam napis; w rzędzie przewijanym w bok, np. pasek dni, pozycja w poziomie
//     może się zmienić – wariant A z 07/11/2026, jak w plynnosc-ui-check; suwak samego przełącznika się przesuwa),
//  3. nic nie znika, 4. zmiana języka nie uruchamia animacji, 5. po powrocie EN → PL wszystko jest dokładnie na swoim miejscu,
//  6. tekst naprawdę się zmienił (inaczej test niczego by nie dowodził).
// B. Ekran bez przełącznika (język zmienia się w Mój profil / na ekranie głównym, ekran otwiera się już w nowym języku):
//    ekran po angielsku ma tę samą budowę i ten sam układ (pion, wysokość, poziom bloków) co po polsku, a tekst jest inny.
// Czeka na stan (język zapisany, kilka klatek bez żadnej zmiany na ekranie), nie mierzy czasu.
// Ekran 412×915 jak Pixel 8 Pro. Wynik z przeglądarki NIE zastępuje sprawdzenia na telefonie.
// Uruchomienie: OEST_PLAYWRIGHT_PATH=… OEST_BROWSER_PATH=… node app/tests/pl-en-ui-check.cjs  (po npm run copy-web)
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const { chromium } = require(process.env.OEST_PLAYWRIGHT_PATH || 'playwright'), root = path.resolve(__dirname, '../www');
const { tasks } = require('./ppm-lista.cjs');
const server = http.createServer((req, res) => {
  const p = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(root + path.sep) && p !== root) { res.writeHead(403).end(); return; }
  const file = p === root ? path.join(root, 'index.html') : p;
  fs.readFile(file, (e, b) => { if (e) { res.writeHead(404).end(); return; } res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.svg') ? 'image/svg+xml' : file.endsWith('.png') ? 'image/png' : 'text/html; charset=utf-8'); res.end(b); });
});
// Ekrany apki (index.html#…). Ustawienia: wszystkie strony z listy titles w settings-ui.js (test sprawdza, że lista jest pełna).
const APP = ['home', 'ppm', 'cal', 'zdjecia', 'soon', 'settings',
  'settings/profile', 'settings/contacts', 'settings/drive', 'settings/mail', 'settings/calendar', 'settings/reports', 'settings/sync', 'settings/account', 'settings/ai',
  'questions', 'reactive', 'reactive/new/blank', 'reactive/history', 'reactive/config', 'keys', 'keys/new', 'keys/find', 'handover', 'powertrace', 'powertrace/new'];
// Strona inspekcji (inspekcje/index.html): ustawienia inspekcji, kolejka i formularz – po jednej inspekcji każdego rodzaju formularza z listy PPM.
const PPM = tasks(root).filter(t => /^EFA-INS-\d{3}$/.test(t.id)), KINDS = [...new Set(PPM.map(t => t.form || 'basic'))];
const INSP = ['home', 'queue', ...KINDS.map(k => 'ppm=' + PPM.find(t => (t.form || 'basic') === k).id)];
const DZIEN = '2026-11-06T10:00:00'; // dzień z planu Vantify (są inspekcje do zrobienia i zaległe)
const BASELINE = path.resolve(__dirname, '../../quality/baselines/pl-en.json');
// wynik: ekran → rodzaje błędów (stały opis bez liczb i pikseli – porównywany z listą znanych odstępstw) + szczegóły do raportu
const R = {}, fails = [], znalezione = new Map(), ogolne = [];
const RODZAJ = { przerysowuje: 'przełącznik PL/EN przerysowuje ekran', przesuwa: 'przełącznik PL/EN przesuwa elementy', powrot: 'po powrocie na PL elementy nie wracają na miejsce', chowa: 'przełącznik PL/EN chowa elementy', animacje: 'zmiana języka uruchamia animacje', 'bez-tlumaczenia': 'tekst nie zmienia się na EN', 'inna-budowa': 'po angielsku ekran ma inną budowę', 'inny-uklad': 'po angielsku elementy są w innym miejscu niż po polsku', start: 'nie da się zacząć od PL' };
const fail = (ekran, rodzaj, msg) => { if (!znalezione.has(ekran)) znalezione.set(ekran, new Map()); znalezione.get(ekran).set(rodzaj, msg); };

// --- w przeglądarce ---
// stan ekranu: każdy widoczny element (w całym dokumencie – też paski na dole) z pozycją; referencje zostają w window.__el
function snap(zapamietaj) {
  const inRow = el => { for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) { const ox = getComputedStyle(a).overflowX; if (ox === 'auto' || ox === 'scroll') return true; } return false; };
  const els = [...document.body.querySelectorAll('*')].filter(e => !/^(SCRIPT|STYLE|TEMPLATE|svg|path|circle|rect|g|line|polyline|polygon|ellipse|use|defs)$/.test(e.tagName) && !e.closest('svg') && e.getClientRects().length && e.offsetWidth + e.offsetHeight > 0);
  if (zapamietaj !== false) window.__el = els; // pomiar stabilności (settle) nie nadpisuje elementów zapamiętanych w PL
  return els.map(e => { const r = e.getBoundingClientRect(); return { x: Math.round(r.x + scrollX), y: Math.round(r.y + scrollY), w: Math.round(r.width), h: Math.round(r.height), row: inRow(e), blok: !/^inline/.test(getComputedStyle(e).display) || /^(BUTTON|LABEL)$/.test(e.tagName) || e.matches('.chip,.tile,.k2,.day,[role=button],.prow'), sw: !!e.closest('.oest-sw'), t: e.tagName + (e.id ? '#' + e.id : ''), d: (e.id ? '#' + e.id : e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : '')) + ' „' + (e.textContent || e.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 28) + '”' }; });
}
function again() { return (window.__el || []).map(e => { if (!e.isConnected) return null; const r = e.getBoundingClientRect(); return { x: Math.round(r.x + scrollX), y: Math.round(r.y + scrollY), w: Math.round(r.width), h: Math.round(r.height), hidden: !e.getClientRects().length }; }); }
// obserwator: elementy dodane/usunięte (przerysowanie) i uruchomione animacje
function watch() {
  window.__mut = { dodane: [], usuniete: [] }; window.__anim = [];
  const d = n => (n.id ? '#' + n.id : n.tagName.toLowerCase() + (typeof n.className === 'string' && n.className ? '.' + n.className.trim().split(/\s+/)[0] : '')) + (n.parentElement ? ' w ' + (n.parentElement.id ? '#' + n.parentElement.id : n.parentElement.tagName.toLowerCase() + (typeof n.parentElement.className === 'string' && n.parentElement.className ? '.' + n.parentElement.className.trim().split(/\s+/)[0] : '')) : '');
  window.__mo && window.__mo.disconnect();
  window.__mo = new MutationObserver(ms => { for (const m of ms) { for (const n of m.addedNodes) if (n.nodeType === 1) window.__mut.dodane.push(d(n)); for (const n of m.removedNodes) if (n.nodeType === 1) window.__mut.usuniete.push(n.id ? '#' + n.id : n.tagName.toLowerCase() + (typeof n.className === 'string' && n.className ? '.' + n.className.trim().split(/\s+/)[0] : '') + ' z ' + (m.target.id ? '#' + m.target.id : m.target.tagName.toLowerCase() + (typeof m.target.className === 'string' && m.target.className ? '.' + m.target.className.trim().split(/\s+/)[0] : ''))); } });
  window.__mo.observe(document.body, { childList: true, subtree: true });
}
// animacje pojawienia się (moduly/wyglad) przesuwają elementy transformacją bez zmian w DOM – czekamy, aż się skończą (bez nieskończonych, np. kręciołka)
function koniecAnimacji() { const czekaj = Promise.all(document.getAnimations().filter(a => a.playState === 'running' && a.effect && a.effect.getTiming().iterations !== Infinity).map(a => a.finished.catch(() => {}))); let n = 0; const limit = new Promise(r => { const t = () => (++n >= 240 ? r() : requestAnimationFrame(t)); requestAnimationFrame(t); }); return Promise.race([czekaj, limit]); } // limit liczony klatkami (zawieszona animacja nie blokuje testu)
// spokój: N kolejnych klatek bez żadnej zmiany DOM (liczone klatkami, nie czasem)
function quiet(n) {
  return new Promise(res => { let calm = 0, seen = 0; const mo = new MutationObserver(() => { seen++; }); mo.observe(document.documentElement, { childList: true, subtree: true, attributes: true, characterData: true });
    const tick = () => { if (seen) { seen = 0; calm = 0; } else calm++; if (calm >= n) { mo.disconnect(); res(); } else requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
}

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const url = 'http://127.0.0.1:' + server.address().port, errors = [];
  let browser;
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.OEST_BROWSER_PATH ? { executablePath: process.env.OEST_BROWSER_PATH } : {}) });
    const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, serviceWorkers: 'block' });
    await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort()); // bez internetu: wynik nie zależy od sieci
    await ctx.clock.setFixedTime(new Date(DZIEN)); // stała data: napisy typu „Zostało 2 dni” i listy dnia takie same przy każdym uruchomieniu
    await ctx.addInitScript(() => {
      if (!localStorage.getItem('oest.account')) localStorage.setItem('oest.account', JSON.stringify({ provider: 'local', id: 'test', email: 'test@example.com', first: 'Greg', last: 'Sarna', name: 'Greg Sarna', t: 1 }));
      document.addEventListener('animationstart', e => { if (window.__anim && !/spin/i.test(e.animationName)) window.__anim.push(e.animationName + ' na ' + (e.target.id || (typeof e.target.className === 'string' && e.target.className) || e.target.tagName)); }, true);
    });
    const pg = await ctx.newPage();
    pg.on('pageerror', e => errors.push(e.message));
    // ekran gotowy: sieć spokojna, czcionki wczytane, kilka klatek bez zmian i ten sam układ w dwóch kolejnych odczytach (dane z bazy dochodzą asynchronicznie)
    const settle = async () => { await pg.waitForLoadState('networkidle'); await pg.evaluate(() => document.fonts && document.fonts.ready);
      let prev = null; for (let k = 0; k < 12; k++) { await pg.evaluate(quiet, 6); await pg.evaluate(koniecAnimacji); const g = JSON.stringify(await pg.evaluate(snap, false)); if (g === prev) return; prev = g; } };
    const lang = () => pg.evaluate(() => { try { return localStorage.getItem('oest.lang') === 'en' ? 'en' : 'pl'; } catch (e) { return 'pl'; } });
    // język ustawiony tak, jak robi to apka (Mój profil / ustawienia), bez klikania na badanym ekranie
    const ustawJezyk = l => pg.evaluate(l => { if (window.OESTSettings && window.OESTSettingsUI) { OESTSettings.update(s => { s.appearance.language = l; }); OESTSettingsUI.applyTheme(); } localStorage.setItem('oest.lang', l); }, l);
    const SW = '#hmLang:visible, .view:not([hidden]) .oest-sw[data-sw="lang"]:visible, .view:not([hidden]) [data-oest-lang]:visible';
    const ruch = (x, y) => { const out = []; x.forEach((e, i) => { const f = y[i]; if (!f || f.hidden || e.sw) return; if (f.y !== e.y || f.h !== e.h || (e.blok && !e.row && f.x !== e.x)) out.push(`${e.d} ${e.w}×${e.h} @${e.x},${e.y} → ${f.w}×${f.h} @${f.x},${f.y}`); }); return out; };
    const sprawdz = async (ekran, adres) => {
      await pg.goto(url + adres); await settle(); await ustawJezyk('pl'); await pg.reload(); await settle();
      if (await lang() !== 'pl') { fail(ekran, 'start', 'nie da się zacząć od PL'); return; }
      const a = await pg.evaluate(snap), tA = await pg.evaluate(() => document.body.innerText);
      const sw = pg.locator(SW).first(), zPrzelacznikiem = !!(await sw.count());
      const r = R[ekran] = { zmiana: zPrzelacznikiem ? 'przełącznik na ekranie' : 'ekran otwarty po zmianie języka w innym miejscu', elementy: a.length };
      if (zPrzelacznikiem) {
        // użytkownik przełącza język na tym ekranie: zmienia się tylko tekst
        await pg.evaluate(watch); await sw.click();
        await pg.waitForFunction(() => localStorage.getItem('oest.lang') === 'en'); await settle();
        const b = await pg.evaluate(again), mutEn = await pg.evaluate(() => window.__mut), animEn = await pg.evaluate(() => window.__anim.slice()), tB = await pg.evaluate(() => document.body.innerText);
        await pg.evaluate(watch); await pg.locator(SW).first().click();
        await pg.waitForFunction(() => localStorage.getItem('oest.lang') !== 'en'); await settle();
        const c = await pg.evaluate(again), mutPl = await pg.evaluate(() => window.__mut), animPl = await pg.evaluate(() => window.__anim.slice());
        const doEn = ruch(a, b), doPl = ruch(a, c), schowane = b.filter(f => f && f.hidden).length;
        Object.assign(r, { przesuniete: doEn.length, powrotInny: doPl.length, przerysowane: { usuniete: mutEn.usuniete.length + mutPl.usuniete.length, dodane: mutEn.dodane.length + mutPl.dodane.length }, animacje: animEn.length + animPl.length, tekstZmieniony: tA !== tB });
        if (tA === tB) fail(ekran, 'bez-tlumaczenia', 'po przełączeniu PL → EN tekst ekranu się nie zmienił');
        if (mutEn.usuniete.length || mutEn.dodane.length || mutPl.usuniete.length || mutPl.dodane.length) fail(ekran, 'przerysowuje', `PL → EN przerysowuje ekran: usunięto ${mutEn.usuniete.length}, dodano ${mutEn.dodane.length} elementów (${[...new Set(mutEn.usuniete)].slice(0, 4).join('; ')}); EN → PL: usunięto ${mutPl.usuniete.length}, dodano ${mutPl.dodane.length}`);
        if (doEn.length) fail(ekran, 'przesuwa', `PL → EN przesuwa ${doEn.length} elementów: ${doEn.slice(0, 4).join(' | ')}`);
        if (doPl.length) fail(ekran, 'powrot', `po powrocie EN → PL ${doPl.length} elementów nie jest na swoim miejscu: ${doPl.slice(0, 3).join(' | ')}`);
        if (schowane) fail(ekran, 'chowa', `PL → EN chowa ${schowane} elementów`);
        if (animEn.length || animPl.length) fail(ekran, 'animacje', `zmiana języka uruchamia ${animEn.length + animPl.length} animacji: ${[...new Set(animEn.concat(animPl))].slice(0, 3).join(', ')}`);
      } else {
        // ekran bez przełącznika: język zmienia się gdzie indziej, a ekran otwiera się już po angielsku – ten sam układ co po polsku
        await ustawJezyk('en'); await pg.reload(); await settle();
        const b = await pg.evaluate(snap), tB = await pg.evaluate(() => document.body.innerText);
        await ustawJezyk('pl');
        Object.assign(r, { elementyEN: b.length, tekstZmieniony: tA !== tB });
        if (tA === tB) { fail(ekran, 'bez-tlumaczenia', 'po angielsku ekran ma ten sam tekst co po polsku'); return; }
        const kl = x => x.map(e => e.t).join('|'); // budowa = znaczniki i id (klasy mogą dojść później, np. od modułu wyglądu)
        if (kl(a) !== kl(b)) { const i = a.findIndex((e, k) => !b[k] || b[k].t !== e.t); fail(ekran, 'inna-budowa', `po angielsku ekran ma inną budowę (${a.length} → ${b.length} elementów; pierwsza różnica: ${a[i] ? a[i].d : '—'} / ${b[i] ? b[i].d : '—'})`); r.innaBudowa = true; return; }
        const roz = ruch(a, b); r.przesuniete = roz.length;
        if (roz.length) fail(ekran, 'inny-uklad', `po angielsku ${roz.length} elementów w innym miejscu niż po polsku: ${roz.slice(0, 4).join(' | ')}`);
      }
    };

    // lista ekranów jest pełna: wszystkie strony Ustawień z settings-ui.js i wszystkie cele [data-go] ekranu głównego i Ustawień
    {
      const src = fs.readFileSync(path.join(root, 'settings-ui.js'), 'utf8'), m = /var titles=\{([^;]*)\};/.exec(src);
      const pages = m ? [...m[1].matchAll(/(\w+):\[/g)].map(x => x[1]).filter(p => p !== 'backup') : []; // backup = ta sama strona co drive (open(): settings/backup → settings/drive)
      if (!pages.length) ogolne.push('lista ekranów: nie znaleziono stron Ustawień (titles) w settings-ui.js');
      for (const p of pages) if (!APP.includes('settings/' + p)) ogolne.push('lista ekranów: brak strony Ustawień settings/' + p);
      await pg.goto(url + '/index.html#home'); await settle();
      const cele = new Set(await pg.evaluate(() => [...document.querySelectorAll('[data-go]')].map(b => b.dataset.go)));
      for (const g of cele) { const r = g === 'profile' ? 'settings/profile' : g === 'appset' ? 'settings/account' : g; if (!APP.includes(r) && !['list', 'start'].includes(r)) ogolne.push('lista ekranów: do ekranu #' + g + ' da się przejść, a test go nie sprawdza'); }
    }

    for (const e of APP) await sprawdz('#' + e, '/index.html#' + e);
    for (const e of INSP) await sprawdz('inspekcje #' + e, '/inspekcje/index.html#' + e);
  } finally { if (browser) await browser.close(); await new Promise(r => server.close(r)); }

  if (errors.length) ogolne.push('błędy strony: ' + [...new Set(errors)].slice(0, 5).join(' | '));
  // porównanie z listą znanych odstępstw (quality/baselines/pl-en.json): dokładnie te rodzaje na tych ekranach – nic nowego i nic naprawionego bez usunięcia wpisu
  const base = JSON.parse(fs.readFileSync(BASELINE, 'utf8')), known = new Map(base.entries.map(e => [e.id, e])), znane = [], ekrany = Object.keys(R);
  for (const [ekran, rodzaje] of znalezione) for (const [rodzaj, msg] of rodzaje) { const id = 'PL_EN|' + ekran + '|' + rodzaj; if (known.has(id)) znane.push(id + ' – ' + msg); else fails.push(ekran + ': ' + msg); }
  for (const id of known.keys()) { const [, ekran, rodzaj] = id.split('|'); if (!ekrany.includes(ekran)) fails.push(id + ': ekranu nie ma już w teście – usuń wpis z quality/baselines/pl-en.json'); else if (!(znalezione.get(ekran) && znalezione.get(ekran).has(rodzaj))) fails.push(ekran + ': „' + (RODZAJ[rodzaj] || rodzaj) + '” już nie występuje – usuń ' + id + ' z quality/baselines/pl-en.json (lista może tylko maleć)'); }
  fails.unshift(...ogolne);
  if (process.env.OEST_PL_EN_OUT) fs.writeFileSync(process.env.OEST_PL_EN_OUT, JSON.stringify({ wyniki: R, znalezione: [...znalezione].map(([e, m]) => [e, [...m]]), bledy: fails }, null, 1));
  const el = Object.values(R).reduce((a, r) => a + r.elementy, 0), czyste = ekrany.filter(e => !znalezione.has(e));
  console.log('PL/EN: ' + ekrany.length + ' ekranów, ' + el + ' elementów (dzień ' + DZIEN.slice(0, 10) + '); z przełącznikiem: ' + ekrany.filter(k => R[k].zmiana.startsWith('przełącznik')).join(' ') + '; bez zastrzeżeń ' + czyste.length + ': ' + czyste.join(' '));
  // bramka pokazuje tylko koniec wyjścia: przy błędzie znane odstępstwa w jednej linii, a błędy na samym końcu
  if (fails.length) { console.log('Znane odstępstwa (' + znane.length + '): ' + znane.map(z => z.split(' – ')[0]).join(', ')); console.log('PL EN UI FAIL (' + fails.length + '):\n- ' + fails.join('\n- ')); process.exitCode = 1; return; }
  for (const z of znane) console.log('  ZNANE ODSTĘPSTWO ' + z);
  console.log('PL EN UI PASS: ' + ekrany.length + ' ekranów (apka ' + APP.length + ', inspekcje ' + INSP.length + '), ' + el + ' elementów – bez nowych przerysowań, przesunięć i animacji przy zmianie PL/EN; znane odstępstwa: ' + znane.length + '.');
})().catch(e => { console.error(e); process.exitCode = 1; });
