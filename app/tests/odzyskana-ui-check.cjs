// Odzyskana inspekcja (etap 2c, Grzegorz 08/11/2026) – scenariusz na prawdziwych stronach apki (app/www po copy-web):
// inspekcja ATS z odpowiedzią NIE i zdjęciem → raport w archiwum (z zapisem inspekcji) → Ustawienia → Raporty →
// podgląd → „Odzyskaj do edycji” → ta sama inspekcja z fioletową pigułką „Odzyskana”, bez Zakończ i bez terminu,
// obok Wyślij przycisk Update, przełącznik „Updated” domyślnie wyłączony → poprawka + Updated → Update:
// nowa wersja raportu w telefonie (Word z „Updated dd/mm/rrrr”), bez maila; lista PPM, termin i zwykły szkic bez zmian →
// klocek Raporty pokazuje odzyskaną jak zwykły klocek inspekcji (pigułka Odzyskana), PL/EN bez skoków → ponowne otwarcie = poprawiona wersja.
// Wynik NIE zastępuje sprawdzenia na Pixelu 8 Pro ani prawdziwego Dysku.
// Uruchomienie: node app/tests/odzyskana-ui-check.cjs (po npm run copy-web); OEST_SHOTS=katalog → zrzuty ekranu.
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const { chromium } = require(process.env.OEST_PLAYWRIGHT_PATH || 'playwright');
const root = path.resolve(__dirname, '../www');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const p = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(p, (e, b) => { if (e) { res.writeHead(404).end(); return; } res.setHeader('Content-Type', TYPES[path.extname(p)] || 'application/octet-stream'); res.end(b); });
});
const JPG = fs.readFileSync(path.join(__dirname, 'dane/zdjecie-1.jpg')); // prawdziwe zdjęcie: trafia do modułu zdjęć (odnośnik zid), jak w telefonie
const ID = 'EFA-INS-014', SHOTS = process.env.OEST_SHOTS || '';
const fails = []; let passed = 0;
const check = (ok, msg) => { if (ok) passed++; else fails.push(msg); };
const pad = n => String(n).padStart(2, '0'), d0 = new Date(), TODAY = pad(d0.getDate()) + '/' + pad(d0.getMonth() + 1) + '/' + d0.getFullYear();

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const B = 'http://127.0.0.1:' + server.address().port; let browser; const errors = [];
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.OEST_BROWSER_PATH ? { executablePath: process.env.OEST_BROWSER_PATH } : {}) });
    const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: SHOTS ? 2 : 1, serviceWorkers: 'block' });
    await ctx.addInitScript(() => { if (!localStorage.getItem('oest.account')) localStorage.setItem('oest.account', JSON.stringify({ provider: 'local', id: 't', email: 'demo@example.com', first: 'Greg', last: 'Sarna' })); });
    const pg = await ctx.newPage(); pg.on('pageerror', e => errors.push(e.message));
    const kv = () => pg.evaluate(() => new Promise((res, rej) => { const rq = indexedDB.open('inspekcje', 1); rq.onsuccess = () => { const t = rq.result.transaction('kv', 'readonly'), s = t.objectStore('kv'), out = {}; const c = s.openCursor(); c.onsuccess = () => { const k = c.result; if (!k) { rq.result.close(); res(out); return; } out[k.key] = k.value; k.continue(); }; }; rq.onerror = () => rej(rq.error); }));
    const qLen = () => pg.evaluate(() => new Promise(res => { const rq = indexedDB.open('inspekcje', 1); rq.onsuccess = () => { const g = rq.result.transaction('queue', 'readonly').objectStore('queue').getAll(); g.onsuccess = () => { rq.result.close(); res(g.result.length); }; }; }));
    const waitQ = async n => { for (let i = 0; i < 150; i++) { if (await qLen() > n) return; await pg.waitForTimeout(200); } throw new Error('raport nie trafił do kolejki w 30 s'); };
    const ppmLs = () => pg.evaluate(() => JSON.stringify(Object.keys(localStorage).filter(k => /^oest\.ppm\./.test(k)).sort().map(k => [k, localStorage.getItem(k)])));
    const recs = () => pg.evaluate(() => window.OESTRaporty.list());
    const form = () => pg.evaluate(() => ({ photos: document.querySelectorAll('#photos img').length, fails: document.querySelectorAll('.ck-row.fail').length }));
    const shot = async n => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await pg.screenshot({ path: path.join(SHOTS, n + '.png') }); } };

    // 1. zwykła inspekcja ATS: zdjęcie + jedna odpowiedź NIE (szkic zapisuje się sam), potem Wyślij (bez Gmaila raport czeka w kolejce)
    await pg.goto(B + '/index.html#home'); await pg.waitForTimeout(800);
    await pg.evaluate(() => OESTSettings.update(s => { s.profile.companyEmail = 'work@firma.com'; return s; }));
    await pg.goto(B + '/inspekcje/index.html#ppm=' + ID); await pg.waitForTimeout(2500);
    await pg.setInputFiles('#galIn', { name: 'a.jpg', mimeType: 'image/jpeg', buffer: JPG }); await pg.waitForTimeout(800);
    await pg.locator('.ck-row button[data-s="fail"]').first().click(); await pg.waitForTimeout(1200);
    const all0 = await kv(), dk = Object.keys(all0).find(k => k.startsWith('draft_') && all0[k] && all0[k].v === 1);
    check(!!dk, 'zwykły szkic inspekcji zapisany');
    const draft = all0[dk];
    await pg.locator('#toQueue').click();
    await waitQ(0); // raport w kolejce (odczyt IndexedDB po kolei, nie waitForFunction – obietnica byłaby od razu „prawdą”)
    const q = await pg.evaluate(() => new Promise(res => { const rq = indexedDB.open('inspekcje', 1); rq.onsuccess = () => { const g = rq.result.transaction('queue', 'readonly').objectStore('queue').getAll(); g.onsuccess = () => { rq.result.close(); res(g.result[0]); }; }; }));
    // 2. co Wyślij zapisuje dla archiwum: dane inspekcji (odpowiedzi, zdjęcie jako odnośnik, bez pliku) i opis klocka
    check(q.snap && JSON.stringify(q.snap.states) === JSON.stringify(draft.states), 'Wyślij: zapis inspekcji = szkic (odpowiedź NIE)');
    check(q.snap && q.snap.photos.length === 1 && q.snap.photos[0].zid && !q.snap.photos[0].blob, 'zdjęcie w zapisie jako odnośnik do modułu zdjęć (bez kopii pliku)');
    check(q.snap && !q.snap.fin, 'zapis bez znacznika Gotowa');
    check(q.snap && q.snap.needs && q.snap.needs.q === true, 'zapis z ustawieniami pytań inspekcji (' + JSON.stringify(q.snap && q.snap.needs) + ')');
    check(q.card && q.card.name && q.card.loc === 'TB/L13' && q.card.freq, 'opis klocka: nazwa, lokalizacja, częstotliwość (' + JSON.stringify(q.card) + ')');
    check(q.ppm === ID && !q.key, 'zwykła inspekcja: klocek PPM i raport po nazwie jak dotąd');
    check(q.at === q.created, 'Wyślij zapisuje czas przygotowania wersji (spóźniony mail nie nadpisze nowszego Update)');
    const name = q.name;
    // archiwum jak po wysłaniu maila (moduł wysyłki: archive) – ten sam zapis i opis
    await pg.goto(B + '/index.html#home'); await pg.waitForTimeout(800);
    await pg.evaluate(async ({ q }) => {
      const z = new PizZip(); z.file('word/document.xml', '<w:document><w:body><w:p><w:r><w:t>' + q.subject + '</w:t></w:r></w:p></w:body></w:document>');
      await window.OESTRaporty.save({ key: q.name, at: Date.parse('2026-11-06T10:00:00'), name: q.name, docx: z.generate({ type: 'uint8array' }), pdf: new Uint8Array(20), folder: q.rpt,
        meta: { ppm: q.ppm, type: q.type, code: q.code, sentAt: Date.parse('2026-11-06T10:00:00'), card: q.card }, snap: q.snap });
    }, { q });
    const lsBefore = await ppmLs();

    // 3. Ustawienia → Raporty: brak odzyskanych; podgląd → Odzyskaj do edycji
    await pg.goto(B + '/index.html#settings/reports'); await pg.locator('#rptList .k2').first().waitFor();
    check(await pg.locator('#rptRec').isHidden(), 'bez odzyskanych: brak sekcji „Odzyskane inspekcje”');
    await pg.locator('#rptList .k2').first().click();
    const rb = pg.locator('.oest-ask [data-a=rec]'); await rb.waitFor();
    check((await rb.textContent()).trim() === 'Odzyskaj do edycji', 'w podglądzie przycisk „Odzyskaj do edycji”');
    await shot('podglad-odzyskaj-PL');
    await rb.click(); await pg.waitForURL(/inspekcje\/index\.html#rec=/); await pg.waitForTimeout(2500);

    // 4. odzyskana inspekcja: te same dane, pigułka Odzyskana, Update obok Wyślij, bez Zakończ i terminu, Updated wyłączone
    const f1 = await form();
    check(f1.fails === 1 && f1.photos === 1, 'odzyskana: odpowiedź NIE i zdjęcie wróciły (' + JSON.stringify(f1) + ')');
    const pill = await pg.evaluate(() => { const e = document.querySelector('#recPill .oest-st'); return e ? { t: e.textContent, c: getComputedStyle(e).color, w: e.getBoundingClientRect().width } : null; });
    check(pill && pill.t === 'Odzyskana' && pill.c === 'rgb(163, 91, 255)' && Math.round(pill.w) === 98, 'pigułka Odzyskana: fioletowa, 98 px (' + JSON.stringify(pill) + ')');
    check(await pg.locator('#recUpdate').isVisible() && await pg.locator('#toQueue').isVisible(), 'Update obok Wyślij');
    const bw = await pg.evaluate(() => [document.getElementById('toQueue'), document.getElementById('recUpdate')].map(b => { const r = b.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height), Math.round(r.top)]; }));
    check(JSON.stringify(bw[0]) === JSON.stringify(bw[1]), 'Wyślij i Update tej samej wielkości, w jednym rzędzie (' + JSON.stringify(bw) + ')');
    check(!(await pg.locator('#finishIns').isVisible()) && !(await pg.locator('#ppmStage').isVisible()), 'bez Zakończ i bez wyboru etapu');
    check(await pg.evaluate(() => [...document.querySelectorAll('.ppmbar')].every(e => !e.offsetParent)), 'bez paska terminu (termin bez zmian)');
    check(await pg.locator('#updBox').isVisible() && !(await pg.locator('#updOn').isChecked()), '„Updated” widoczne, domyślnie wyłączone');
    const hw = await pg.evaluate(() => { const h = document.querySelector('#v-form .ihead'); return h.scrollWidth <= h.clientWidth + 1; });
    check(hw, 'nagłówek (Imię, Data, Updated, pigułka) mieści się na ekranie');
    await shot('odzyskana-PL');
    check(await ppmLs() === lsBefore, 'otwarcie odzyskanej nie zmienia listy PPM');

    // 5. poprawka + Updated → Update (bez maila)
    await pg.locator('.ck-row.fail button[data-s="ok"]').first().click(); await pg.waitForTimeout(500);
    await pg.locator('#updOn').check(); await pg.waitForTimeout(400);
    const qBefore = await qLen();
    await pg.locator('#recUpdate').click();
    await pg.waitForFunction(() => /Zapisano w telefonie|Nie zapisano/.test(document.getElementById('formHint').textContent), null, { timeout: 30000 });
    const hint = await pg.locator('#formHint').textContent();
    check(/Zapisano w telefonie/.test(hint) && /Mail nie poszedł/.test(hint), 'Update: zapis w telefonie, bez maila, stan Dysku wprost (' + hint + ')');
    await shot('po-update-PL');
    const [r1] = await recs();
    check(r1 && r1.versions === 2 && r1.rec > 0, 'raport: wersja 2, nadal odzyskana');
    check(r1 && !r1.snap.states.includes('fail'), 'zapis inspekcji w raporcie = poprawiona wersja');
    check(r1 && r1.meta.sentAt === Date.parse('2026-11-06T10:00:00'), 'data wysłania bez zmian');
    const docTxt = await pg.evaluate(async id => new PizZip((await window.OESTRaporty.get(id)).docx).file('word/document.xml').asText(), r1.id); // Word czytany w stronie (bez przenoszenia bajtów do testu)
    check(docTxt.includes('(Updated ' + TODAY + ')'), 'Word: data z dopiskiem „(Updated ' + TODAY + ')”');
    check(!/Updated/.test(JSON.stringify(draft)), 'kontrola: zwykły szkic nie miał dopisku');
    const all1 = await kv();
    check(JSON.stringify(all1[dk].states) === JSON.stringify(draft.states), 'zwykła inspekcja z listy PPM bez zmian (nadal NIE)');
    check(await ppmLs() === lsBefore, 'Update nie zmienia listy PPM (etap, termin, ⚙)');
    check(await qLen() === qBefore, 'Update nic nie dodał do kolejki maili (' + qBefore + ')');

    // 5b. Wyślij z odzyskanej: mail z tym samym raportem (ten sam wpis w archiwum i plik na Dysku), klocek PPM bez zmian
    await pg.locator('#toQueue').click();
    await waitQ(qBefore);
    const q2 = await pg.evaluate(() => new Promise(res => { const rq = indexedDB.open('inspekcje', 1); rq.onsuccess = () => { const g = rq.result.transaction('queue', 'readonly').objectStore('queue').getAll(); g.onsuccess = () => { rq.result.close(); res(g.result.sort((a, b) => a.created - b.created).pop()); }; }; }));
    check(q2.key === r1.key && q2.ppm === '' && q2.ppmRef === ID, 'Wyślij z odzyskanej: ten sam raport (klucz), bez ruszania klocka PPM (' + JSON.stringify({ key: q2.key, ppm: q2.ppm, ref: q2.ppmRef }) + ')');
    check(q2.snap && !q2.snap.states.includes('fail'), 'Wyślij z odzyskanej: zapis poprawionej inspekcji');
    check(await ppmLs() === lsBefore, 'Wyślij z odzyskanej nie zmienia listy PPM');
    check(await pg.locator('#recPill .oest-st').textContent() === 'Odzyskana', 'po Wyślij pigułka nadal Odzyskana');

    // 6. klocek Raporty: odzyskana jak zwykły klocek inspekcji; PL/EN bez skoków
    await pg.goto(B + '/index.html#settings/reports'); await pg.locator('#rptRec .ki').first().waitFor();
    const card = await pg.evaluate(() => { const k = document.querySelector('#rptRec .ki'), s = k.querySelector('.oest-st'); return { n: document.querySelectorAll('#rptRec .ki').length, st: s.textContent, c: getComputedStyle(s).color, nm: k.querySelector('.knm').textContent, loc: k.querySelector('.klok').textContent, h: Math.round(k.getBoundingClientRect().height) }; });
    check(card.nm === q.card.name && card.loc === 'TB/L13', 'klocek odzyskanej: nazwa i lokalizacja jak na liście inspekcji (' + card.nm + ', ' + card.loc + ')');
    check(card.n === 1 && card.st === 'Odzyskana' && card.c === 'rgb(163, 91, 255)', 'klocek Raporty: odzyskana z fioletową pigułką (' + JSON.stringify(card) + ')');
    const mainH = await pg.evaluate(async () => { const d = document.createElement('div'); d.style.width = document.querySelector('#rptRec .ki').getBoundingClientRect().width + 'px'; d.innerHTML = window.OESTKlocek.inspekcja({ name: 'X', status: 'gotowa', loc: 'TB', freq: '1M', due: new Date(), photos: 1, qa: { ok: 1, all: 2 } }); document.body.appendChild(d); const h = Math.round(d.firstChild.getBoundingClientRect().height); d.remove(); return h; });
    check(card.h === mainH, 'ta sama wysokość co klocek na liście inspekcji (' + card.h + ' / ' + mainH + ')');
    await shot('raporty-odzyskane-PL');
    const pos = () => pg.evaluate(() => { const b = e => { const r = document.querySelector(e).getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map(Math.round).join(','); }; return [b('#rptRec .ki'), b('#rptRec .oest-st'), b('#rptQ')].join('|'); });
    // ekran Ustawień wjeżdża animacją: mierzymy po jej końcu (dwa takie same pomiary pod rząd)
    const still = async () => { let a = await pos(); for (let i = 0; i < 30; i++) { await pg.waitForTimeout(120); const b = await pos(); if (b === a) return b; a = b; } return a; };
    const p1 = await still();
    await pg.locator('#v-settings [data-action=language]').click(); await pg.waitForTimeout(300);
    check((await pg.locator('#rptRec .oest-st').textContent()) === 'Recovered' && /Recovered inspections/.test(await pg.locator('#rptRecT').textContent()), 'EN: Recovered');
    const p2 = await still();
    check(p2 === p1, 'PL/EN: klocek i pigułka w tym samym miejscu (' + p1 + ' / ' + p2 + ')');
    await shot('raporty-odzyskane-EN');
    await pg.locator('#v-settings [data-action=language]').click(); await pg.waitForTimeout(300);

    // 7. ponowne otwarcie z klocka = poprawiona wersja (własny szkic odzyskanej)
    await pg.locator('#rptRec .ki').first().click(); await pg.waitForURL(/#rec=/); await pg.waitForTimeout(2500);
    const f2 = await form();
    check(f2.fails === 0 && f2.photos === 1, 'ponowne otwarcie: poprawiona wersja (' + JSON.stringify(f2) + ')');
    check(await pg.locator('#updOn').isChecked(), '„Updated” zapamiętane w odzyskanej');
    // 8. zwykła inspekcja z listy PPM nadal ma swoje dane i zwykły wygląd
    await pg.goto(B + '/index.html#ppm'); await pg.waitForTimeout(500); // nowa strona (jak w apce: z listy PPM), nie tylko zmiana # w tej samej
    await pg.goto(B + '/inspekcje/index.html#ppm=' + ID); await pg.waitForTimeout(2500);
    const f3 = await form();
    check(f3.fails === 1 && f3.photos === 1, 'zwykła inspekcja: nadal NIE + zdjęcie (' + JSON.stringify(f3) + ')');
    check(await pg.locator('#recUpdate').isHidden() && await pg.locator('#updBox').isHidden() && !(await pg.locator('#recPill').count()), 'zwykła inspekcja: bez Update, Updated i pigułki Odzyskana');
    // 9. „Wyczyść inspekcję” w odzyskanej: formularz zostaje pusty także po ponownym otwarciu (nie wraca zapis z raportu)
    await pg.goto(B + '/index.html#settings/reports'); await pg.locator('#rptRec .ki').first().waitFor();
    await pg.locator('#rptRec .ki').first().click(); await pg.waitForURL(/#rec=/); await pg.waitForTimeout(2500);
    pg.evaluate(() => window.OEST_clearInspection()); await pg.locator('.oest-ask [data-a=ok]').first().click(); await pg.waitForTimeout(1500);
    const f4 = await form();
    check(f4.fails === 0 && f4.photos === 0, 'Wyczyść: odzyskana pusta (' + JSON.stringify(f4) + ')');
    await pg.goto(B + '/index.html#settings/reports'); await pg.locator('#rptRec .ki').first().waitFor();
    await pg.locator('#rptRec .ki').first().click(); await pg.waitForURL(/#rec=/); await pg.waitForTimeout(2500);
    const f5 = await form();
    check(f5.fails === 0 && f5.photos === 0, 'Wyczyść: po ponownym otwarciu nadal pusta (' + JSON.stringify(f5) + ')');
    // 10. odzyskana, której zdjęcia nie ma już w telefonie: Update i Wyślij nie nadpisują pełnego raportu niepełnym (uwaga Codex #101)
    await pg.goto(B + '/index.html#home'); await pg.waitForTimeout(600);
    const lostId = await pg.evaluate(async ({ q }) => {
      const z = new PizZip(); z.file('word/document.xml', '<w:document><w:body><w:p><w:r><w:t>X</w:t></w:r></w:p></w:body></w:document>');
      const snap = JSON.parse(JSON.stringify(q.snap)); snap.photos = [{ zid: 'nie-ma-takiego-zdjecia', width: 10, height: 10, when: Date.now() }];
      const r = await window.OESTRaporty.save({ key: 'brak-zdjec', at: 1, name: 'Brak zdjec 05112026', docx: z.generate({ type: 'uint8array' }), folder: q.rpt, meta: { ppm: q.ppm, type: q.type, code: q.code, sentAt: 1 }, snap });
      await window.OESTRaporty.setRec(r.id, true); return r.id;
    }, { q });
    await pg.goto(B + '/index.html#ppm'); await pg.waitForTimeout(300);
    await pg.goto(B + '/inspekcje/index.html#rec=' + encodeURIComponent(lostId)); await pg.waitForTimeout(2500);
    await pg.locator('#recUpdate').click(); await pg.waitForTimeout(800);
    check(/Brakuje 1 zdjęć/.test(await pg.locator('#formHint').textContent()), 'brak zdjęcia: Update mówi wprost, czego brakuje');
    await pg.locator('#toQueue').click(); await pg.waitForTimeout(800);
    const lost = await pg.evaluate(id => window.OESTRaporty.get(id), lostId);
    check(lost.versions === 1, 'brak zdjęcia: raport w archiwum (i na Dysku) bez zmian');
    // 11. pytania wyłączone później w zwykłej karcie PPM: odzyskana ma swoje ustawienia (odpowiedzi nie zamieniają się w N/A), karta bez zmian (uwaga Codex #101)
    await pg.goto(B + '/index.html#home'); await pg.waitForTimeout(600);
    const qOffId = await pg.evaluate(async ({ q, ID }) => {
      const n = JSON.parse(localStorage.getItem('oest.ppm.needs') || '{}'); n[ID] = Object.assign({}, n[ID] || {}, { q: false }); localStorage.setItem('oest.ppm.needs', JSON.stringify(n));
      const z = new PizZip(); z.file('word/document.xml', '<w:document><w:body><w:p><w:r><w:t>X</w:t></w:r></w:p></w:body></w:document>');
      const snap = JSON.parse(JSON.stringify(q.snap)); snap.photos = [];
      const r = await window.OESTRaporty.save({ key: 'pytania-wylaczone', at: 1, name: 'Pytania 05112026', docx: z.generate({ type: 'uint8array' }), folder: q.rpt, meta: { ppm: q.ppm, type: q.type, code: q.code, sentAt: 1 }, snap });
      await window.OESTRaporty.setRec(r.id, true); return r.id;
    }, { q, ID });
    await pg.goto(B + '/index.html#ppm'); await pg.waitForTimeout(300);
    await pg.goto(B + '/inspekcje/index.html#rec=' + encodeURIComponent(qOffId)); await pg.waitForTimeout(2500);
    check((await form()).fails === 1, 'pytania wyłączone w karcie: odzyskana nadal z odpowiedzią NIE');
    await pg.waitForTimeout(1500); // szkic odzyskanej zapisuje się sam
    await pg.goto(B + '/index.html#ppm'); await pg.waitForTimeout(300);
    await pg.goto(B + '/inspekcje/index.html#rec=' + encodeURIComponent(qOffId)); await pg.waitForTimeout(2500);
    check((await form()).fails === 1, 'pytania wyłączone w karcie: po ponownym otwarciu nadal NIE');
    check(await pg.evaluate(ID => JSON.parse(localStorage.getItem('oest.ppm.needs'))[ID].q === false, ID), 'zwykła karta PPM: pytania nadal wyłączone');
    // 12. odzyskana inspekcja ze zdjęć formularza (AOV) z wyłączonym Wordem w ⚙ maila: Update i tak robi Word do archiwum/na Dysk (uwaga Codex #101)
    //     + zdjęcie, którego moduł zdjęć nie przyjął (zapis awaryjny w szkicu): zapis w raporcie je liczy, a odzyskana nie nadpisze raportu
    const AOV = 'EFA-INS-003';
    const sendAov = async failSave => {
      await pg.goto(B + '/index.html#ppm'); await pg.waitForTimeout(300);
      await pg.goto(B + '/inspekcje/index.html#ppm=' + AOV); await pg.waitForTimeout(2500);
      await pg.evaluate(({ AOV, failSave }) => { const n = JSON.parse(localStorage.getItem('oest.ppm.needs') || '{}'); n[AOV] = Object.assign({}, n[AOV] || {}, { xw: false, xp: true }); localStorage.setItem('oest.ppm.needs', JSON.stringify(n));
        if (failSave) window.OESTZdjecia.save = () => Promise.reject(new Error('brak miejsca')); }, { AOV, failSave });
      const n0 = await qLen();
      await pg.setInputFiles('#galIn', { name: 'f.jpg', mimeType: 'image/jpeg', buffer: JPG }); await pg.waitForTimeout(1500);
      await pg.locator('#toQueue').click(); await waitQ(n0);
      return pg.evaluate(() => new Promise(res => { const rq = indexedDB.open('inspekcje', 1); rq.onsuccess = () => { const g = rq.result.transaction('queue', 'readonly').objectStore('queue').getAll(); g.onsuccess = () => { rq.result.close(); res(g.result.sort((a, b) => b.created - a.created)[0]); }; }; }));
    };
    const toArchive = (qa, key) => pg.evaluate(async ({ qa, key }) => {
      const z = new PizZip(); z.file('word/document.xml', '<w:document><w:body><w:p><w:r><w:t>X</w:t></w:r></w:p></w:body></w:document>');
      const r = await window.OESTRaporty.save({ key, at: 1, name: key, docx: z.generate({ type: 'uint8array' }), folder: qa.rpt, meta: { ppm: qa.ppm, type: qa.type, code: qa.code, sentAt: 1, card: qa.card }, snap: qa.snap });
      await window.OESTRaporty.setRec(r.id, true); return r.id;
    }, { qa, key });
    const qa = await sendAov(false);
    check(qa.snap && qa.snap.photos.length === 1 && !qa.snap.lost, 'AOV: zdjęcie formularza w zapisie (' + JSON.stringify(qa.snap && { n: qa.snap.photos.length, lost: qa.snap.lost }) + ')');
    const aovId = await toArchive(qa, 'aov-bez-worda');
    await pg.goto(B + '/index.html#ppm'); await pg.waitForTimeout(300);
    await pg.goto(B + '/inspekcje/index.html#rec=' + encodeURIComponent(aovId)); await pg.waitForTimeout(2500);
    await pg.locator('#recUpdate').click();
    for (let i = 0; i < 100 && !/Zapisano|Brakuje|nie|not/i.test(await pg.locator('#formHint').textContent()); i++) await pg.waitForTimeout(200);
    const aovHint = await pg.locator('#formHint').textContent();
    const aovRec = await pg.evaluate(id => window.OESTRaporty.get(id).then(r => ({ v: r.versions, w: r.docx && r.docx.length })), aovId);
    check(/Zapisano w telefonie/.test(aovHint) && aovRec.v === 2 && aovRec.w > 0, 'AOV bez Worda w ⚙: Update zapisuje nową wersję z Wordem (' + aovHint + ', ' + JSON.stringify(aovRec) + ')');
    const ql = await sendAov(true);
    check(ql.snap && ql.snap.lost === 1, 'zdjęcie tylko w zapisie awaryjnym: policzone w zapisie raportu (' + JSON.stringify(ql.snap && { n: ql.snap.photos.length, lost: ql.snap.lost }) + ')');
    const lostAov = await toArchive(ql, 'aov-awaryjne');
    await pg.goto(B + '/index.html#ppm'); await pg.waitForTimeout(300);
    await pg.goto(B + '/inspekcje/index.html#rec=' + encodeURIComponent(lostAov)); await pg.waitForTimeout(2500);
    await pg.locator('#recUpdate').click(); await pg.waitForTimeout(800);
    check(/Brakuje 1 zdjęć/.test(await pg.locator('#formHint').textContent()), 'zapis awaryjny: odzyskana mówi, czego brakuje');
    check((await pg.evaluate(id => window.OESTRaporty.get(id), lostAov)).versions === 1, 'zapis awaryjny: raport bez zmian');
  } catch (e) { fails.push('wyjątek: ' + (e && e.stack || e)); }
  finally { if (browser) await browser.close(); server.close(); }
  errors.forEach(e => fails.push('błąd strony: ' + e));
  if (fails.length) { console.error('ODZYSKANA: BŁĘDY\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log('ODZYSKANA PASS: ' + passed + ' sprawdzeń');
})();
