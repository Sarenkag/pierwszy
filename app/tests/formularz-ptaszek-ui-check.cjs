// Fałszywy ptaszek formularza (Grzegorz 12/11/2026): w Weekly Fire Alarm Test zdjęcie call pointu zrobione przyciskiem
// „Zrób zdjęcie” zapalało zielony ✓ przy przycisku „Formularz”, jakby formularz był dodany.
// Zasada: ✓ formularza (przycisk „Formularz”, napis przy „Zdjęcie formularza”, licznik na klocku listy) = TYLKO zdjęcia
// z przycisku „Formularz”. Zdjęcie z „Zrób zdjęcie” to zwykłe zdjęcie.
// Scenariusz jak u Grzegorza: EFA-INS-025 Weekly Fire Alarm Test (TB) → Zrób zdjęcie (call point) → brak ✓, przycisk
// na dole dalej „Dodaj zdjęcie formularza” → Formularz → Zrób zdjęcie → ✓ zielony, „Wyślij”.
// Raport tej inspekcji (Grzegorz 12/11/2026, ta sama rozmowa): formularz ZAWSZE pierwszy, choć call point zrobiony wcześniej;
// poziome zdjęcie formularza = pozioma pierwsza strona (PDF i Word); zdjęcia małe, 4 w rzędzie, rząd wyśrodkowany od góry strony.
// Wynik NIE zastępuje sprawdzenia na Pixelu 8 Pro.
// Uruchomienie: node app/tests/formularz-ptaszek-ui-check.cjs (po npm run copy-web); OEST_SHOTS=katalog → zrzuty ekranu.
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const { chromium } = require(process.env.OEST_PLAYWRIGHT_PATH || 'playwright');
const root = path.resolve(__dirname, '../www');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const p = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(p, (e, b) => { if (e) { res.writeHead(404).end(); return; } res.setHeader('Content-Type', TYPES[path.extname(p)] || 'application/octet-stream'); res.end(b); });
});
const ID = 'EFA-INS-025', SHOTS = process.env.OEST_SHOTS || '';
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
    const shot = async n => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await pg.screenshot({ path: path.join(SHOTS, n + '.png') }); } };
    const state = () => pg.evaluate(id => {
      const fb = document.getElementById('shCamIn').closest('label').querySelector('.fbadge .oest-rp'), ss = document.querySelector('#sheetState .oest-rp');
      const cls = el => el ? ['ok', 'blad', 'brak'].find(c => el.classList.contains(c)) : '';
      const st = JSON.parse(localStorage.getItem('oest.ppm.stage') || '{}')[id] || {};
      return { badge: cls(fb), label: cls(ss), photos: document.querySelectorAll('#photos img').length, sheets: document.querySelectorAll('#sheetPhotos img').length,
        send: document.getElementById('toQueue').textContent.trim(), stSheet: st.sheet, stPhotos: st.photos };
    }, ID);
    await pg.goto(B + '/index.html#home'); await pg.waitForFunction(() => window.OESTSettings);
    await pg.evaluate(() => OESTSettings.update(s => { s.profile.companyEmail = 'work@firma.com'; return s; })); // adresat raportu (bez Gmaila raport czeka w kolejce)
    await pg.goto(B + '/index.html#ppm'); await pg.waitForTimeout(300);
    await pg.goto(B + '/inspekcje/index.html#ppm=' + ID); await pg.waitForFunction(() => window.OESTZnacznik && document.getElementById('shCamIn')); await pg.waitForTimeout(2000);
    const s0 = await state();
    check(s0.badge !== 'ok', 'na starcie brak ✓ formularza (' + JSON.stringify(s0) + ')');

    // pionowe zdjęcie jak z telefonu (call point) i poziome zdjęcie kartki formularza do call pointów
    const jpeg = (w, h, kolor) => pg.evaluate(([w, h, kolor]) => new Promise(res => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.fillStyle = kolor; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.fillRect(w / 3, h / 3, w / 3, h / 3);
      c.toBlob(b => { const fr = new FileReader(); fr.onload = () => res(fr.result.split(',')[1]); fr.readAsDataURL(b); }, 'image/jpeg', 0.8); }), [w, h, kolor]).then(b => Buffer.from(b, 'base64'));
    const PION = await jpeg(900, 1200, '#c33'), KARTKA = await jpeg(1600, 1131, '#36c');
    // 1. „Zrób zdjęcie” – zdjęcie call pointu
    await pg.setInputFiles('#camIn', { name: 'call-point.jpg', mimeType: 'image/jpeg', buffer: PION });
    await pg.waitForFunction(() => document.querySelectorAll('#photos img').length === 1, null, { timeout: 15000 }); await pg.waitForTimeout(800);
    const s1 = await state(); await shot('1-po-zdjeciu-call-pointu');
    check(s1.photos === 1 && s1.sheets === 0, 'zdjęcie call pointu w zdjęciach, nie w formularzu (' + JSON.stringify(s1) + ')');
    check(s1.badge !== 'ok', 'po zdjęciu call pointu przycisk „Formularz” BEZ zielonego ✓ (' + s1.badge + ')');
    check(s1.label !== 'ok', 'po zdjęciu call pointu napis „Zdjęcie formularza” BEZ ✓ (' + s1.label + ')');
    check(/formularza|form photo/i.test(s1.send), 'przycisk na dole dalej prosi o zdjęcie formularza („' + s1.send + '”)');
    check(!s1.stSheet, 'klocek na liście: formularz 0 (' + s1.stSheet + ')');
    check(s1.stPhotos === 1, 'klocek na liście: 1 zdjęcie (' + s1.stPhotos + ')');

    // 2. „Formularz” → zdjęcie kartki
    await pg.setInputFiles('#shCamIn', { name: 'formularz.jpg', mimeType: 'image/jpeg', buffer: KARTKA });
    await pg.waitForFunction(() => document.querySelectorAll('#sheetPhotos img').length === 1, null, { timeout: 15000 }); await pg.waitForTimeout(800);
    const s2 = await state(); await shot('2-po-zdjeciu-formularza');
    check(s2.badge === 'ok' && s2.label === 'ok', 'po zdjęciu formularza zielony ✓ (' + JSON.stringify(s2) + ')');
    check(/Wyślij|Send/.test(s2.send), 'po zdjęciu formularza przycisk „Wyślij” („' + s2.send + '”)');
    check(s2.stSheet === 1 && s2.stPhotos === 1, 'klocek na liście: formularz 1, zdjęcia 1 (' + s2.stSheet + '/' + s2.stPhotos + ')');

    // 3. usunięcie zdjęcia formularza → ✓ znika, choć zdjęcie call pointu zostaje
    await pg.locator('#sheetPhotos .thumb button[aria-label]').first().click(); await pg.waitForTimeout(800);
    const s3 = await state();
    check(s3.badge !== 'ok' && s3.photos === 1, 'po usunięciu kartki ✓ znika, call point zostaje (' + JSON.stringify(s3) + ')');

    // 4. raport: kartka z powrotem + 4 kolejne zdjęcia (razem 5 małych) → Wyślij → PDF i Word z kolejki
    await pg.setInputFiles('#shGalIn', { name: 'formularz.jpg', mimeType: 'image/jpeg', buffer: KARTKA });
    await pg.waitForFunction(() => document.querySelectorAll('#sheetPhotos img').length === 1, null, { timeout: 15000 });
    for (let i = 0; i < 4; i++) { await pg.setInputFiles('#camIn', { name: 'z' + i + '.jpg', mimeType: 'image/jpeg', buffer: PION }); await pg.waitForFunction(n => document.querySelectorAll('#photos img').length === n, i + 2, { timeout: 15000 }); }
    await pg.waitForTimeout(800); await shot('3-przed-wyslij');
    await pg.click('#toQueue');
    let files = null;
    for (let i = 0; i < 150 && !files; i++) {
      files = await pg.evaluate(() => new Promise(res => { const rq = indexedDB.open('inspekcje', 1); rq.onsuccess = () => { try { const g = rq.result.transaction('queue').objectStore('queue').getAll(); g.onsuccess = () => { const last = g.result[g.result.length - 1]; if (!last) return res(null); const b64 = u => { let s = ''; const a = new Uint8Array(u); for (let i = 0; i < a.length; i += 32768) s += String.fromCharCode.apply(null, a.subarray(i, i + 32768)); return btoa(s); }; res((last.files || []).map(f => ({ name: f.name, data: f.bytes ? b64(f.bytes) : '' }))); }; } catch (e) { res(null); } }; rq.onerror = () => res(null); }));
      if (!files) await pg.waitForTimeout(200);
    }
    check(!!files, 'Wyślij dodało raport do kolejki');
    const pdfF = (files || []).find(f => f.name.endsWith('.pdf')), docF = (files || []).find(f => f.name.endsWith('.docx'));
    check(!!pdfF && !!docF, 'raport w Word i PDF (' + (files || []).map(f => f.name).join(', ') + ')');
    if (pdfF) {
      const pdf = Buffer.from(pdfF.data, 'base64').toString('latin1');
      const boxes = [...pdf.matchAll(/\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/g)].map(m => +m[1] > +m[2] ? 'L' : 'P');
      check(boxes.join('') === 'LP', 'PDF: strona 1 pozioma (formularz), strona 2 pionowa z 5 małymi zdjęciami (' + boxes.join('') + ')');
      if (SHOTS) fs.writeFileSync(path.join(SHOTS, 'raport.pdf'), Buffer.from(pdfF.data, 'base64'));
    }
    if (docF) {
      const PizZip = require(path.resolve(__dirname, '../node_modules/pizzip')), x = new PizZip(Buffer.from(docF.data, 'base64')).file('word/document.xml').asText();
      const sects = [...x.matchAll(/<w:sectPr>[\s\S]*?<\/w:sectPr>/g)].map(m => /landscape/.test(m[0]) ? 'L' : 'P');
      const paras = x.split('</w:p>').map(p => (p.match(/<w:drawing>/g) || []).length).filter(n => n);
      check(sects.join('') === 'LP', 'Word: sekcja 1 pozioma (formularz), potem pionowa (' + sects.join('') + ')');
      check(paras.join(',') === '1,4,1', 'Word: formularz, rząd 4 zdjęć, rząd 1 zdjęcia (' + paras.join(',') + ')');
      if (SHOTS) fs.writeFileSync(path.join(SHOTS, 'raport.docx'), Buffer.from(docF.data, 'base64'));
    }

    check(!errors.length, 'błędy strony: ' + errors.join(' | '));
  } catch (e) { fails.push('przerwane: ' + (e && e.stack || e)); }
  finally { if (browser) await browser.close(); server.close(); }
  console.log('formularz-ptaszek-ui-check: ' + passed + ' OK, ' + fails.length + ' błędów');
  fails.forEach(f => console.log('  ✗ ' + f));
  if (!fails.length) console.log('FORMULARZ-PTASZEK PASS: zdjęcie z „Zrób zdjęcie” nie zapala ✓ formularza; ✓ tylko po zdjęciu z „Formularz”; raport: formularz pierwszy, poziomy na poziomej stronie, zdjęcia małe po 4 w rzędzie');
  process.exit(fails.length ? 1 : 0);
})();
