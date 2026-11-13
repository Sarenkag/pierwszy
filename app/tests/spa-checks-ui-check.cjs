// Weekly Spa Checks bez formularza (Grzegorz 13/11/2026): zamiast zdjęcia ręcznie wypełnionej kartki – lista potwierdzeń
// (Yes/No/N/A + 📷 + 📝, domyślnie Yes) i zdjęcia z plant roomów Spa. „Spa” = spa pool + plunge pool.
// Przycisk „Formularz” zostaje na zaś, ale zdjęcie formularza NIE jest wymagane. Raport po angielsku, basic form Smart, Word = PDF.
// Scenariusz jak u Grzegorza: EFA-INS-008 → lista włączona od razu, wszystko Yes → 2× „Zrób zdjęcie” → Wyślij (bez kartki)
// → PDF i Word z listą 9 punktów, podsumowaniem i 2 zdjęciami. Potem jeden punkt „No” → podsumowanie z Fault Log.
// Wynik NIE zastępuje sprawdzenia na Pixelu 8 Pro.
// Uruchomienie: node app/tests/spa-checks-ui-check.cjs (po npm run copy-web); OEST_SHOTS=katalog → zrzuty ekranu.
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const { chromium } = require(process.env.OEST_PLAYWRIGHT_PATH || 'playwright');
const { docxText, docxImages, pdfText, pdfImages, includesFlat } = require('./raport-tresc.cjs');
const root = path.resolve(__dirname, '../www');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const p = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(p, (e, b) => { if (e) { res.writeHead(404).end(); return; } res.setHeader('Content-Type', TYPES[path.extname(p)] || 'application/octet-stream'); res.end(b); });
});
const ID = 'EFA-INS-008', SHOTS = process.env.OEST_SHOTS || '';
const POINTS = ['Spa inspected (spa pool and plunge pool)', 'Spa regularly supervised', 'Water samples taken regularly', 'Spa plant rooms clean and tidy',
  'Pumps operating correctly', 'Filters operating correctly', 'Readings within normal range', 'Water clear', 'No issues observed'];
