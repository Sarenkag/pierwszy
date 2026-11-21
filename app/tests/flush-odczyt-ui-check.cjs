// Plan audytu 19/11/2026, punkt 1.2 (ustalenie nr 5): test charakteryzujący OESTFlush.fromPdf na DZISIEJSZYCH PDF-ach.
// fromPdf odtwarza inspekcję Flushing z raportu w kolejce wysyłki (Grzegorz 04/11: odpowiedzi kranów, tydzień, zdjęcia przy kranach).
// Parser jest dopasowany do układu PDF z jsPDF, więc każda zmiana PDF (Faza 4: PDF z Worda, czcionki) może go zepsuć.
// Ten test jest warunkiem przed każdą zmianą PDF: wypełnia Weekly Flushing TA, TB i Pavilion jak użytkownik
// (tydzień 3, kran 2 = No z notatką, zdjęcia przy kranach 1, 3, 5), klika Wyślij, bierze PDF zapisany w kolejce
// i odczytuje go tą samą funkcją, której używa apka. FAIL, gdy odczyt nie zwraca dokładnie tego, co wpisano,
// gdy któryś budynek nie da się sprawdzić (pominięcie to nie PASS) albo gdy strona zgłosi błąd.
// Stan na 21/11/2026: fromPdf nie czyta dzisiejszych PDF-ów Flushing (układ zmienił się po 04/11; komentarz przy buildFlushPdf
// w inspekcje/index.html to przyznaje). Te przypadki są na liście znanych naruszeń quality/baselines/flush-odczyt.json –
// lista może tylko maleć: nowy przypadek = FAIL, przypadek z listy, który już działa = FAIL (usuń wpis).
// Naprawa to plan audytu 4.1 (dane inspekcji jako JSON w kolejce, odczyt nie zależy od wyglądu PDF).
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const { chromium } = require(process.env.OEST_PLAYWRIGHT_PATH || 'playwright'), root = path.resolve(__dirname, '../www');
const BASELINE = path.resolve(__dirname, '../../quality/baselines/flush-odczyt.json');
const INSPEKCJE = ['EFA-INS-004', 'EFA-INS-026', 'EFA-INS-012']; // Weekly Flushing TA, TB, Pavilion
const NOTATKA = 'Valve stiff, reported', TYDZIEN = 3, ZLY = 1, ZDJ = [0, 2, 4]; // Pavilion ma 2 krany: zdjęcia tylko przy istniejących
const server = http.createServer((req, res) => {
  const p = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(root + path.sep) && p !== root) { res.writeHead(403).end(); return; }
  const file = p === root ? path.join(root, 'index.html') : p;
  fs.readFile(file, (e, b) => { if (e) { res.writeHead(404).end(); return; } res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.docx') ? 'application/octet-stream' : 'text/html; charset=utf-8'); res.end(b); });
});
// raport przechwycony w chwili zapisu do kolejki (ta sama treść, którą apka wysyła i z której potem odtwarza)
const przechwyc = () => { const put = IDBObjectStore.prototype.put; IDBObjectStore.prototype.put = function (v) { try { if (this.name === 'queue' && v && Array.isArray(v.files) && v.files.some(f => /\.pdf$/.test(f.name))) window.__raport = v; } catch (e) {} return put.apply(this, arguments); }; };
const jpeg = (pg, [w, h], kolor) => pg.evaluate(([w, h, kolor]) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.fillStyle = kolor; x.fillRect(0, 0, w, h); return c.toDataURL('image/jpeg', 0.8).split(',')[1]; }, [w, h, kolor]).then(b => ({ name: 'kran-' + w + '.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(b, 'base64') }));

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const url = 'http://127.0.0.1:' + server.address().port, bad = [], ok = [], naruszenia = [];
  let browser, sprawdzen = 0;
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.OEST_BROWSER_PATH ? { executablePath: process.env.OEST_BROWSER_PATH } : {}) });
    for (const id of INSPEKCJE) {
      const ctx = await browser.newContext({ viewport: { width: 412, height: 900 }, serviceWorkers: 'block' }), pg = await ctx.newPage(), errs = [];
      pg.on('pageerror', e => errs.push(e.message));
      await ctx.addInitScript(() => { localStorage.setItem('oest.account', JSON.stringify({ provider: 'local', id: 't', email: 'demo@example.com', first: 'Greg', last: 'Sarna' })); localStorage.setItem('insp.cfg', JSON.stringify({ insp: 'G. Sarna', email: 'demo@example.com' })); });
      await ctx.addInitScript(przechwyc);
      const zle = m => bad.push(id + ': ' + m + (errs.length ? ' (błędy strony: ' + errs.join(' | ') + ')' : ''));
      try {
        await pg.goto(url + '/inspekcje/index.html#ppm=' + id); await pg.waitForLoadState('networkidle');
        await pg.locator('#toQueue').waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
        if (!(await pg.locator('#toQueue').isVisible().catch(() => false))) { zle('brak formularza z przyciskiem Wyślij'); continue; }
        const vis = s => pg.locator(s).first().isVisible().catch(() => false);
        // ⚙ wysyłki: „nasz raport” – do raportu idzie formularz elektroniczny (tabela kranów)
        if (await vis('#sendCfg')) { await pg.click('#sendCfg'); await pg.locator('.oest-ask [data-a="ok"]').waitFor(); const q = pg.locator('[data-sn="q"]:not([disabled])'); if (await q.count()) await q.check(); await pg.click('.oest-ask [data-a="ok"]'); await pg.locator('.oest-ask').waitFor({ state: 'detached' }).catch(() => {}); }
        if (!(await pg.locator('#flOn').isChecked().catch(() => false))) await pg.locator('#flOn').check().catch(() => {});
        const nazwy = await pg.evaluate(() => Array.from(document.querySelectorAll('#flList .fl-row .txt')).map(e => e.textContent));
        if (nazwy.length < 2) { zle('formularz ma ' + nazwy.length + ' kranów – za mało do sprawdzenia'); continue; }
        const ZE_ZDJECIEM = ZDJ.filter(t => t < nazwy.length);
        await pg.click('#flWeek [data-w="' + TYDZIEN + '"]');
        await pg.click('[data-fl="' + ZLY + '"][data-s="no"]');
        await pg.click('[data-flnote="' + ZLY + '"]'); await pg.fill('[data-fln="' + ZLY + '"]', NOTATKA); await pg.locator('[data-fln="' + ZLY + '"]').blur();
        for (const t of ZE_ZDJECIEM) { const f = await jpeg(pg, [120 + t * 8, 168], '#2a6'); const [fc] = await Promise.all([pg.waitForEvent('filechooser'), pg.click('[data-flcam="' + t + '"]')]); await fc.setFiles(f); }
        if (!(await pg.waitForFunction(n => document.querySelectorAll('#flList .fl-pics img').length >= n, ZE_ZDJECIEM.length, { timeout: 15000 }).then(() => true, () => false))) { zle('zdjęcia kranów nie wczytały się'); continue; }
        const kartkaIn = (await vis('#shGalIn')) ? '#shGalIn' : (await vis('label:has(#shCamIn)')) ? '#shCamIn' : '';
        if (kartkaIn) await pg.setInputFiles(kartkaIn, await jpeg(pg, [150, 212], '#c63'));
        await pg.waitForLoadState('networkidle');
        if (await vis('#podpis')) await pg.fill('#podpis', 'G. Sarna');
        await pg.waitForFunction(() => !document.querySelector('#toQueue').disabled, null, { timeout: 15000 }).catch(() => {}); // stan: Wyślij aktywne po wczytaniu zdjęć
        if (await pg.locator('#toQueue').isDisabled()) { zle('Wyślij zablokowane (' + (await pg.locator('#formHint').textContent().catch(() => '')) + ')'); continue; }
        await pg.click('#toQueue');
        if (!(await pg.waitForFunction(() => !!window.__raport, null, { timeout: 20000, polling: 100 }).then(() => true, () => false))) { zle('Wyślij nie zapisało raportu PDF w kolejce'); continue; }
        // odczyt tą samą funkcją, której używa apka (offerRestore → OESTFlush.fromPdf), na każdym PDF z kolejki
        const r = await pg.evaluate(nazwy => {
          const u8 = b => b instanceof Uint8Array ? b : b instanceof ArrayBuffer ? new Uint8Array(b) : new Uint8Array(b.buffer, b.byteOffset, b.byteLength);
          const v = window.__raport, out = [];
          const pdfy = [].concat(v.pdf ? [{ name: '(item.pdf)', bytes: v.pdf }] : [], v.files.filter(f => /\.pdf$/.test(f.name) && f.bytes));
          for (const f of pdfy) { const x = window.OESTFlush.fromPdf(u8(f.bytes), nazwy); out.push({ name: f.name, r: x && { week: x.week, taps: x.taps, photos: x.photos.map(p => p.tap) } }); }
          return out;
        }, nazwy);
        const glowny = r.find(x => x.name === '(item.pdf)');
        if (!glowny) { zle('raport w kolejce bez pola pdf (z niego apka odtwarza inspekcję)'); continue; }
        const x = glowny.r, oczek = nazwy.map((_, i) => i === ZLY ? { state: 'no', note: NOTATKA } : { state: 'yes', note: '' });
        const sp = (warunek, opis) => { sprawdzen++; if (!warunek) zle(opis); return warunek; };
        sprawdzen++;
        if (!x) { naruszenia.push({ id: 'fromPdf-null:' + id, opis: 'fromPdf nie odczytał dzisiejszego PDF (null); PDF-y w kolejce: ' + r.map(y => y.name + '=' + (y.r ? 'odczytany' : 'null')).join(', ') }); sp(!errs.length, 'błędy strony'); ok.push(id + ' (' + nazwy.length + ' kranów, znane naruszenie)'); continue; }
        sp(x.week === TYDZIEN, 'tydzień ' + x.week + ' zamiast ' + TYDZIEN);
        sp(x.taps.length === nazwy.length, 'kranów ' + x.taps.length + ' zamiast ' + nazwy.length);
        sp(JSON.stringify(x.taps) === JSON.stringify(oczek), 'odpowiedzi kranów inne niż wpisane: ' + JSON.stringify(x.taps.map((t, i) => t.state !== oczek[i].state || t.note !== oczek[i].note ? i + ':' + t.state + '/' + t.note : '').filter(Boolean)));
        sp(JSON.stringify(x.photos) === JSON.stringify(ZE_ZDJECIEM), 'zdjęcia przy kranach ' + JSON.stringify(x.photos) + ' zamiast ' + JSON.stringify(ZE_ZDJECIEM));
        sp(!errs.length, 'błędy strony');
        ok.push(id + ' (' + nazwy.length + ' kranów)');
      } finally { await ctx.close(); }
    }
  } finally { if (browser) await browser.close(); server.close(); }
  // lista znanych naruszeń: tylko maleje
  const base = JSON.parse(fs.readFileSync(BASELINE, 'utf8')), known = new Set(base.entries.map(e => e.id)), now = new Set(naruszenia.map(n => n.id));
  for (const n of naruszenia) if (!known.has(n.id)) bad.push('nowe naruszenie spoza listy ' + path.basename(BASELINE) + ': ' + n.id + ' – ' + n.opis);
  for (const k of known) if (!now.has(k)) bad.push('wpis ' + k + ' z listy ' + path.basename(BASELINE) + ' już nie występuje – usuń go (lista maleje)');
  if (bad.length || ok.length !== INSPEKCJE.length) { console.error('FLUSH ODCZYT UI FAIL:\n - ' + bad.join('\n - ')); process.exit(1); }
  console.log('FLUSH ODCZYT UI PASS: ' + ok.join(', ') + '; znane naruszenia z listy: ' + naruszenia.length + ' (' + naruszenia.map(n => n.id).join(', ') + '); ' + sprawdzen + ' sprawdzeń');
})().catch(e => { console.error('FLUSH ODCZYT UI FAIL:', e && e.stack || e); process.exit(1); });
