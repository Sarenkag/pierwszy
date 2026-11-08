// Klawisz Wstecz telefonu (moduly/wstecz, Grzegorz 08/11/2026): „back powinien cofać max o poziom wyżej lub spuszczać dane okienko”.
// Wcześniej Android cofał się po całej historii przeglądania (nawet 15 naciśnięć do ekranu głównego), a po wyjściu
// z inspekcji Wstecz otwierał ją z powrotem. Scenariusz Grzegorza na prawdziwych stronach apki (app/www po copy-web):
// chodzenie po klockach → lista PPM → inspekcja → aparat (podgląd zdjęcia, edytor) → Wstecz:
//   edytor → podgląd → ta sama inspekcja → lista, z której przyszedł (ten sam dzień) → ekran główny → „Chcesz wyjść z aplikacji?” (Tak/Nie).
// Do tego: po kilku inspekcjach Wstecz z listy nie wraca do żadnej z nich, podgląd raportu (okienko) zamyka się Wstecz, Ustawienia → Raporty → Ustawienia → ekran główny,
// odzyskana inspekcja wraca do klocka Raporty. Wstecz = OESTWstecz.wstecz() – dokładnie to, co woła klawisz w telefonie (wtyczka App, backButton).
// Wynik NIE zastępuje sprawdzenia na Pixelu 8 Pro (gest Wstecz, prawdziwy aparat).
// Uruchomienie: node app/tests/wstecz-ui-check.cjs (po npm run copy-web)
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const T0 = Date.now();
const { chromium } = require(process.env.OEST_PLAYWRIGHT_PATH || 'playwright');
const root = path.resolve(__dirname, '../www');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const p = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(p, (e, b) => { if (e) { res.writeHead(404).end(); return; } res.setHeader('Content-Type', TYPES[path.extname(p)] || 'application/octet-stream'); res.end(b); });
});
const JPG = fs.readFileSync(path.join(__dirname, 'dane/zdjecie-1.jpg'));
const fails = []; let passed = 0;
const check = (ok, msg) => { if (ok) passed++; else fails.push(msg); if (process.env.OEST_DEBUG) console.log((ok ? '  ✓ ' : '  ✗ ') + msg); };

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const B = 'http://127.0.0.1:' + server.address().port; let browser; const errors = [];
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.OEST_BROWSER_PATH ? { executablePath: process.env.OEST_BROWSER_PATH } : {}) });
    const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, serviceWorkers: 'block' });
    await ctx.addInitScript(() => {
      if (!localStorage.getItem('oest.account')) localStorage.setItem('oest.account', JSON.stringify({ provider: 'local', id: 't', email: 'demo@example.com', first: 'Greg', last: 'Sarna' }));
      // wyjście z apki (wtyczka App) – w przeglądarce tylko zapisujemy, że apka by się zamknęła
      window.Capacitor = { isNativePlatform: () => false, Plugins: { App: { addListener: () => Promise.resolve({ remove() {} }), exitApp: () => { sessionStorage.setItem('wstecz.wyjscie', '1'); } } } };
    });
    const pg = await ctx.newPage(); pg.on('pageerror', e => errors.push(e.message));
    const wait = ms => pg.waitForTimeout(ms);
    // stan ekranu: strona, widoczny widok, otwarte okienka
    const where = () => pg.evaluate(() => ({
      page: /\/inspekcje\//.test(location.pathname) ? 'inspekcja' : 'apka', hash: location.hash,
      view: [...document.querySelectorAll('[id^="v-"]')].filter(e => !e.hidden && e.offsetParent !== null).map(e => e.id).join(','),
      ask: [...document.querySelectorAll('.oest-ask')].map(a => a.textContent.trim()).join(' | '),
      review: document.querySelectorAll('.oest-review').length, editor: document.querySelectorAll('.oest-edit-box, .oest-editor').length,
      len: history.length, exit: sessionStorage.getItem('wstecz.wyjscie') === '1'
    }));
    const back = async (ms = 1500) => { await pg.evaluate(() => window.OESTWstecz.wstecz()); await wait(ms); await pg.waitForLoadState('domcontentloaded'); await wait(300); return where(); };
    const toHome = async (label, max = 3) => { // z każdego miejsca: najwyżej `max` naciśnięć do ekranu głównego
      let n = 0, s = await where();
      while (!(s.page === 'apka' && s.view === 'v-home') && n < 10) { s = await back(); n++; }
      check(n <= max, label + ': do ekranu głównego ' + n + ' naciśnięć Wstecz (max ' + max + ')');
      return s;
    };

    // 1. Grzegorz chodzi po klockach: Ustawienia, kalendarz, lista PPM, dwie inspekcje (każda zamknięta strzałką ‹)
    const log = m => process.env.OEST_DEBUG && console.log(((Date.now() - T0) / 1000).toFixed(1) + 's ' + m);
    log('start'); await pg.goto(B + '/index.html'); await wait(1500); log('home');
    for (const go of ['settings', 'cal', 'ppm']) { log(go); await pg.click('#v-home [data-go="' + go + '"]').catch(() => {}); await wait(900); await pg.evaluate(() => window.OESTWstecz.wstecz()); await wait(900); }
    let s = await where(); check(s.view === 'v-home', '1: po Ustawieniach/kalendarzu/liście Wstecz wraca na ekran główny, jest ' + s.view);
    await pg.click('#v-home [data-go="ppm"]'); await wait(1200);
    // wybrany dzień na pasku dni (lista „tam, skąd przyszedłem” = ten sam dzień)
    const day = await pg.evaluate(() => { const n = e => +(((e.querySelector('i.n') || {}).textContent || '').split('/')[1] || 0), d = [...document.querySelectorAll('#v-ppm [data-day]')].sort((a, b) => n(b) - n(a))[0]; if (d) d.click(); return d ? d.getAttribute('data-day') : ''; }); await wait(700);
    const dayCls = day ? await pg.$eval('#v-ppm [data-day="' + day + '"]', e => e.classList.contains('on')) : false;
    const ids = await pg.$$eval('#v-ppm #ppmList [data-id]', a => a.map(e => e.getAttribute('data-id')).filter(Boolean).slice(0, 2));
    check(ids.length === 2, '1: na liście PPM są co najmniej 2 klocki, jest ' + ids.length);
    for (const id of ids) {
      await pg.click('#v-ppm #ppmList [data-id="' + id + '"]'); await wait(3000);
      s = await where(); check(s.page === 'inspekcja', '1: klocek ' + id + ' otwiera inspekcję, jest ' + s.page + s.hash);
      await pg.locator('.top .back:visible').first().click(); await wait(2500);
      s = await where(); check(s.page === 'apka' && s.view === 'v-ppm', '1: strzałka ‹ z inspekcji ' + id + ' wraca na listę, jest ' + s.page + ' ' + s.view);
    }
    // dawniej: Wstecz z listy otwierał z powrotem ostatnią inspekcję
    s = await back(2000); check(s.page === 'apka' && s.view === 'v-home', '1: Wstecz z listy PPM → ekran główny (nie poprzednia inspekcja), jest ' + s.page + s.hash + ' ' + s.view);

    // 2. lista → inspekcja → aparat: podgląd zdjęcia i edytor zamyka Wstecz, zostajemy w tej samej inspekcji
    await pg.click('#v-home [data-go="ppm"]'); await wait(1200);
    if (day) { await pg.evaluate(d => { const e = document.querySelector('#v-ppm [data-day="' + d + '"]'); if (e) e.click(); }, day); await wait(700); }
    const id = await pg.$eval('#v-ppm #ppmList [data-id]', e => e.getAttribute('data-id'));
    await pg.click('#v-ppm #ppmList [data-id="' + id + '"]'); await wait(3000);
    const inspHash = (await where()).hash;
    await pg.evaluate(b64 => { const b = new Blob([Uint8Array.from(atob(b64), c => c.charCodeAt(0))], { type: 'image/jpeg' }); window.__rev = window.OESTAparat.review(b).then(r => (window.__revWynik = Object.keys(r).join(','))); }, JPG.toString('base64'));
    await wait(800);
    await pg.click('.oest-review [data-r="edit"]'); await wait(1500);
    s = await where(); const edOpen = await pg.evaluate(() => document.querySelectorAll('body > div').length);
    s = await back(800);
    check(s.review === 1, '2: Wstecz w edytorze zamyka edytor i wraca do podglądu zdjęcia (podgląd: ' + s.review + ')');
    check(s.page === 'inspekcja' && s.hash === inspHash, '2: po zamknięciu edytora nadal ta sama inspekcja, jest ' + s.page + s.hash);
    s = await back(800);
    check(s.review === 0, '2: Wstecz w podglądzie zdjęcia zamyka podgląd');
    check(s.page === 'inspekcja' && s.hash === inspHash, '2: po podglądzie zdjęcia nadal ta sama inspekcja ' + inspHash + ', jest ' + s.page + s.hash);
    check(await pg.evaluate(() => window.__revWynik) === 'cancel', '2: zdjęcie po Wstecz nie jest dodane (wynik podglądu: ' + await pg.evaluate(() => window.__revWynik) + ')');
    // okienko z pytaniem w inspekcji zamyka Wstecz (bez wychodzenia z inspekcji)
    await pg.evaluate(() => { window.__pyt = window.OESTPytaj('Pytanie testowe?').then(v => (window.__pytWynik = v)); }); await wait(500);
    s = await back(800);
    check(!s.ask && s.page === 'inspekcja' && s.hash === inspHash, '2: Wstecz zamyka okienko w inspekcji i zostaje w niej, jest ' + s.page + s.hash + ' okienko: ' + s.ask);
    // 3. inspekcja → lista, z której przyszedł (ten sam dzień) → ekran główny
    s = await back(2500);
    check(s.page === 'apka' && s.view === 'v-ppm', '3: Wstecz z inspekcji → lista PPM, jest ' + s.page + s.hash + ' ' + s.view);
    if (day) { const on = await pg.$eval('#v-ppm [data-day="' + day + '"]', e => e.classList.contains('on')).catch(() => false); check(dayCls && on, '3: lista wraca na ten sam wybrany dzień ' + day); }
    s = await back();
    check(s.view === 'v-home', '3: Wstecz z listy → ekran główny, jest ' + s.view);

    // 4. ekran główny: okienko „Chcesz wyjść z aplikacji?” z Tak/Nie; Wstecz albo Nie = zostajemy; Tak = wyjście
    s = await back(700);
    check(/Chcesz wyjść z aplikacji\?/.test(s.ask), '4: na ekranie głównym Wstecz pokazuje „Chcesz wyjść z aplikacji?”, jest: ' + s.ask);
    const btns = await pg.$$eval('.oest-ask button', a => a.map(b => b.textContent.trim()));
    check(btns.join('/') === 'Nie/Tak', '4: przyciski okienka Nie/Tak, są ' + btns.join('/'));
    s = await back(700); check(!s.ask && s.view === 'v-home' && !s.exit, '4: Wstecz w okienku = Nie (okienko znika, apka zostaje)');
    await back(700); await pg.click('.oest-ask [data-a="no"]'); await wait(700);
    s = await where(); check(!s.ask && s.view === 'v-home' && !s.exit, '4: „Nie” zostawia apkę na ekranie głównym');
    await back(700); await pg.click('.oest-ask [data-a="ok"]'); await wait(700);
    s = await where(); check(s.exit, '4: „Tak” zamyka apkę');
    await pg.evaluate(() => sessionStorage.removeItem('wstecz.wyjscie'));
    // EN
    await pg.evaluate(() => { localStorage.setItem('oest.lang', 'en'); window.dispatchEvent(new Event('oest:lang')); }); await wait(400);
    s = await back(700); check(/Do you want to exit the app\?/.test(s.ask), '4: EN: „Do you want to exit the app?”, jest: ' + s.ask);
    const btnsEn = await pg.$$eval('.oest-ask button', a => a.map(b => b.textContent.trim()));
    check(btnsEn.join('/') === 'No/Yes', '4: EN: przyciski No/Yes, są ' + btnsEn.join('/'));
    await back(700); await pg.evaluate(() => { localStorage.setItem('oest.lang', 'pl'); window.dispatchEvent(new Event('oest:lang')); }); await wait(400);

    // 5. raport w archiwum (jak po wysyłce) z zapisem inspekcji – potrzebny do podglądu i odzyskanej inspekcji
    await pg.evaluate(() => OESTSettings.update(x => { x.profile.companyEmail = 'work@firma.com'; return x; }));
    await pg.goto(B + '/inspekcje/index.html#ppm=EFA-INS-014'); await wait(2500);
    await pg.setInputFiles('#galIn', { name: 'a.jpg', mimeType: 'image/jpeg', buffer: JPG }); await wait(800);
    await pg.locator('#toQueue').click(); await wait(2500);
    const q = await pg.evaluate(() => new Promise(res => { const rq = indexedDB.open('inspekcje', 1); rq.onsuccess = () => { const g = rq.result.transaction('queue', 'readonly').objectStore('queue').getAll(); g.onsuccess = () => { rq.result.close(); res(g.result[0]); }; }; }));
    check(!!(q && q.snap), '5: raport inspekcji w kolejce z zapisem inspekcji');
    await pg.goto(B + '/index.html#home'); await wait(1000);
    await pg.evaluate(async q => {
      const z = new PizZip(); z.file('word/document.xml', '<w:document><w:body><w:p><w:r><w:t>' + q.subject + '</w:t></w:r></w:p></w:body></w:document>');
      const r = await window.OESTRaporty.save({ key: q.name, at: Date.now(), name: q.name, docx: z.generate({ type: 'uint8array' }), pdf: new Uint8Array(20), folder: q.rpt, meta: { ppm: q.ppm, type: q.type, code: q.code, sentAt: Date.now(), card: q.card }, snap: q.snap });
      await window.OESTRaporty.setRec(r.id, true);
    }, q);
    await pg.goto(B + '/index.html#home'); await wait(1200);
    // Ustawienia → Raporty (przeglądarka raportów) → podgląd raportu (okienko) → Wstecz zamyka podgląd
    await pg.click('#v-home [data-go="settings"]'); await wait(1200);
    await pg.click('#v-settings [data-route="reports"]'); await wait(1500);
    s = await where(); check(/settings\/reports/.test(s.hash), '5: otwarta przeglądarka raportów, jest ' + s.hash);
    await pg.locator('#rptList .k2').first().click(); await wait(1200);
    s = await where(); check(!!s.ask, '5: podgląd raportu otwarty');
    s = await back(1000); check(!s.ask && /settings\/reports/.test(s.hash), '5: Wstecz zamyka podgląd raportu i zostaje w Raportach, jest ' + s.hash + ' okienko: ' + s.ask.slice(0, 40));
    // odzyskana inspekcja z klocka Raporty → Wstecz wraca do Raportów
    await pg.locator('#rptRec .ki').first().click(); await wait(3000);
    s = await where(); check(s.page === 'inspekcja' && /#rec=/.test(s.hash), '6: odzyskana inspekcja otwarta, jest ' + s.page + s.hash);
    s = await back(2500); check(s.page === 'apka' && /settings\/reports/.test(s.hash), '6: Wstecz z odzyskanej inspekcji → klocek Raporty, jest ' + s.page + s.hash);
    s = await back(); check(s.hash === '#settings', '6: Wstecz z Raportów → Ustawienia, jest ' + s.hash);
    s = await back(); check(s.view === 'v-home', '6: Wstecz z Ustawień → ekran główny, jest ' + s.view);

    // 7. z każdego ekranu z kafelka ekranu głównego: najwyżej 3 naciśnięcia do ekranu głównego
    const tiles = await pg.$$eval('#v-home [data-go]', a => [...new Set(a.map(e => e.getAttribute('data-go')))]);
    for (const t of tiles) { await pg.click('#v-home [data-go="' + t + '"]').catch(() => {}); await wait(1200); await toHome('7: ekran ' + t, 3); }
    check(!errors.length, 'błędy strony: ' + errors.join(' | '));
  } catch (e) { fails.push('wyjątek: ' + (e && e.stack || e)); }
  finally { if (browser) await browser.close(); server.close(); }
  console.log('wstecz-ui-check: OK ' + passed + ', błędy ' + fails.length);
  if (!fails.length) console.log('WSTECZ UI PASS');
  fails.forEach(f => console.log('  ✗ ' + f));
  process.exit(fails.length ? 1 : 0);
})();
