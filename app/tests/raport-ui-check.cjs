// ZASADA (Grzegorz, 04/11/2026): każdy raport idzie w dwóch wersjach, Word i PDF, z tego samego wzoru (basic form / formularz firmy).
// Ten test otwiera każdą inspekcję z listy PPM, dodaje zdjęcie, naciska Wyślij z domyślnymi ustawieniami ⚙ i sprawdza,
// że w kolejce jest i PDF, i Word. Flushing: formularz firmy + basic form w Wordzie. Uruchamiany w CI przed budową APK.
const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), assert = require('node:assert/strict');
const { chromium } = require(process.env.OEST_PLAYWRIGHT_PATH || 'playwright'), root = path.resolve(__dirname, '../www');
const JPG = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64');
const server = http.createServer((req, res) => {
  const p = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(p, (e, b) => { if (e) { res.writeHead(404).end(); return; } res.setHeader('Content-Type', p.endsWith('.js') ? 'text/javascript' : p.endsWith('.css') ? 'text/css' : 'text/html; charset=utf-8'); res.end(b); });
});
const ids = [...new Set(fs.readFileSync(path.join(root, 'ppm.js'), 'utf8').match(/EFA-INS-0\d\d/g))].sort();
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r)); let browser, checked = 0; const bad = [], skipped = [], done = [];
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.OEST_BROWSER_PATH ? { executablePath: process.env.OEST_BROWSER_PATH } : {}) });
    for (const id of ids) {
      const ctx = await browser.newContext({ viewport: { width: 412, height: 900 }, serviceWorkers: 'block' }), pg = await ctx.newPage(), errs = [];
      pg.on('pageerror', e => errs.push(e.message));
      await ctx.addInitScript(() => { localStorage.setItem('oest.account', JSON.stringify({ provider: 'local', id: 't', email: 'demo@example.com', first: 'Greg', last: 'Sarna' })); localStorage.setItem('insp.cfg', JSON.stringify({ insp: 'G. Sarna', email: 'demo@example.com' })); });
      await pg.goto('http://127.0.0.1:' + server.address().port + '/inspekcje/index.html#ppm=' + id); await pg.waitForTimeout(1500);
      if (!(await pg.locator('#toQueue').isVisible().catch(() => false))) { await ctx.close(); continue; } // formularz jeszcze nie skonfigurowany
      const flush = await pg.locator('[data-flcam]').count();
      if (await pg.locator('#sendCfg').isVisible().catch(() => false)) { await pg.click('#sendCfg'); await pg.waitForTimeout(300); const q = pg.locator('[data-sn="q"]:not([disabled])'); if (await q.count()) await q.check(); await pg.click('.oest-ask [data-a="ok"]'); await pg.waitForTimeout(300); }
      if (await pg.locator('#flWeek [data-w="1"]').isVisible().catch(() => false)) await pg.click('#flWeek [data-w="1"]');
      if (flush) { const [fc] = await Promise.all([pg.waitForEvent('filechooser'), pg.click('[data-flcam="0"]')]); await fc.setFiles({ name: 'a.jpg', mimeType: 'image/jpeg', buffer: JPG }); await pg.waitForTimeout(600); }
      else if (await pg.locator('#galIn').count()) { await pg.setInputFiles('#galIn', { name: 'a.jpg', mimeType: 'image/jpeg', buffer: JPG }); await pg.waitForTimeout(600); }
      if (await pg.locator('#toQueue').isDisabled()) { const ok = pg.locator('[data-allok], #allOk, button:has-text("Wszystko OK")').first(); if (await ok.count()) await ok.click().catch(() => {}); await pg.waitForTimeout(300); }
      if (await pg.locator('#toQueue').isDisabled()) { skipped.push(id); await ctx.close(); continue; } // wymaga odpowiedzi, których test nie zna
      await pg.click('#toQueue'); await pg.waitForTimeout(3500);
      const files = await pg.evaluate(() => new Promise(res => { const rq = indexedDB.open('inspekcje', 1); rq.onsuccess = () => { try { const g = rq.result.transaction('queue').objectStore('queue').getAll(); g.onsuccess = () => res(g.result.length ? (g.result[g.result.length - 1].files || []).map(f => f.name) : null); } catch (e) { res(null); } }; rq.onerror = () => res(null); }));
      await ctx.close();
      if (!files) continue; // np. inspekcja bez pytań, która nic nie wysyła (nic nie trafiło do kolejki)
      checked++; done.push(id);
      const pdf = files.filter(n => n.endsWith('.pdf')), word = files.filter(n => n.endsWith('.docx'));
      if (!pdf.length || !word.length) bad.push(id + ': ' + JSON.stringify(files));
      if (flush > 1 && /Flushing/i.test(files.join()) && word.length < 2) bad.push(id + ' (Flushing: formularz + basic form w Wordzie): ' + JSON.stringify(files));
      if (errs.length) bad.push(id + ' błędy strony: ' + errs.join(' | '));
    }
    assert.ok(checked >= 5, 'za mało inspekcji sprawdzonych: ' + checked);
    assert.deepEqual(bad, [], 'raport bez obu wersji (Word + PDF):\n' + bad.join('\n'));
    console.log('raport-ui-check: ' + checked + ' inspekcji, każda ma Word i PDF: ' + done.join(' ') + (skipped.length ? ' | pominięte (wymagają odpowiedzi): ' + skipped.join(' ') : ''));
  } finally { if (browser) await browser.close(); await new Promise(r => server.close(r)); }
})().catch(e => { console.error(e); process.exitCode = 1; });
