// „Nie rozpoczęta” zostaje (Grzegorz 07/11/2026: „co chwilę im ustawiam, że są nierozpoczęte, a co update wracają, że są w trakcie”).
// Przyczyna: samo otwarcie inspekcji (i wczytanie jej zapisanych zdjęć/odpowiedzi) ustawiało „W trakcie”.
// Scenariusz Grzegorza na prawdziwych stronach apki (app/www po npm run copy-web), ten sam origin = te same dane co w telefonie:
// inspekcja z danymi → ręcznie „Nie rozpoczęta” → restart apki (jak po aktualizacji) → lista → otwarcie → restart → otwarcie.
// Wymagane: status zostaje „Nie rozpoczęta”, zdjęcia i odpowiedzi zostają (nic nie ginie); dopiero nowe zdjęcie = „W trakcie”.
// Uruchomienie: OEST_PLAYWRIGHT_PATH=… OEST_BROWSER_PATH=… node app/tests/nie-rozpoczeta-ui-check.cjs  (po npm run copy-web)
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const { chromium } = require(process.env.OEST_PLAYWRIGHT_PATH || 'playwright');
const root = path.resolve(__dirname, '../www');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const p = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(p, (e, b) => { if (e) { res.writeHead(404).end(); return; } res.setHeader('Content-Type', TYPES[path.extname(p)] || 'application/octet-stream'); res.end(b); });
});
const JPG = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64');
const fails = [], R = {};
const check = (ok, msg) => { if (!ok) fails.push(msg); };
// Flushing TA (formularz elektroniczny), ATS (pytania TAK/NIE), Plant weekly, pomiary temperatur TB (bez pytań i zdjęć)
const CASES = [{ id: 'EFA-INS-004', photos: 3 }, { id: 'EFA-INS-014', photos: 2, answerNo: true }, { id: 'EFA-INS-021', photos: 1, answerNo: true }, { id: 'EFA-INS-024', photos: 0, temps: true }];

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const B = 'http://127.0.0.1:' + server.address().port; let browser; const errors = [];
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.OEST_BROWSER_PATH ? { executablePath: process.env.OEST_BROWSER_PATH } : {}) });
    for (const C of CASES) {
      const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, serviceWorkers: 'block' });
      await ctx.addInitScript(() => { if (!localStorage.getItem('oest.account')) localStorage.setItem('oest.account', JSON.stringify({ provider: 'local', id: 't', email: 'demo@example.com', first: 'Greg', last: 'Sarna' })); });
      const pg = await ctx.newPage(); pg.on('pageerror', e => errors.push(C.id + ': ' + e.message));
      const stage = () => pg.evaluate(i => { const a = JSON.parse(localStorage.getItem('oest.ppm.stage') || '{}'); return a[i] ? a[i].s : 'none'; }, C.id);
      const form = () => pg.evaluate(() => ({ photos: document.querySelectorAll('#photos img').length, fails: document.querySelectorAll('.ck-row.fail').length, temps: [...document.querySelectorAll('#tempList input[data-t]')].map(x => x.value).join('|') }));
      const openInsp = async () => { await pg.goto(B + '/inspekcje/index.html#ppm=' + C.id); await pg.waitForTimeout(3000); };
      const card = async () => { await pg.goto(B + '/index.html#ppm'); await pg.waitForTimeout(1500); return (await pg.locator('[data-id="' + C.id + '"]').first().textContent().catch(() => '')) || ''; };
      // 1. inspekcja z danymi (jak u Grzegorza: zdjęcia, odpowiedź NIE)
      await openInsp();
      for (let i = 0; i < C.photos; i++) { await pg.setInputFiles('#galIn', { name: 'z' + i + '.jpg', mimeType: 'image/jpeg', buffer: JPG }); await pg.waitForTimeout(700); }
      if (C.answerNo) { const no = pg.locator('.ck-row button[data-s="fail"]').first(); if (await no.count()) { await no.click(); await pg.waitForTimeout(400); } else check(false, C.id + ': brak pytania TAK/NIE do odpowiedzi'); }
      if (C.temps) { await pg.locator('#tempList input[data-t="0"]').fill('55.5'); await pg.waitForTimeout(400); }
      await pg.waitForTimeout(1500); // zapis szkicu
      const before = await form();
      check(await stage() === 'prog', C.id + ': po zmianach nie jest „W trakcie” (' + await stage() + ')');
      check(before.photos === C.photos, C.id + ': w formularzu ' + before.photos + ' zdjęć zamiast ' + C.photos);
      // 2. ręcznie „Nie rozpoczęta” w nagłówku inspekcji
      await pg.selectOption('#ppmStage', ''); await pg.waitForTimeout(500);
      check(await stage() === 'none', C.id + ': wybór „Nie rozpoczęta” nie zadziałał');
      // 3. restart apki (jak po aktualizacji APK: te same dane, strona ładowana od nowa) i lista
      for (let round = 1; round <= 2; round++) {
        const txt = await card(); await pg.reload(); await pg.waitForTimeout(1200);
        check(/Nie rozpoczęta|Zaległa/.test(txt) && !/W trakcie/.test(txt), C.id + ' runda ' + round + ': klocek na liście nie pokazuje „Nie rozpoczęta” (albo „Zaległa” po terminie): ' + txt.slice(0, 80));
        // 4. samo otwarcie inspekcji: nic nie ruszam
        await openInsp();
        const now = await form(), sel = await pg.locator('#ppmStage').inputValue();
        check(await stage() === 'none', C.id + ' runda ' + round + ': po otwarciu inspekcji status wrócił na „' + await stage() + '”');
        check(sel === '', C.id + ' runda ' + round + ': w nagłówku inspekcji wybrane „' + sel + '” zamiast „Nie rozpoczęta”');
        check(now.photos === before.photos && now.fails === before.fails && now.temps === before.temps, C.id + ' runda ' + round + ': dane inspekcji zmienione (zdjęcia ' + before.photos + '→' + now.photos + ', NIE ' + before.fails + '→' + now.fails + ', pomiary ' + before.temps + '→' + now.temps + ')');
        R[C.id + '#' + round] = { status: await stage(), zdjecia: now.photos, nie: now.fails };
      }
      // 5a. zmiana samej treści odpowiedzi przy tych samych licznikach (NIE przechodzi z pytania 1 na pytanie 2) = „W trakcie”
      if (C.answerNo) {
        await pg.locator('.ck-row button[data-s="fail"]').nth(1).click(); await pg.waitForTimeout(300);
        await pg.locator('.ck-row button[data-s="ok"]').first().click(); await pg.waitForTimeout(1000);
        const f = await form(); check(f.fails === before.fails, C.id + ': test zmienił liczbę NIE (' + f.fails + ')');
        check(await stage() === 'prog', C.id + ': zamiana odpowiedzi (te same liczniki) nie zmieniła statusu na „W trakcie” (' + await stage() + ')'); R[C.id + '#zamiana'] = await stage();
        await pg.selectOption('#ppmStage', ''); await pg.waitForTimeout(500);
      }
      // 5b. nowy pomiar temperatury (formularz bez pytań i zdjęć) = „W trakcie”
      if (C.temps) {
        await pg.locator('#tempList input[data-t="1"]').fill('8'); await pg.waitForTimeout(1000);
        check(await stage() === 'prog', C.id + ': nowy pomiar nie zmienił statusu na „W trakcie” (' + await stage() + ')'); R[C.id + '#pomiar'] = await stage();
        await pg.selectOption('#ppmStage', ''); await pg.waitForTimeout(500);
      }
      // 5. nowa zmiana (nowe zdjęcie) = „W trakcie”, jak dotąd
      await pg.setInputFiles('#galIn', { name: 'nowe.jpg', mimeType: 'image/jpeg', buffer: JPG }); await pg.waitForTimeout(1200);
      check(await stage() === 'prog', C.id + ': nowe zdjęcie nie zmieniło statusu na „W trakcie” (' + await stage() + ')');
      await ctx.close();
    }
    // bez zmian: nietknięta inspekcja po otwarciu = „W trakcie” (zasada z 02/11)
    { const ctx = await browser.newContext({ serviceWorkers: 'block' }), pg = await ctx.newPage();
      await pg.goto(B + '/inspekcje/index.html#ppm=EFA-INS-015'); await pg.waitForTimeout(2000);
      const s = await pg.evaluate(() => (JSON.parse(localStorage.getItem('oest.ppm.stage') || '{}')['EFA-INS-015'] || {}).s);
      check(s === 'prog', 'nietknięta inspekcja po otwarciu: ' + s + ' zamiast „W trakcie” (zmiana zachowania)'); await ctx.close(); }
    check(errors.length === 0, 'błędy JS: ' + errors.slice(0, 3).join(' | '));
  } finally { if (browser) await browser.close(); server.close(); }
  console.log('POMIARY ' + JSON.stringify(R));
  if (fails.length) { console.error('NIE ROZPOCZETA UI FAIL (' + fails.length + '):\n- ' + fails.join('\n- ')); process.exitCode = 1; return; }
  console.log('NIE ROZPOCZETA UI PASS: ' + CASES.map(c => c.id).join(', ') + ' – „Nie rozpoczęta” zostaje po 2 restartach i otwarciach, zdjęcia i odpowiedzi bez zmian, zamiana odpowiedzi, nowy pomiar i nowe zdjęcie = W trakcie');
})().catch(e => { console.error(e); process.exitCode = 1; });
