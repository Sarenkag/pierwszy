// Weekly Generator Check (Grzegorz 21/11/2026): własna inspekcja OEST, nie ma jej w Vantify – stały klocek uruchamiany ręcznie.
// Jak AOV: zdjęcie ręcznie wypełnionego formularza (standard, wymagane), dowolne zdjęcia i nasz formularz (jeden generator, 12 punktów (TP-025 + rozruch + L1–L3 + Hz + RPM; powrót do AUTO i test off-load w stałym zdaniu), domyślnie Yes) w basic form.
// Scenariusz: gen-weekly → lista włączona od razu → bez kartki przycisk prosi o zdjęcie formularza → kartka + 1 zdjęcie + odczyt paliwa w 📝
// → Wyślij → PDF i Word z listą jeden generator, 12 punktów (TP-025 + rozruch + L1–L3 + Hz + RPM; powrót do AUTO i test off-load w stałym zdaniu), odczytem, podsumowaniem, zdjęciem kartki i zdjęciem ogólnym. Nie zastępuje sprawdzenia na Pixelu 8 Pro.
// Uruchomienie: node app/tests/generator-ui-check.cjs (po npm run copy-web); OEST_SHOTS=katalog → zrzuty ekranu.
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const { chromium } = require('./przegladarka.cjs');
const { docxText, docxImages, pdfText, pdfImages, includesFlat } = require('./raport-tresc.cjs');
const root = path.resolve(__dirname, '../www');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const p = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(p, (e, b) => { if (e) { res.writeHead(404).end(); return; } res.setHeader('Content-Type', TYPES[path.extname(p)] || 'application/octet-stream'); res.end(b); });
});
const ID = 'gen-weekly', SHOTS = process.env.OEST_SHOTS || '';
const POINTS = ['Fuel level (% / litres)', 'Oil level', 'Coolant level', 'Water level', 'No leaks', 'Control panel – available to start in AUTO', 'Start-up carried out – engine running smoothly and stable', 'L1 voltage (V)', 'L2 voltage (V)', 'L3 voltage (V)', 'Frequency (Hz)', 'Engine speed (RPM)'];
const OK = 'All generator checks acceptable – generator returned to AUTO', STMT = 'All checks acceptable, generator running smoothly. Everything secured and area left clean. Generator returned to AUTO.';
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

    const s0 = await pg.evaluate(() => ({ on: document.getElementById('flOn').checked, rows: [...document.querySelectorAll('#flList .fl-row .txt')].map(e => e.textContent),
      yes: document.querySelectorAll('#flList button[data-s="yes"].on').length, hint: document.getElementById('flHint').textContent,
      send: document.getElementById('toQueue').textContent.trim(), shCam: !!document.getElementById('shCamIn') }));
    await shot('1-start');
    check(s0.on, 'nasz formularz (lista) włączony od razu');
    check(JSON.stringify(s0.rows) === JSON.stringify(POINTS.map(p => p)), 'punkty jak w propozycji (' + JSON.stringify(s0.rows) + ')');
    check(s0.yes === POINTS.length, 'wszystkie punkty domyślnie Yes (' + s0.yes + ')');
    check(/kartki/.test(s0.hint) && !/Spa|klap|call point/i.test(s0.hint), 'podpowiedź dla generatora (' + s0.hint + ')');
    const odcz = await pg.evaluate(() => [...document.querySelectorAll('#flList input.fl-note')].map(e => +e.getAttribute('data-fln')));
    const dom = await pg.evaluate(() => [7, 8, 9, 10, 11].map(i => document.querySelector('#flList input[data-fln="' + i + '"]').value));
    check(JSON.stringify(dom) === JSON.stringify(['250', '250', '250', '50', '1500']), 'L1–L3 250 V, 50 Hz, 1500 RPM wpisane od razu (' + dom + ')');
    check(JSON.stringify(odcz) === JSON.stringify([0, 7, 8, 9, 10, 11]), 'pola odczytów (paliwo, L1–L3, Hz, RPM) otwarte od razu (' + odcz + ')');
    check(s0.shCam, 'przycisk „Formularz” jest');
    const nd = await pg.evaluate(id => { const P = window.OEST_PPM; return P && P.needs ? P.needs(P.byId(id)) : null; }, ID);
    check(!!nd && nd.f === true && nd.q === true, 'zdjęcie formularza wymagane (jak AOV) i nasz raport włączony od razu (' + JSON.stringify(nd) + ')');

    const jpeg = (w, h, kolor) => pg.evaluate(([w, h, kolor]) => new Promise(res => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.fillStyle = kolor; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.fillRect(w / 3, h / 3, w / 3, h / 3);
      c.toBlob(b => { const fr = new FileReader(); fr.onload = () => res(fr.result.split(',')[1]); fr.readAsDataURL(b); }, 'image/jpeg', 0.8); }), [w, h, kolor]).then(b => Buffer.from(b, 'base64'));
    await pg.setInputFiles('#shCamIn', { name: 'kartka.jpg', mimeType: 'image/jpeg', buffer: await jpeg(1200, 1600, '#ddd') });
    await pg.waitForFunction(() => document.querySelectorAll('#sheetPhotos img').length === 1, null, { timeout: 15000 });
    await pg.setInputFiles('#camIn', { name: 'gen.jpg', mimeType: 'image/jpeg', buffer: await jpeg(1600, 1200, '#3a7') });
    await pg.waitForFunction(() => document.querySelectorAll('#photos img').length === 1, null, { timeout: 15000 });
    // odczyty z panelu DSE 7320 (zdjęcia Grzegorza 21/11/2026): paliwo 29% / 229 l, L1–L3 251 V, 1500 RPM
    for (const [i, v] of [[0, '29% / 229 l'], [7, '251'], [8, '251'], [9, '251']]) await pg.fill('#flList input[data-fln="' + i + '"]', v); await pg.waitForTimeout(500);
    await shot('2-gotowe');
    // „Open Vantify” na formularzu klocka (Grzegorz 21/11/2026 16:31): ta sama ścieżka co Reactive; wtyczka Vantify podstawiona (bez prawdziwego zlecenia)
    const vb = await pg.evaluate(() => { const b = document.getElementById('vtBtn'); return { on: !b.hidden, t: b.textContent.trim() }; });
    check(vb.on && vb.t === 'Open Vantify', 'na formularzu przycisk „Open Vantify” (' + JSON.stringify(vb) + ')');
    await pg.evaluate(() => { window.__vt = []; const C0 = window.__capOrig = window.Capacitor; window.Capacitor = { isNativePlatform: () => true, Plugins: C0 && C0.Plugins, isPluginAvailable: C0 && C0.isPluginAvailable, registerPlugin: n => n !== 'Vantify' && C0 && C0.registerPlugin ? C0.registerPlugin(n) : ({ wzory: async () => ({ create: true }),
      action: async ({ action: a }) => { window.__vt.push(a); return a.op === 'priorities' ? { status: 'ok', list: [] } : a.op === 'create' ? { status: 'ok', id: 999001, job: { status: 'approval_pending', summary: a.summary }, hrefs: a.files.map((f, i) => 'h' + i), seenHrefs: a.files.map((f, i) => 'h' + i) } : { status: 'ok', jobs: [] }; } }) }; });
    await pg.click('#vtBtn');
    await pg.waitForSelector('.oest-ask button[data-a="ok"]', { timeout: 30000 });
    const okno = await pg.evaluate(() => ({ sum: (document.querySelector('.oest-ask .rx-vt-sum') || {}).value || '', desc: (document.querySelector('.oest-ask .rx-vt-desc') || {}).value || '' }));
    check(/^Generator Checks – Weekly \d\d\/\d\d\/\d{4}$/.test(okno.sum), 'Vantify: Summary do poprawy przed wysłaniem (' + okno.sum + ')');
    check(okno.desc.includes('Generator – Serial 667449') && okno.desc.includes('L1 voltage (V): Yes – 251') && okno.desc.includes(STMT), 'Vantify: Description = generator, punkty z odczytami, zdanie (' + okno.desc + ')');
    await pg.click('.oest-ask button[data-a="ok"]');
    await pg.waitForFunction(() => window.__vt.some(a => a.op === 'create'), null, { timeout: 30000 });
    await pg.waitForFunction(() => /✓ Vantify #999001/.test(document.getElementById('vtBtn').textContent), null, { timeout: 15000 }).catch(() => {});
    const vt = await pg.evaluate(() => { const a = window.__vt.find(x => x.op === 'create'); return { files: a.files.map(f => f.title + '|' + f.type + '|' + (f.b64 || '').length), btn: document.getElementById('vtBtn').textContent.trim() }; });
    check(vt.files.length === 3 && /^Generator check form 1\|image\/jpeg\|\d{3,}/.test(vt.files[0]) && /\|application\/pdf\|\d{3,}/.test(vt.files[1]) && /^Photo 1\|image\/jpeg\|\d{3,}/.test(vt.files[2]), 'Vantify: zdjęcie kartki, Basic form PDF, zdjęcie (' + vt.files.join(', ') + ')');
    check(vt.btn === '✓ Vantify #999001', 'Vantify: po założeniu „✓ Vantify #nr” (' + vt.btn + ')');
    await pg.evaluate(() => Promise.all([...document.querySelectorAll('ion-alert')].map(a => a.dismiss())).then(() => { document.querySelectorAll('.oest-ask').forEach(e => e.remove()); window.Capacitor = window.__capOrig; })); /* wynik zakładania Vantify: ion-alert (OESTOkna) */ // wtyczka LibreOffice z przeglądarki testów zostaje
    const send = await pg.evaluate(() => document.getElementById('toQueue').textContent.trim());
    check(/^Wyślij/.test(send), 'po zdjęciu kartki przycisk to „Wyślij” (' + send + ')');
    await pg.click('#toQueue');
    const q1 = await waitQueue(1);
    check(!!q1, 'raport w kolejce');
    const files = q1 ? q1.files : [], pdfF = files.find(f => f.name.endsWith('.pdf')), docF = files.find(f => f.name.endsWith('.docx'));
    check(!!pdfF && !!docF, 'raport w Word i PDF (' + files.map(f => f.name).join(', ') + ')');
    if (pdfF && docF) {
      const P = pdfText(Buffer.from(pdfF.data, 'base64')), W = docxText(Buffer.from(docF.data, 'base64'));
      for (const [n, T] of [['PDF', P], ['Word', W]]) {
        check(POINTS.every(p => includesFlat(T, p)), n + ': wszystkie 12 punktów');
        check(includesFlat(T, 'Fuel level (% / litres) – 29% / 229 l') && includesFlat(T, 'L1 voltage (V) – 251') && includesFlat(T, 'Engine speed (RPM) – 1500') && includesFlat(T, 'Frequency (Hz) – 50'), n + ': odczyty przy punktach');
        check(includesFlat(T, 'Generator – Serial 667449 · Make / Model 5KJDD585ASB') && includesFlat(T, 'VISUAL CHECK') && includesFlat(T, 'OFF-LOAD TEST') && !/GENERATOR [12]/.test(T), n + ': linia generatora nad dwiema grupami (Visual check, Off-load test), jeden generator bez numeru');
        check(includesFlat(T, STMT), n + ': zdanie pod grupami');
        check(includesFlat(T, 'Generator Checks – Weekly'), n + ': tytuł Generator Checks – Weekly');
      }
      check(pdfImages(Buffer.from(pdfF.data, 'base64')) >= 2, 'PDF: zdjęcie kartki i zdjęcie ogólne');
      check(docxImages(Buffer.from(docF.data, 'base64')) >= 2, 'Word: zdjęcie kartki i zdjęcie ogólne');
      if (SHOTS) { fs.writeFileSync(path.join(SHOTS, 'raport.pdf'), Buffer.from(pdfF.data, 'base64')); fs.writeFileSync(path.join(SHOTS, 'raport.docx'), Buffer.from(docF.data, 'base64')); }
    }
    check(!errors.length, 'błędy strony: ' + errors.join(' | '));

  } catch (e) { fails.push('przerwane: ' + (e && e.stack || e)); }
  finally { if (browser) await browser.close(); server.close(); }
  console.log('generator-ui-check: ' + passed + ' OK, ' + fails.length + ' błędów');
  fails.forEach(f => console.log('  ✗ ' + f));
  if (!fails.length) console.log('GENERATOR PASS: Generator Checks – Weekly (TP-025) – kartka wymagana, jeden generator, 12 punktów (TP-025 + rozruch + L1–L3 + Hz + RPM; powrót do AUTO i test off-load w stałym zdaniu), odczyt w notatce, raport Word i PDF');
  process.exit(fails.length ? 1 : 0);
})();