const OK = 'Spa checked – all items satisfactory, no issues observed';
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
    const shot = async n => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await pg.screenshot({ path: path.join(SHOTS, n + '.png'), fullPage: true }); } };
    const queuedFn = () => new Promise(res => { const rq = indexedDB.open('inspekcje', 1); rq.onsuccess = () => { try { const g = rq.result.transaction('queue').objectStore('queue').getAll(); g.onsuccess = () => { const all = g.result; if (!all.length) return res(null); const last = all[all.length - 1]; const b64 = u => { let s = ''; const a = new Uint8Array(u); for (let i = 0; i < a.length; i += 32768) s += String.fromCharCode.apply(null, a.subarray(i, i + 32768)); return btoa(s); }; res({ n: all.length, files: (last.files || []).map(f => ({ name: f.name, data: f.bytes ? b64(f.bytes) : '' })) }); }; } catch (e) { res(null); } }; rq.onerror = () => res(null); });
    const queued = () => pg.evaluate(queuedFn);
    const waitQueue = async n =>  { for (let i = 0; i < 150; i++) { const q = await queued(); if (q && q.n >= n) return q; await pg.waitForTimeout(200); } return null; };
    await pg.goto(B + '/index.html#home'); await pg.waitForFunction(() => window.OESTSettings);
    await pg.evaluate(() => OESTSettings.update(s => { s.profile.companyEmail = 'work@firma.com'; return s; })); // adresat raportu
    await pg.goto(B + '/inspekcje/index.html#ppm=' + ID); await pg.waitForFunction(() => document.getElementById('flOn') && document.getElementById('toQueue')); await pg.waitForTimeout(1500);

    // 1. ekran: lista potwierdzeń włączona od razu, 9 punktów, wszystkie Yes, formularz niewymagany
    const s0 = await pg.evaluate(() => ({ on: document.getElementById('flOn').checked, rows: [...document.querySelectorAll('#flList .fl-row .txt')].map(e => e.textContent),
      yes: document.querySelectorAll('#flList button[data-s="yes"].on').length, lbl: document.getElementById('flOnL').textContent, hint: document.getElementById('flHint').textContent,
      send: document.getElementById('toQueue').textContent.trim(), shCam: !!document.getElementById('shCamIn') }));
    await shot('1-start');
    check(s0.on, 'lista potwierdzeń włączona od razu');
    check(JSON.stringify(s0.rows) === JSON.stringify(POINTS), 'punkty jak uzgodnione (' + JSON.stringify(s0.rows) + ')');
    check(s0.yes === POINTS.length, 'wszystkie punkty domyślnie Yes (' + s0.yes + ')');
    check(/Lista sprawdzeń/.test(s0.lbl) && !/klap|call point/i.test(s0.hint + s0.lbl), 'teksty ekranu dla Spa, nie AOV (' + s0.lbl + ' | ' + s0.hint + ')');
    check(/^Wyślij/.test(s0.send), 'bez kartki przycisk to „Wyślij”, nie „Dodaj zdjęcie formularza” (' + s0.send + ')');
    check(s0.shCam, 'przycisk „Formularz” zostaje (na zaś)');

    // 2. dwa zdjęcia z plant roomu → Wyślij → PDF + Word
    const jpeg = (w, h, kolor) => pg.evaluate(([w, h, kolor]) => new Promise(res => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.fillStyle = kolor; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.fillRect(w / 3, h / 3, w / 3, h / 3);
      c.toBlob(b => { const fr = new FileReader(); fr.onload = () => res(fr.result.split(',')[1]); fr.readAsDataURL(b); }, 'image/jpeg', 0.8); }), [w, h, kolor]).then(b => Buffer.from(b, 'base64'));
    for (const [i, k] of [['0', '#3a7'], ['1', '#37a']]) { await pg.setInputFiles('#camIn', { name: 'plant' + i + '.jpg', mimeType: 'image/jpeg', buffer: await jpeg(1600, 1200, k) }); await pg.waitForFunction(n => document.querySelectorAll('#photos img').length === n, +i + 1, { timeout: 15000 }); }
    await pg.waitForTimeout(800); await shot('2-zdjecia');
    await pg.click('#toQueue');
    const q1 = await waitQueue(1);
    check(!!q1, 'Wyślij bez zdjęcia formularza dodało raport do kolejki');
    const files = q1 ? q1.files : [], pdfF = files.find(f => f.name.endsWith('.pdf')), docF = files.find(f => f.name.endsWith('.docx'));
    check(!!pdfF && !!docF, 'raport w Word i PDF (' + files.map(f => f.name).join(', ') + ')');
    if (pdfF && docF) {
      const P = pdfText(Buffer.from(pdfF.data, 'base64')), W = docxText(Buffer.from(docF.data, 'base64'));
      for (const [n, T] of [['PDF', P], ['Word', W]]) {
        check(POINTS.every(p => includesFlat(T, p + ': Yes')), n + ': wszystkie 9 punktów z „Yes”');
        check(includesFlat(T, OK), n + ': podsumowanie „' + OK + '”');
        check(includesFlat(T, 'Weekly Spa Checks'), n + ': tytuł Weekly Spa Checks');
      }
      check(pdfImages(Buffer.from(pdfF.data, 'base64')) >= 2, 'PDF: zdjęcia z plant roomu w raporcie');
      check(docxImages(Buffer.from(docF.data, 'base64')) >= 2, 'Word: zdjęcia z plant roomu w raporcie');
      if (SHOTS) { fs.writeFileSync(path.join(SHOTS, 'raport.pdf'), Buffer.from(pdfF.data, 'base64')); fs.writeFileSync(path.join(SHOTS, 'raport.docx'), Buffer.from(docF.data, 'base64')); }
    }

    // 3. jeden punkt „No” (nowa inspekcja w czystym telefonie) → podsumowanie z wpisem do Fault and Remedial Actions Log
    const ctx2 = await browser.newContext({ viewport: { width: 412, height: 915 }, serviceWorkers: 'block' });
    await ctx2.addInitScript(() => { if (!localStorage.getItem('oest.account')) localStorage.setItem('oest.account', JSON.stringify({ provider: 'local', id: 't', email: 'demo@example.com', first: 'Greg', last: 'Sarna' })); });
    const pg2 = await ctx2.newPage(); pg2.on('pageerror', e => errors.push(e.message));
    await pg2.goto(B + '/index.html#home'); await pg2.waitForFunction(() => window.OESTSettings);
    await pg2.evaluate(() => OESTSettings.update(s => { s.profile.companyEmail = 'work@firma.com'; return s; }));
    await pg2.goto(B + '/inspekcje/index.html#ppm=' + ID); await pg2.waitForFunction(() => document.querySelector('#flList button[data-fl="7"][data-s="no"]')); await pg2.waitForTimeout(1000);
    await pg2.click('#flList button[data-fl="7"][data-s="no"]'); await pg2.waitForTimeout(300);
    await pg2.click('#toQueue');
    let W2 = '';
    for (let i = 0; i < 150 && !W2; i++) { const q = await pg2.evaluate(queuedFn), f2 = q ? q.files.find(f => f.name.endsWith('.docx')) : null; W2 = f2 ? docxText(Buffer.from(f2.data, 'base64')) : ''; if (!W2) await pg2.waitForTimeout(200); }
    await ctx2.close();
    check(includesFlat(W2, 'Water clear: No') && includesFlat(W2, '1 check(s) not satisfactory – record in the Fault and Remedial Actions Log') && /Requires attention/.test(W2), 'punkt „No”: raport mówi o Fault Log i Requires attention');

    check(!errors.length, 'błędy strony: ' + errors.join(' | '));
  } catch (e) { fails.push('przerwane: ' + (e && e.stack || e)); }
  finally { if (browser) await browser.close(); server.close(); }
  console.log('spa-checks-ui-check: ' + passed + ' OK, ' + fails.length + ' błędów');
  fails.forEach(f => console.log('  ✗ ' + f));
  if (!fails.length) console.log('SPA-CHECKS PASS: Weekly Spa Checks – lista 9 potwierdzeń (domyślnie Yes), bez wymaganego zdjęcia formularza, raport Word i PDF z listą, podsumowaniem i zdjęciami');
  process.exit(fails.length ? 1 : 0);
})();
