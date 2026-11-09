// „Wyczyść inspekcję” i odzyskiwanie (Grzegorz 09/11/2026: sprawdzić od początku do końca na pełnych scenariuszach) –
// prawdziwe strony apki (app/www po copy-web), zdjęcia w module zdjęć, notatki w module notatek.
//  A. inspekcja WYSŁANA: zdjęcie + odpowiedź NIE + notatka → Wyślij (nic nie znika) → Zakończ (Gotowa) → zdjęcie Gotowa →
//     ⋮ Wyczyść → szkic i notatki usunięte, inspekcja dalej na liście, raport w archiwum bez zmian, zdjęcie zostaje
//     w folderze OEST i jest TRZYMANE 30 dni od wyczyszczenia (także gdy samo zdjęcie ma 20 dni) → po 31 dniach zwolnione
//     (zostaje w folderze, podlega limitowi) → Ustawienia → Raporty → Odzyskaj do edycji: odpowiedź NIE i zdjęcie wracają.
//  B. inspekcja NIEWYSŁANA: zdjęcie + notatka → ⋮ Wyczyść → pusta, „Nie rozpoczęta”, nadal na liście; Gotowa + Wyczyść:
//     znacznik Gotowa zostaje (Wyczyść go nie zdejmuje – zasada: zdejmuje się jednym dotknięciem).
// Wynik NIE zastępuje sprawdzenia na Pixelu 8 Pro.
// Uruchomienie: node app/tests/czyszczenie-ui-check.cjs (po npm run copy-web); OEST_SHOTS=katalog → zrzuty ekranu.
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const { chromium } = require(process.env.OEST_PLAYWRIGHT_PATH || 'playwright');
const root = path.resolve(__dirname, '../www');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const p = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(p, (e, b) => { if (e) { res.writeHead(404).end(); return; } res.setHeader('Content-Type', TYPES[path.extname(p)] || 'application/octet-stream'); res.end(b); });
});
const JPG = fs.readFileSync(path.join(__dirname, 'dane/zdjecie-1.jpg'));
const A = 'EFA-INS-014', Bid = 'EFA-INS-015', SHOTS = process.env.OEST_SHOTS || '', D = 864e5;
const fails = []; let passed = 0;
const check = (ok, msg) => { if (ok) passed++; else fails.push(msg); };

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const B = 'http://127.0.0.1:' + server.address().port; let browser; const errors = [];
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.OEST_BROWSER_PATH ? { executablePath: process.env.OEST_BROWSER_PATH } : {}) });
    const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: SHOTS ? 2 : 1, serviceWorkers: 'block' });
    await ctx.addInitScript(() => { if (!localStorage.getItem('oest.account')) localStorage.setItem('oest.account', JSON.stringify({ provider: 'local', id: 't', email: 'demo@example.com', first: 'Greg', last: 'Sarna' })); });
    const pg = await ctx.newPage(); pg.on('pageerror', e => errors.push(e.message));
    const kv = () => pg.evaluate(() => new Promise((res, rej) => { const rq = indexedDB.open('inspekcje', 1); rq.onsuccess = () => { const g = rq.result.transaction('kv', 'readonly').objectStore('kv'), out = {}; const c = g.openCursor(); c.onsuccess = () => { const k = c.result; if (!k) { rq.result.close(); res(out); return; } out[k.key] = k.value; k.continue(); }; }; rq.onerror = () => rej(rq.error); }));
    const queue = () => pg.evaluate(() => new Promise(res => { const rq = indexedDB.open('inspekcje', 1); rq.onsuccess = () => { const g = rq.result.transaction('queue', 'readonly').objectStore('queue').getAll(); g.onsuccess = () => { rq.result.close(); res(g.result); }; }; }));
    const waitQ = async n => { for (let i = 0; i < 150; i++) { if ((await queue()).length > n) return; await pg.waitForTimeout(200); } throw new Error('raport nie trafił do kolejki w 30 s'); };
    const photo = id => pg.evaluate(id => new Promise(res => { const rq = indexedDB.open('oest-zdjecia', 1); rq.onsuccess = () => { const g = rq.result.transaction('photos', 'readonly').objectStore('photos').get(id); g.onsuccess = () => { rq.result.close(); const r = g.result; res(r ? { hold: r.hold, unused: r.unused || '', saved: r.saved, blob: !!r.blob } : null); }; }; }), id);
    const agePhoto = (id, field, days) => pg.evaluate(({ id, field, ms }) => new Promise(res => { const rq = indexedDB.open('oest-zdjecia', 1); rq.onsuccess = () => { const s = rq.result.transaction('photos', 'readwrite').objectStore('photos'), g = s.get(id); g.onsuccess = () => { const r = g.result; r[field] = new Date(Date.now() - ms).toISOString(); if (field === 'saved') r.created = r.saved; s.put(r).onsuccess = () => { rq.result.close(); res(); }; }; }; }), { id, field, ms: days * 864e5 });
    // sprzątanie zdjęć rusza samo 15 s po otwarciu inspekcji (jak w telefonie) – czekamy na jego ślad, nie na zegar
    const waitRelease = async (id, done) => { for (let i = 0; i < 150; i++) { const p = await photo(id); if (done(p)) return p; await pg.waitForTimeout(200); } return photo(id); };
    const stage = id => pg.evaluate(id => { const a = JSON.parse(localStorage.getItem('oest.ppm.stage') || '{}'); return a[id] ? a[id].s : 'none'; }, id);
    const form = () => pg.evaluate(() => ({ photos: document.querySelectorAll('#photos img').length, fails: document.querySelectorAll('.ck-row.fail').length }));
    const notes = scope => pg.evaluate(s => window.OESTNotatki.list(s).then(a => a.length), scope);
    const open = async id => { await pg.goto(B + '/index.html#ppm'); await pg.waitForTimeout(300); await pg.goto(B + '/inspekcje/index.html#ppm=' + id); await pg.waitForFunction(() => window.OESTNotatki && window.OEST_clearInspection); await pg.waitForTimeout(2000); };
    const clear = async () => { await pg.locator('.kebab').first().click(); await pg.locator('.kmenu [data-k=clear]').click(); await pg.locator('.oest-ask [data-a=ok]').click(); await pg.waitForFunction(() => /Wyczyszczono|Cleared/.test(document.getElementById('formHint').textContent), null, { timeout: 10000 }); await pg.waitForTimeout(800); };
    const onList = id => pg.evaluate(id => [...document.querySelectorAll('[data-ppm],[data-id]')].some(e => (e.getAttribute('data-ppm') || e.getAttribute('data-id')) === id), id);
    const shot = async n => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await pg.screenshot({ path: path.join(SHOTS, n + '.png') }); } };

    await pg.goto(B + '/index.html#home'); await pg.waitForTimeout(800);
    await pg.evaluate(() => OESTSettings.update(s => { s.profile.companyEmail = 'work@firma.com'; return s; }));

    // ===== A. inspekcja wysłana =====
    await open(A);
    await pg.setInputFiles('#galIn', { name: 'a.jpg', mimeType: 'image/jpeg', buffer: JPG }); await pg.waitForTimeout(800);
    await pg.locator('.ck-row button[data-s="fail"]').first().click(); await pg.waitForTimeout(1200);
    let all = await kv(); const dk = Object.keys(all).find(k => k.startsWith('draft_') && all[k] && all[k].v === 1);
    check(!!dk, 'A: szkic zapisany');
    const zid = all[dk].photos && all[dk].photos[0] && all[dk].photos[0].zid;
    check(!!zid, 'A: zdjęcie w szkicu jako odnośnik do modułu zdjęć');
    await pg.evaluate(dk => window.OESTNotatki.put({ id: 'nA', scope: dk, at: Date.now(), pl: 'kran cieknie', en: 'tap is leaking', st: 'ok' }), dk);
    check(await notes(dk) === 1, 'A: notatka zapisana');
    await pg.locator('#toQueue').click(); await waitQ(0);
    const q = (await queue())[0];
    all = await kv();
    check(all[dk] && all[dk].photos.length === 1 && all[dk].states.includes('fail'), 'A: Wyślij nic nie skasował (szkic: zdjęcie + NIE)');
    check(await notes(dk) === 1, 'A: Wyślij nie ruszył notatek');
    // raport w archiwum jak po wysłaniu maila (moduł wysyłki: archive)
    await pg.goto(B + '/index.html#home'); await pg.waitForTimeout(600);
    await pg.evaluate(async ({ q }) => {
      const z = new PizZip(); z.file('word/document.xml', '<w:document><w:body><w:p><w:r><w:t>' + q.subject + '</w:t></w:r></w:p></w:body></w:document>');
      await window.OESTRaporty.save({ key: q.name, at: Date.now(), name: q.name, docx: z.generate({ type: 'uint8array' }), pdf: new Uint8Array(20), folder: q.rpt, meta: { ppm: q.ppm, type: q.type, code: q.code, sentAt: Date.now(), card: q.card }, snap: q.snap });
    }, { q });
    // Zakończ → Gotowa, potem zdjęcie znacznika (kolejność z zasady: najpierw zdjąć Gotowa, potem Wyczyść)
    await open(A);
    await pg.locator('#finishIns').click(); await pg.waitForTimeout(600);
    check(['done', 'queued', 'sent'].includes(await stage(A)), 'A: Zakończ = Gotowa (' + await stage(A) + ')');
    await pg.locator('#finishIns').click(); await pg.waitForTimeout(600);
    check(await stage(A) === 'prog', 'A: jedno dotknięcie zdejmuje Gotowa (' + await stage(A) + ')');
    check((await form()).photos === 1, 'A: zdjęcie Gotowa niczego nie skasowało');
    await clear();
    await shot('A-po-wyczysc-PL');
    all = await kv();
    check(!all[dk], 'A: Wyczyść usunął szkic');
    check(await notes(dk) === 0, 'A: Wyczyść usunął notatki');
    const fa = await form();
    check(fa.photos === 0 && fa.fails === 0, 'A: formularz pusty (' + JSON.stringify(fa) + ')');
    check(await stage(A) === 'none', 'A: klocek wraca do „Nie rozpoczęta” (' + await stage(A) + ')');
    const rep = (await pg.evaluate(() => window.OESTRaporty.list()))[0];
    check(rep && rep.versions === 1 && rep.snap && rep.snap.photos.length === 1, 'A: raport w archiwum bez zmian (z zapisem inspekcji)');
    let p = await photo(zid);
    check(p && p.blob && p.hold === 'inspekcja', 'A: zdjęcie zostaje w folderze OEST i jest trzymane (' + JSON.stringify(p) + ')');
    await pg.goto(B + '/index.html#ppm'); await pg.waitForTimeout(1200);
    check(await onList(A), 'A: inspekcja nadal na liście PPM');

    // zdjęcie zrobione 20 dni temu, inspekcja wyczyszczona dziś: trzymane jeszcze 30 dni od wyczyszczenia
    await agePhoto(zid, 'saved', 20);
    await open(A);
    p = await waitRelease(zid, x => x && (x.unused || x.hold !== 'inspekcja'));
    check(p.hold === 'inspekcja', 'A: zdjęcie sprzed 20 dni z wyczyszczonej dziś inspekcji NIE zwolnione od razu (' + JSON.stringify(p) + ')');
    check(!!p.unused && Date.now() - Date.parse(p.unused) < D, 'A: licznik 30 dni liczony od dziś (od wyczyszczenia)');
    // 29 dni po wyczyszczeniu: nadal trzymane
    await agePhoto(zid, 'unused', 29);
    await open(A); await pg.waitForTimeout(17000);
    p = await photo(zid);
    check(p.hold === 'inspekcja', 'A: 29 dni po wyczyszczeniu nadal trzymane (' + JSON.stringify(p) + ')');
    // 31 dni po wyczyszczeniu: zwolnione, ale zostaje w folderze OEST (tylko podlega limitowi)
    await agePhoto(zid, 'unused', 31);
    await open(A);
    p = await waitRelease(zid, x => x && x.hold !== 'inspekcja');
    const where = Object.entries(await kv()).filter(([, v]) => JSON.stringify(v || null).includes(zid)).map(([k]) => k);
    check(p.hold === '' && p.blob, '31 dni po wyczyszczeniu: zwolnione, plik nadal w folderze OEST (' + JSON.stringify(p) + ', w zapisach: ' + where.join(',') + ')');

    // odzyskanie wysłanej (Ustawienia → Raporty → podgląd → Odzyskaj do edycji)
    const stA = await stage(A);
    await pg.goto(B + '/index.html#settings/reports'); await pg.locator('#rptList .k2').first().waitFor();
    await pg.locator('#rptList .k2').first().click();
    await pg.locator('.oest-ask [data-a=rec]').click(); await pg.waitForURL(/inspekcje\/index\.html#rec=/); await pg.waitForTimeout(2500);
    const fr = await form();
    check(fr.fails === 1 && fr.photos === 1, 'A: odzyskana po wyczyszczeniu: NIE i zdjęcie wróciły (' + JSON.stringify(fr) + ')');
    check(!/Brakuje|Missing/.test(await pg.locator('#formHint').textContent()), 'A: odzyskana: bez „Brakuje zdjęć”');
    await shot('A-odzyskana-PL');
    check(await stage(A) === stA, 'A: odzyskanie nie rusza klocka na liście PPM (' + stA + ' → ' + await stage(A) + ')');

    // ===== B. inspekcja niewysłana =====
    await open(Bid);
    await pg.setInputFiles('#galIn', { name: 'b.jpg', mimeType: 'image/jpeg', buffer: JPG }); await pg.waitForTimeout(1500);
    all = await kv(); const dkB = Object.keys(all).find(k => k.startsWith('draft_') && k !== dk && all[k] && all[k].v === 1 && all[k].photos && all[k].photos.length);
    check(!!dkB, 'B: szkic zapisany');
    const zidB = dkB && all[dkB].photos[0].zid;
    await pg.evaluate(dk => window.OESTNotatki.put({ id: 'nB', scope: dk, at: Date.now(), pl: 'ok', en: 'ok', st: 'ok' }), dkB);
    // Gotowa + Wyczyść: Wyczyść nie zdejmuje znacznika (zdejmuje się jednym dotknięciem Gotowa)
    await pg.locator('#finishIns').click(); await pg.waitForTimeout(600);
    const sB = await stage(Bid);
    check(['done', 'queued', 'sent'].includes(sB), 'B: Gotowa (' + sB + ')');
    await pg.locator('#finishIns').click(); await pg.waitForTimeout(600);
    await clear();
    all = await kv();
    check(!all[dkB] && await notes(dkB) === 0, 'B: Wyczyść usunął szkic i notatki niewysłanej');
    check(await stage(Bid) === 'none', 'B: „Nie rozpoczęta” (' + await stage(Bid) + ')');
    p = await photo(zidB);
    check(p && p.blob && p.hold === 'inspekcja', 'B: zdjęcie niewysłanej zostaje w folderze OEST i jest trzymane (' + JSON.stringify(p) + ')');
    check(!(await queue()).some(x => x.ppm === Bid), 'B: Wyczyść niczego nie wysłał');
    await pg.goto(B + '/index.html#ppm'); await pg.waitForTimeout(1200);
    check(await onList(Bid), 'B: inspekcja nadal na liście PPM');

    check(!errors.length, 'błędy strony: ' + errors.join(' | '));
  } catch (e) { fails.push('przerwane: ' + (e && e.stack || e)); }
  finally { if (browser) await browser.close(); server.close(); }
  console.log('czyszczenie-ui-check: ' + passed + ' OK, ' + fails.length + ' błędów');
  fails.forEach(f => console.log('  ✗ ' + f));
  if (!fails.length) console.log('CZYSZCZENIE PASS: wysłana i niewysłana – Wyczyść usuwa szkic i notatki, klocek „Nie rozpoczęta”, inspekcja na liście, raport w archiwum, zdjęcie trzymane 30 dni od wyczyszczenia, odzyskanie z Raportów');
  process.exit(fails.length ? 1 : 0);
})();
