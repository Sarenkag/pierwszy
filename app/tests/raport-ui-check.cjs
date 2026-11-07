// ZASADA (Grzegorz, 04/11/2026; PROD-023): każdy raport idzie w dwóch wersjach, Word i PDF, z tego samego wzoru (basic form / formularz firmy).
// Ten test otwiera KAŻDĄ inspekcję EFA-INS z faktycznej listy PPM (window.OEST_PPM.tasks z app/www/ppm.js, nie komentarze w kodzie),
// wypełnia ją jak użytkownik, naciska Wyślij z domyślnymi ustawieniami ⚙ i sprawdza, że w kolejce jest i PDF, i Word, i że pliki da się otworzyć.
// Brak formularza / przycisku Wyślij albo inspekcja, której test nie umie wypełnić = FAIL (QG-002: pominięcie scenariusza nie jest sukcesem).
// EFA-INS-024 (Water Temperature Checks TB): 22 wymagane pomiary, treść Word i PDF sprawdzana wartość po wartości.
// Flushing: formularz firmy + basic form w Wordzie. Uruchamiany w Quality Gate (G2) przed budową APK.
// Szybkość (Grzegorz 07/11/2026, „Tak, przyspiesz”): zamiast stałego czekania test czeka na konkretny stan (formularz gotowy,
// raport z PDF i Word w kolejce). Limit dla raportu zostaje taki jak był: 3,5 s od „Wyślij”, inaczej FAIL jak dotąd.
// Inspekcje idą po kilka naraz (OEST_RAPORT_NARAZ, domyślnie 4), każda w osobnym kontekście przeglądarki = osobne dane, jak dotąd.
const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), assert = require('node:assert/strict');
const { chromium } = require(process.env.OEST_PLAYWRIGHT_PATH || 'playwright'), root = path.resolve(__dirname, '../www');
const { inspections, tasks } = require('./ppm-lista.cjs'), { docxText, docxImages, pdfText, pdfPages, pdfImages, includesFlat } = require('./raport-tresc.cjs');
const JPG = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64');
const server = http.createServer((req, res) => {
  const p = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(p, (e, b) => { if (e) { res.writeHead(404).end(); return; } res.setHeader('Content-Type', p.endsWith('.js') ? 'text/javascript' : p.endsWith('.css') ? 'text/css' : 'text/html; charset=utf-8'); res.end(b); });
});
const ids = inspections(root), PPM = tasks(root);
// Pomiar o wartości w zakresie dla rodzaju wylotu (hot > 50°C, cold < 20°C, TMV 38–43°C); każda wartość inna, żeby sprawdzić kolejność w raporcie.
const NARAZ = Math.max(1, +(process.env.OEST_RAPORT_NARAZ || 4)), RAPORT_MS = 3500; // RAPORT_MS = dawne stałe czekanie po „Wyślij”, teraz górny limit
// raport w kolejce: ostatni wpis ma i PDF, i Word (ten sam odczyt IndexedDB co niżej)
const queued = () => new Promise(res => { const rq = indexedDB.open('inspekcje', 1); rq.onsuccess = () => { try { const g = rq.result.transaction('queue').objectStore('queue').getAll(); g.onsuccess = () => { const l = g.result[g.result.length - 1]; res(!!(l && (l.files || []).some(f => /\.pdf$/.test(f.name)) && (l.files || []).some(f => /\.docx$/.test(f.name)))); }; g.onerror = () => res(false); } catch (e) { res(false); } }; rq.onerror = () => res(false); });
const reading = (kind, i) => kind === 'hot' ? String(51.5 + i) : kind === 'cold' ? String(2 + i * 0.5) : String(39 + i / 10);
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r)); let browser, checked = 0; const bad = [], done = [], content = [], czasy = [];
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.OEST_BROWSER_PATH ? { executablePath: process.env.OEST_BROWSER_PATH } : {}) });
    const one = async id => {
      const ctx = await browser.newContext({ viewport: { width: 412, height: 900 }, serviceWorkers: 'block' }), pg = await ctx.newPage(), errs = [];
      pg.on('pageerror', e => errs.push(e.message));
      await ctx.addInitScript(() => { localStorage.setItem('oest.account', JSON.stringify({ provider: 'local', id: 't', email: 'demo@example.com', first: 'Greg', last: 'Sarna' })); localStorage.setItem('insp.cfg', JSON.stringify({ insp: 'G. Sarna', email: 'demo@example.com' })); });
      await pg.goto('http://127.0.0.1:' + server.address().port + '/inspekcje/index.html#ppm=' + id); await pg.waitForLoadState('networkidle'); await pg.locator('#toQueue').waitFor({ state: 'visible', timeout: 1500 }).catch(() => {});
      if (!(await pg.locator('#toQueue').isVisible().catch(() => false))) { bad.push(id + ': brak formularza z przyciskiem Wyślij dla inspekcji z listy PPM' + (errs.length ? ' (' + errs.join(' | ') + ')' : '')); await ctx.close(); return; }
      const flush = await pg.locator('[data-flcam]').count(), temps = await pg.locator('#tempList input[data-t]').count();
      if (await pg.locator('#sendCfg').isVisible().catch(() => false)) { await pg.click('#sendCfg'); await pg.waitForTimeout(300); const q = pg.locator('[data-sn="q"]:not([disabled])'); if (await q.count()) await q.check(); await pg.click('.oest-ask [data-a="ok"]'); await pg.waitForTimeout(300); }
      if (await pg.locator('#flWeek [data-w="1"]').isVisible().catch(() => false)) await pg.click('#flWeek [data-w="1"]');
      let expectTemps = null;
      if (temps) {
        // formularz pomiarów: wszystkie pola jak na kartce firmy (EFA-INS-024: 22 wyloty)
        const slots = (PPM.find(t => t.id === id) || {}).form ? await pg.evaluate(f => (window.OEST_PPM.forms[f] || {}).slots || [], PPM.find(t => t.id === id).form) : [];
        if (slots.length !== temps) bad.push(id + ': formularz ma ' + temps + ' pól, a wzór ' + slots.length + ' wylotów');
        expectTemps = slots.map((s, i) => ({ name: s[0], kind: s[1], value: reading(s[1], i) }));
        for (let i = 0; i < temps; i++) await pg.locator('#tempList input[data-t="' + i + '"]').fill(expectTemps[i] ? expectTemps[i].value : '20');
        const hint = await pg.locator('#formHint').textContent();
        if (!new RegExp('Wpisano ' + temps + '/' + temps + '\\.').test(hint) || /Poza zakresem/.test(hint)) bad.push(id + ': po wpisaniu ' + temps + ' pomiarów w zakresie formularz pokazuje: ' + hint);
      }
      else if (flush) { const [fc] = await Promise.all([pg.waitForEvent('filechooser'), pg.click('[data-flcam="0"]')]); await fc.setFiles({ name: 'a.jpg', mimeType: 'image/jpeg', buffer: JPG }); await pg.waitForTimeout(600); }
      else if (await pg.locator('#galIn').count()) { await pg.setInputFiles('#galIn', { name: 'a.jpg', mimeType: 'image/jpeg', buffer: JPG }); await pg.waitForTimeout(600); }
      if (await pg.locator('#toQueue').isDisabled()) { const ok = pg.locator('[data-allok], #allOk, button:has-text("Wszystko OK")').first(); if (await ok.count()) await ok.click().catch(() => {}); await pg.waitForTimeout(300); }
      if (await pg.locator('#toQueue').isDisabled()) { bad.push(id + ': Wyślij zablokowane – test nie umie wypełnić tej inspekcji (' + (await pg.locator('#formHint').textContent().catch(() => '')) + ')'); await ctx.close(); return; }
      const t0 = Date.now(); await pg.click('#toQueue'); await pg.waitForFunction(queued, null, { timeout: RAPORT_MS, polling: 100 }).catch(() => {}); czasy.push(Date.now() - t0); await pg.waitForTimeout(200);
      const files = await pg.evaluate(() => new Promise(res => { const rq = indexedDB.open('inspekcje', 1); rq.onsuccess = () => { try { const g = rq.result.transaction('queue').objectStore('queue').getAll(); g.onsuccess = () => { const last = g.result[g.result.length - 1]; if (!last) return res(null); const b64 = u => { let s = ''; const a = new Uint8Array(u); for (let i = 0; i < a.length; i += 32768) s += String.fromCharCode.apply(null, a.subarray(i, i + 32768)); return btoa(s); }; res((last.files || []).map(f => ({ name: f.name, data: f.bytes ? b64(f.bytes) : '' }))); }; } catch (e) { res(null); } }; rq.onerror = () => res(null); }));
      await ctx.close();
      if (!files) { bad.push(id + ': Wyślij nie dodało raportu do kolejki' + (errs.length ? ' (' + errs.join(' | ') + ')' : '')); return; }
      checked++; done.push(id);
      const names = files.map(f => f.name), pdf = files.filter(f => f.name.endsWith('.pdf')), word = files.filter(f => f.name.endsWith('.docx'));
      if (!pdf.length || !word.length) bad.push(id + ': ' + JSON.stringify(names));
      if (flush > 1 && /Flushing/i.test(names.join()) && word.length < 2) bad.push(id + ' (Flushing: formularz + basic form w Wordzie): ' + JSON.stringify(names));
      // każdy plik musi się otworzyć: PDF z co najmniej jedną stroną, Word z treścią; inspekcja „z folderu” (skan kartki, PROD-023) – zdjęcie kartki w obu plikach
      const folder = (PPM.find(t => t.id === id) || {}).form === 'folder';
      const txt = { pdf: [], word: [] };
      for (const f of pdf) { const b = Buffer.from(f.data, 'base64'); try { if (pdfPages(b) < 1) throw Error('0 stron'); if (folder && !pdfImages(b)) throw Error('brak zdjęcia kartki'); txt.pdf.push(pdfText(b)); } catch (e) { bad.push(id + ': PDF ' + f.name + ' nie jest poprawnym raportem (' + e.message + ')'); } }
      for (const f of word) { const b = Buffer.from(f.data, 'base64'); try { const t = docxText(b), im = docxImages(b); if (!t.trim() && !im) throw Error('ani tekstu, ani zdjęcia'); if (folder && !im) throw Error('brak zdjęcia kartki'); txt.word.push(t); } catch (e) { bad.push(id + ': Word ' + f.name + ' nie jest poprawnym raportem (' + e.message + ')'); } }
      if (expectTemps) {
        // treść: wszystkie pomiary w Wordzie (w kolejności tabeli firmy) i w PDF (wiersz: miejsce, wylot, °C), podpis i stan ogólny
        const W = '\n' + txt.word.join('\n') + '\n', P = txt.pdf.join('\n'); let at = 0;
        for (const t of expectTemps) { const k = W.indexOf('\n' + t.value + '\n', at); /* wartość jako osobna komórka tabeli */ if (k < 0) { bad.push(id + ': Word nie zawiera pomiaru ' + t.name + ' (' + t.kind + ') = ' + t.value + ' w kolejności tabeli'); break; } at = k + t.value.length + 1; }
        for (const t of expectTemps) if (!new RegExp(t.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\n[^\\n]*\\n' + t.value.replace('.', '\\.') + '\\n').test(P)) bad.push(id + ': PDF nie zawiera wiersza ' + t.name + ' (' + t.kind + ') = ' + t.value + '°C');
        if (!includesFlat(W, 'G. Sarna')) bad.push(id + ': Word bez podpisu inżyniera');
        if (!includesFlat(P, 'Print name: G. Sarna')) bad.push(id + ': PDF bez podpisu inżyniera');
        if (!includesFlat(P, 'All readings within range.')) bad.push(id + ': PDF bez stanu ogólnego „All readings within range”');
        content.push(id + ' (' + expectTemps.length + ' pomiarów w Word i PDF)');
      }
      if (errs.length) bad.push(id + ' błędy strony: ' + errs.join(' | '));
    };
    const kolejka = [...ids]; await Promise.all(Array.from({ length: NARAZ }, async () => { while (kolejka.length) await one(kolejka.shift()); }));
    const kol = id => ids.indexOf(id); done.sort((a, b) => kol(a) - kol(b)); content.sort();
    assert.ok(ids.length > 0, 'pusta lista inspekcji PPM');
    assert.deepEqual(bad, [], 'inspekcje z błędem raportu (Word + PDF):\n' + bad.join('\n'));
    assert.equal(checked, ids.length, 'sprawdzono ' + checked + ' z ' + ids.length + ' inspekcji z listy PPM');
    console.log('czas od Wyślij do raportu w kolejce: max ' + Math.max(...czasy) + ' ms (limit ' + RAPORT_MS + ' ms), ' + NARAZ + ' inspekcje naraz');
    console.log('raport-ui-check: ' + checked + ' inspekcji, każda ma Word i PDF: ' + done.join(' ') + ' | treść sprawdzona: ' + (content.join(', ') || '—'));
  } finally { if (browser) await browser.close(); await new Promise(r => server.close(r)); }
})().catch(e => { console.error(e); process.exitCode = 1; });
