// Odczyt inspekcji Flushing z raportu w kolejce wysyłki (Grzegorz 04/11: odpowiedzi kranów, tydzień, zdjęcia przy kranach) –
// „↺ Przywróć inspekcję” (inspekcje/i-szkic.js, offerRestore). Przywrócone 25.11.2026 (Grzegorz: usunięcie nie było zamierzone).
// Od 25.11.2026 odczyt idzie z NASZYCH danych raportu (it.snap w kolejce – ta sama kopia co „Odzyskaj” w Moich raportach),
// nie z PDF: PDF robi tylko silnik LibreOffice z Worda, apka niczego z PDF nie odgaduje.
// Test: Weekly Flushing TA, TB i Pavilion jak użytkownik (tydzień 3, kran 2 = No z notatką, zdjęcia przy kranach 1, 3, 5, zdjęcie
// formularza), Wyślij; potem szkic znika (jak w starej wersji po „Wyślij”), strona otwiera się od nowa i „↺ Przywróć inspekcję”
// ma oddać dokładnie to, co wpisano. FAIL, gdy przycisku nie ma albo cokolwiek wraca inaczej.
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const { chromium } = require('./przegladarka.cjs'), root = path.resolve(__dirname, '../www');
const { wpisz, wybierz, ptaszek, zdjecia } = require('./ionic-pomoc.cjs');
const INSPEKCJE = ['EFA-INS-004', 'EFA-INS-026', 'EFA-INS-012']; // Weekly Flushing TA, TB, Pavilion
const NOTATKA = 'Valve stiff, reported', TYDZIEN = 3, ZLY = 1, ZDJ = [0, 2, 4]; // Pavilion ma 2 krany: zdjęcia tylko przy istniejących
const server = http.createServer((req, res) => {
  const p = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(root + path.sep) && p !== root) { res.writeHead(403).end(); return; }
  const file = p === root ? path.join(root, 'index.html') : p;
  fs.readFile(file, (e, b) => { if (e) { res.writeHead(404).end(); return; } res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.docx') ? 'application/octet-stream' : 'text/html; charset=utf-8'); res.end(b); });
});
// raport w chwili zapisu do kolejki (z niego apka potem przywraca)
const przechwyc = () => { const put = IDBObjectStore.prototype.put; IDBObjectStore.prototype.put = function (v) { try { if (this.name === 'queue' && v && Array.isArray(v.files)) window.__raport = { snap: !!v.snap }; } catch (e) {} return put.apply(this, arguments); }; };
const jpeg = (pg, [w, h], kolor) => pg.evaluate(([w, h, kolor]) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.fillStyle = kolor; x.fillRect(0, 0, w, h); return c.toDataURL('image/jpeg', 0.8).split(',')[1]; }, [w, h, kolor]).then(b => ({ name: 'kran-' + w + '.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(b, 'base64') }));

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const url = 'http://127.0.0.1:' + server.address().port, bad = [], ok = [];
  let browser, sprawdzen = 0;
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.OEST_BROWSER_PATH ? { executablePath: process.env.OEST_BROWSER_PATH } : {}) });
    for (const id of INSPEKCJE) {
      const ctx = await browser.newContext({ viewport: { width: 412, height: 900 }, serviceWorkers: 'block' }), pg = await ctx.newPage(), errs = [];
      pg.setDefaultTimeout(20000);
      pg.on('pageerror', e => errs.push(e.message));
      await ctx.addInitScript(() => { localStorage.setItem('oest.account', JSON.stringify({ provider: 'local', id: 't', email: 'demo@example.com', first: 'Greg', last: 'Sarna' })); localStorage.setItem('insp.cfg', JSON.stringify({ insp: 'G. Sarna', email: 'demo@example.com' })); });
      await ctx.addInitScript(przechwyc);
      const zle = m => bad.push(id + ': ' + m + (errs.length ? ' (błędy strony: ' + errs.join(' | ') + ')' : ''));
      const check = (warunek, opis) => { sprawdzen++; if (!warunek) zle(opis); return warunek; };
      try {
        await pg.goto(url + '/inspekcje/index.html#ppm=' + id); await pg.waitForLoadState('networkidle');
        await pg.locator('#toQueue').waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
        if (!(await pg.locator('#toQueue').isVisible().catch(() => false))) { zle('brak formularza z przyciskiem Wyślij'); continue; }
        const vis = s => pg.locator(s).first().isVisible().catch(() => false);
        // ⚙ wysyłki: „nasz raport” – do raportu idzie formularz elektroniczny (tabela kranów)
        if (await vis('#sendCfg')) { await pg.click('#sendCfg'); await pg.locator('.oest-ask [data-a="ok"]').waitFor(); const q = pg.locator('[data-sn="q"]:not([disabled])'); if (await q.count()) await ptaszek(q); await pg.click('.oest-ask [data-a="ok"]'); await pg.locator('.oest-ask').waitFor({ state: 'detached' }).catch(() => {}); }
        if (!(await pg.evaluate(() => document.querySelector('#flOn').checked))) await ptaszek(pg.locator('#flOn'));
        const nazwy = await pg.evaluate(() => Array.from(document.querySelectorAll('#flList [data-ui="fl-line"] [data-ui="txt"]')).map(e => e.textContent));
        if (nazwy.length < 2) { zle('formularz ma ' + nazwy.length + ' kranów – za mało do sprawdzenia'); continue; }
        const ZE_ZDJECIEM = ZDJ.filter(t => t < nazwy.length);
        await wybierz(pg, '#flWeek', String(TYDZIEN));
        await wybierz(pg, '[data-fl="' + ZLY + '"]', 'no');
        await pg.click('[data-flnote="' + ZLY + '"]'); await wpisz(pg, '[data-fln="' + ZLY + '"]', NOTATKA);
        for (const t of ZE_ZDJECIEM) await zdjecia(pg, '[data-flcam="' + t + '"]', await jpeg(pg, [120 + t * 8, 168], '#2a6'));
        if (await vis('#shCamIn')) await zdjecia(pg, '#shCamIn', await jpeg(pg, [150, 212], '#c63'), 'Zdjęcie formularza');
        await pg.waitForLoadState('networkidle');
        if (await vis('#podpis')) await wpisz(pg, '#podpis', 'G. Sarna');
        await pg.waitForFunction(() => !document.querySelector('#toQueue').disabled, null, { timeout: 15000 }).catch(() => {});
        if (await pg.locator('#toQueue').evaluate(e => e.disabled)) { zle('Wyślij zablokowane (' + (await pg.locator('#formHint').textContent().catch(() => '')) + ')'); continue; }
        const wpisane = await pg.evaluate(() => ({ week: fl.week, taps: fl.taps.map(t => ({ state: t.state, note: t.note || '' })), tapy: photos.filter(p => p.tap != null).map(p => p.tap).sort((a, b) => a - b), luzem: photos.filter(p => p.tap == null).length }));
        await pg.click('#toQueue');
        if (!(await pg.waitForFunction(() => !!window.__raport, null, { timeout: 60000, polling: 100 }).then(() => true, () => false))) { zle('Wyślij nie zapisało raportu w kolejce'); continue; }
        check(await pg.evaluate(() => window.__raport.snap), 'raport w kolejce bez danych inspekcji (snap) – nie ma z czego przywrócić');
        // stara wersja po „Wyślij” kasowała szkic: kasujemy go i otwieramy stronę od nowa
        await pg.waitForTimeout(500);
        await pg.evaluate(() => kvSet(draftKey(), null));
        await pg.reload(); await pg.waitForLoadState('networkidle');
        if (!check(await pg.locator('#restoreIns').waitFor({ state: 'visible', timeout: 15000 }).then(() => true, () => false), 'po ponownym otwarciu nie ma „↺ Przywróć inspekcję”')) continue;
        await pg.click('#restoreIns');
        await pg.waitForFunction(() => /Przywrócono z raportu/.test(document.querySelector('#formHint').textContent), null, { timeout: 15000 }).catch(() => {});
        const x = await pg.evaluate(() => ({ week: fl.week, taps: fl.taps.map(t => ({ state: t.state, note: t.note || '' })), tapy: photos.filter(p => p.tap != null).map(p => p.tap).sort((a, b) => a - b), luzem: photos.filter(p => p.tap == null).length, hint: document.querySelector('#formHint').textContent }));
        const oczek = nazwy.map((_, i) => i === ZLY ? { state: 'no', note: NOTATKA } : { state: 'yes', note: '' });
        check(JSON.stringify(wpisane.taps) === JSON.stringify(oczek) && wpisane.week === TYDZIEN, 'formularz przed wysłaniem nie ma wpisanych danych (test): ' + JSON.stringify(wpisane));
        check(x.week === TYDZIEN, 'tydzień ' + x.week + ' zamiast ' + TYDZIEN);
        check(JSON.stringify(x.taps) === JSON.stringify(oczek), 'odpowiedzi kranów inne niż wpisane: ' + JSON.stringify(x.taps.map((t, i) => t.state !== oczek[i].state || t.note !== oczek[i].note ? i + ':' + t.state + '/' + t.note : '').filter(Boolean)));
        check(JSON.stringify(x.tapy) === JSON.stringify(ZE_ZDJECIEM), 'zdjęcia przy kranach ' + JSON.stringify(x.tapy) + ' zamiast ' + JSON.stringify(ZE_ZDJECIEM));
        check(x.luzem === wpisane.luzem, 'zdjęć bez kranu (formularz) ' + x.luzem + ' zamiast ' + wpisane.luzem);
        check(!errs.length, 'błędy strony');
        ok.push(id + ' (' + nazwy.length + ' kranów)');
      } finally { await ctx.close(); }
    }
  } finally { if (browser) await browser.close(); server.close(); }
  if (bad.length || ok.length !== INSPEKCJE.length) { console.error('FLUSH ODCZYT UI FAIL:\n - ' + bad.join('\n - ')); process.exit(1); }
  console.log('FLUSH ODCZYT UI PASS: ' + ok.join(', ') + '; ' + sprawdzen + ' sprawdzeń');
})().catch(e => { console.error('FLUSH ODCZYT UI FAIL:', e && e.stack || e); process.exit(1); });
