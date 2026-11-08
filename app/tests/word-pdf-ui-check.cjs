// ZASADA (Grzegorz 04/11/2026, potwierdzone 08/11/2026; PROD-023, QG-020/G3): każdy raport idzie w DWÓCH IDENTYCZNYCH wersjach – Word i PDF.
// raport-ui-check sprawdza, że oba pliki powstają i się otwierają; ten test sprawdza, że mają TĘ SAMĄ TREŚĆ:
//  - te same słowa w Wordzie i w PDF (bez względu na to, gdzie łamie się linia), z tym samym stanem kratek ☑ / ☒
//    (PDF rysuje kratkę kreskami – test odczytuje rysunek: ✓ = łamana z 2 odcinków, ✗ = 2 kreski),
//  - nagłówek i stopka Worda są też w PDF (w PDF na każdej stronie, więc liczy się obecność, nie liczba),
//  - te same zdjęcia z inspekcji tyle samo razy (każde zdjęcie testu ma inne wymiary, więc wiadomo, które jest które; logo z nagłówka się nie liczy),
//  - komentarz wpisany w formularzu jest w obu plikach (tam, gdzie formularz pokazuje pole komentarza – w formularzach PPM jest schowane, w Reactive jest).
// Zakres: KAŻDA inspekcja EFA-INS z faktycznej listy PPM (jak raport-ui-check) wypełniona jak przez użytkownika: wszystko OK, jeden punkt NIE
// (z powodem, jeśli formularz go ma), jedna usterka, zdjęcie, komentarz, podpis; Flushing z tygodniem i zdjęciem kranu; pomiary temperatur.
// Do tego raport Reactive (OESTReactiveReport.build – ta sama funkcja, której używa apka).
// Różnice, które już są w apce, są wpisane w quality/baselines/word-pdf.json (lista może tylko maleć). Test daje FAIL, gdy:
//  - pojawi się różnica spoza listy albo inna niż wpisana,
//  - różnica z listy zniknie (trzeba usunąć wpis – lista maleje),
//  - któraś inspekcja z listy PPM nie da się sprawdzić (brak formularza, Wyślij zablokowane, brak pliku) – pominięcie to nie PASS.
// Test czeka na stan (raport w kolejce), nie mierzy czasu.
// NIE sprawdza: wyglądu (czcionki, odstępy, położenie na stronie) – to wymaga porównania obrazów stron; kolejności słów między tabelami.
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const { chromium } = require(process.env.OEST_PLAYWRIGHT_PATH || 'playwright'), root = path.resolve(__dirname, '../www');
const { inspections } = require('./ppm-lista.cjs'), { wordPdfDiff } = require('./raport-tresc.cjs');
const BASELINE = path.resolve(__dirname, '../../quality/baselines/word-pdf.json');
const server = http.createServer((req, res) => {
  const p = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(root + path.sep) && p !== root) { res.writeHead(403).end(); return; }
  const file = p === root ? path.join(root, 'index.html') : p;
  fs.readFile(file, (e, b) => { if (e) { res.writeHead(404).end(); return; } res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.docx') ? 'application/octet-stream' : 'text/html; charset=utf-8'); res.end(b); });
});
const ids = inspections(root), NARAZ = Math.max(1, +(process.env.OEST_RAPORT_NARAZ || 3));
const KOMENTARZ = 'Word PDF check comment: door to the plant room left unlocked.';
// zdjęcia testu: każde ma inne wymiary (mniejsze niż limity apki, więc apka ich nie zmienia) – po wymiarach widać, które jest które
const FOTO = { galeria: [176, 132], kartka: [150, 212], kran: [120, 168], przed: [208, 156], po: [224, 168] };
const jpeg = (pg, [w, h], kolor) => pg.evaluate(([w, h, kolor]) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.fillStyle = kolor; x.fillRect(0, 0, w, h); x.fillStyle = '#fff'; x.fillRect(w / 4, h / 4, w / 2, h / 2); return c.toDataURL('image/jpeg', 0.8).split(',')[1]; }, [w, h, kolor]).then(b => ({ name: 'foto-' + w + 'x' + h + '.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(b, 'base64') }));
// Raport przechwycony w chwili zapisu do kolejki (IDBObjectStore.put, magazyn „queue”): ta sama treść, którą apka wysyła.
// Odczyt z kolejki po fakcie nie wystarcza – moduł wysyłki może już przenieść raport dalej (bez sieci, po czasie, którego test nie ustala).
const przechwyc = () => { const put = IDBObjectStore.prototype.put; IDBObjectStore.prototype.put = function (v) { try { if (this.name === 'queue' && v && Array.isArray(v.files) && v.files.some(f => /\.pdf$/.test(f.name)) && v.files.some(f => /\.docx$/.test(f.name))) window.__raport = v.files.map(f => ({ name: f.name, bytes: f.bytes ? new Uint8Array(f.bytes instanceof ArrayBuffer ? f.bytes : f.bytes.buffer ? new Uint8Array(f.bytes.buffer, f.bytes.byteOffset, f.bytes.byteLength) : f.bytes).slice() : null })); } catch (e) {} return put.apply(this, arguments); }; };
const readQueue = () => { const b64 = u => { let s = ''; for (let i = 0; i < u.length; i += 32768) s += String.fromCharCode.apply(null, u.subarray(i, i + 32768)); return btoa(s); }; return window.__raport ? window.__raport.map(f => ({ name: f.name, data: f.bytes ? b64(f.bytes) : '' })) : null; };
// dzisiejsza data w różnicy (np. inny zapis w Wordzie i PDF) zamieniona na <DATA>, żeby wpis listy nie zależał od dnia uruchomienia
const now = new Date(), dd = String(now.getDate()).padStart(2, '0'), mm = String(now.getMonth() + 1).padStart(2, '0'), yyyy = String(now.getFullYear());
const bezDaty = t => t.split(dd + '/' + mm + '/' + yyyy).join('<DATA>').split(dd + '.' + mm + '.' + yyyy).join('<DATA>').split(dd + mm + yyyy).join('<DATA>');
const podpis = d => ({ tylkoWord: d.tylkoWord.map(bezDaty).sort(), tylkoPdf: d.tylkoPdf.map(bezDaty).sort(), naglowekBrakWPdf: d.naglowekBrakWPdf.map(bezDaty).sort(), zdjeciaTylkoWord: d.zdjeciaTylkoWord.sort(), zdjeciaTylkoPdf: d.zdjeciaTylkoPdf.sort() });
const pusta = r => Object.values(r).every(a => !a.length);
const krotko = r => Object.entries(r).filter(([, a]) => a.length).map(([k, a]) => k + ': ' + (a.length > 12 ? a.slice(0, 12).join(' ') + ' … (' + a.length + ')' : a.join(' '))).join('; ');

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const url = 'http://127.0.0.1:' + server.address().port, wyniki = {}, bad = [];
  let browser;
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.OEST_BROWSER_PATH ? { executablePath: process.env.OEST_BROWSER_PATH } : {}) });
    const one = async id => {
      const ctx = await browser.newContext({ viewport: { width: 412, height: 900 }, serviceWorkers: 'block' }), pg = await ctx.newPage(), errs = [];
      pg.on('pageerror', e => errs.push(e.message));
      await ctx.addInitScript(() => { localStorage.setItem('oest.account', JSON.stringify({ provider: 'local', id: 't', email: 'demo@example.com', first: 'Greg', last: 'Sarna' })); localStorage.setItem('insp.cfg', JSON.stringify({ insp: 'G. Sarna', email: 'demo@example.com' })); });
      await ctx.addInitScript(przechwyc);
      const zle = m => { bad.push(id + ': ' + m + (errs.length ? ' (błędy strony: ' + errs.join(' | ') + ')' : '')); };
      try {
        await pg.goto(url + '/inspekcje/index.html#ppm=' + id); await pg.waitForLoadState('networkidle');
        await pg.locator('#toQueue').waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
        if (!(await pg.locator('#toQueue').isVisible().catch(() => false))) return zle('brak formularza z przyciskiem Wyślij');
        const vis = s => pg.locator(s).first().isVisible().catch(() => false), idle = () => pg.waitForLoadState('networkidle');
        // ⚙ wysyłki: „nasz raport” (jak raport-ui-check), żeby Flushing dał formularz Word
        if (await vis('#sendCfg')) { await pg.click('#sendCfg'); await pg.locator('.oest-ask [data-a="ok"]').waitFor(); const q = pg.locator('[data-sn="q"]:not([disabled])'); if (await q.count()) await q.check(); await pg.click('.oest-ask [data-a="ok"]'); await pg.locator('.oest-ask').waitFor({ state: 'detached' }).catch(() => {}); }
        if (await vis('#flWeek [data-w="1"]')) await pg.click('#flWeek [data-w="1"]');
        const temps = await pg.locator('#tempList input[data-t]').count();
        for (let i = 0; i < temps; i++) await pg.locator('#tempList input[data-t="' + i + '"]').fill(String(40 + i / 10));
        const zdj = [];
        if (await pg.locator('[data-flcam]').count()) { const f = await jpeg(pg, FOTO.kran, '#2a6'); const [fc] = await Promise.all([pg.waitForEvent('filechooser'), pg.click('[data-flcam="0"]')]); await fc.setFiles(f); zdj.push('kran'); }
        if (await vis('#allOk')) await pg.click('#allOk');
        if (await vis('#ck button[data-s="fail"]')) { await pg.locator('#ck button[data-s="fail"]').nth(1).click(); if (await vis('#ck button[data-r]')) await pg.locator('#ck button[data-r]').first().click(); }
        if (await vis('#faults button[data-f]')) await pg.locator('#faults button[data-f]').first().click();
        if (await vis('#galIn')) { await pg.setInputFiles('#galIn', await jpeg(pg, FOTO.galeria, '#36c')); zdj.push('galeria'); }
        if (await vis('#shGalIn')) { await pg.setInputFiles('#shGalIn', await jpeg(pg, FOTO.kartka, '#c63')); zdj.push('kartka'); }
        // zdjęcia gotowe: tyle miniatur, ile dodano (stan, nie czas)
        await pg.waitForFunction(n => document.querySelectorAll('#photos img, #sheetPhotos img, #flList img, [data-flcam] img').length >= n, zdj.length, { timeout: 10000 }).catch(() => {});
        await idle();
        const zKomentarzem = await vis('#komentarz');
        if (zKomentarzem) await pg.fill('#komentarz', KOMENTARZ);
        if (await vis('#podpis')) await pg.fill('#podpis', 'G. Sarna');
        if (await pg.locator('#toQueue').isDisabled()) return zle('Wyślij zablokowane – test nie umie wypełnić tej inspekcji (' + (await pg.locator('#formHint').textContent().catch(() => '')) + ')');
        await pg.click('#toQueue');
        if (!(await pg.waitForFunction(() => !!window.__raport, null, { timeout: 20000, polling: 100 }).then(() => true, () => false))) return zle('Wyślij nie dodało raportu (PDF + Word) do kolejki');
        const files = await pg.evaluate(readQueue);
        if (!files) return zle('brak raportu w kolejce');
        const word = files.filter(f => f.name.endsWith('.docx')).sort((a, b) => / - basic\.docx$/.test(a.name) - / - basic\.docx$/.test(b.name)), pdf = files.filter(f => f.name.endsWith('.pdf'));
        if (!word.length || !pdf.length) return zle('brak pary Word + PDF: ' + files.map(f => f.name).join(', '));
        const buf = f => Buffer.from(f.data, 'base64'), d = wordPdfDiff(word.map(buf), pdf.map(buf));
        if (process.env.OEST_WORD_PDF_OUT) { fs.mkdirSync(process.env.OEST_WORD_PDF_OUT, { recursive: true }); for (const f of files) fs.writeFileSync(path.join(process.env.OEST_WORD_PDF_OUT, id + ' ' + f.name), buf(f)); }
        const w = { pliki: files.map(f => f.name), slowa: d.slowa, zdjecia: d.zdjecia, dodaneZdjecia: zdj, roznica: podpis(d) };
        if (zKomentarzem) { const k = s => s.replace(/\s+/g, ' ').includes(KOMENTARZ); w.komentarz = { word: k(d.tekstWord), pdf: k(d.tekstPdf) }; }
        if (!d.slowa.word && !d.slowa.pdf && !d.zdjecia.word) zle('raport bez treści i bez zdjęć – nie ma czego porównać');
        if (errs.length) zle('błędy strony');
        wyniki[id] = w;
      } finally { await ctx.close(); }
    };
    const kolejka = [...ids]; await Promise.all(Array.from({ length: NARAZ }, async () => { while (kolejka.length) await one(kolejka.shift()); }));

    // Reactive: ta sama funkcja raportu co w apce (reactive.js → OESTReactiveReport.build), dane z OESTReactiveCore.report
    {
      const ctx = await browser.newContext({ viewport: { width: 412, height: 900 }, serviceWorkers: 'block' }), pg = await ctx.newPage(), errs = [];
      pg.on('pageerror', e => errs.push(e.message));
      await ctx.addInitScript(() => { localStorage.setItem('oest.account', JSON.stringify({ provider: 'local', id: 't', email: 'demo@example.com', first: 'Greg', last: 'Sarna' })); });
      try {
        await pg.goto(url + '/index.html#home'); await pg.waitForFunction(() => window.OESTReactiveReport && window.OESTReactiveCore);
        const out = await pg.evaluate(async ([FOTO, KOMENTARZ]) => {
          const img = ([w, h], kolor) => new Promise(r => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.fillStyle = kolor; x.fillRect(0, 0, w, h); c.toBlob(r, 'image/jpeg', 0.8); });
          const draft = { title: 'Door handle detached', building: 'Tower B', level: '5', room: 'Kitchen', note: KOMENTARZ, status: 'open', requestedBy: 'General requests', beforeMediaIds: ['a'], afterMediaIds: ['b'] };
          draft.reportText = window.OESTReactiveCore.details(draft);
          const fields = window.OESTReactiveCore.report(draft, { first: 'Greg', last: 'Sarna', formSignature: 'G. Sarna' });
          const r = await window.OESTReactiveReport.build(fields, [{ blob: await img(FOTO.przed, '#888'), phase: 'before' }, { blob: await img(FOTO.po, '#444'), phase: 'after' }]);
          const b64 = u => { let s = ''; const a = new Uint8Array(u); for (let i = 0; i < a.length; i += 32768) s += String.fromCharCode.apply(null, a.subarray(i, i + 32768)); return btoa(s); };
          return { name: fields.fileName, docx: b64(r.docx), pdf: b64(r.pdf) };
        }, [FOTO, KOMENTARZ]);
        const d = wordPdfDiff([Buffer.from(out.docx, 'base64')], [Buffer.from(out.pdf, 'base64')]);
        if (process.env.OEST_WORD_PDF_OUT) { fs.writeFileSync(path.join(process.env.OEST_WORD_PDF_OUT, 'REACTIVE ' + out.name + '.docx'), Buffer.from(out.docx, 'base64')); fs.writeFileSync(path.join(process.env.OEST_WORD_PDF_OUT, 'REACTIVE ' + out.name + '.pdf'), Buffer.from(out.pdf, 'base64')); }
        const k = s => s.replace(/\s+/g, ' ').includes(KOMENTARZ);
        wyniki.REACTIVE = { pliki: [out.name + '.docx', out.name + '.pdf'], slowa: d.slowa, zdjecia: d.zdjecia, dodaneZdjecia: ['przed', 'po'], roznica: podpis(d), komentarz: { word: k(d.tekstWord), pdf: k(d.tekstPdf) } };
        if (errs.length) bad.push('REACTIVE: błędy strony: ' + errs.join(' | '));
      } catch (e) { bad.push('REACTIVE: ' + e.message); } finally { await ctx.close(); }
    }
  } finally { if (browser) await browser.close(); await new Promise(r => server.close(r)); }

  // porównanie z listą znanych różnic (quality/baselines/word-pdf.json): tylko dokładnie te różnice, nic nowego, nic zniknięte
  const base = JSON.parse(fs.readFileSync(BASELINE, 'utf8')), known = new Map(base.entries.map(e => [e.id, e])), znane = [];
  for (const id of [...ids, 'REACTIVE']) {
    const w = wyniki[id]; if (!w) { if (!bad.some(b => b.startsWith(id + ':'))) bad.push(id + ': nie sprawdzono'); continue; }
    const key = 'WORD_PDF|' + id, e = known.get(key);
    if (w.komentarz && !(w.komentarz.word && w.komentarz.pdf)) {
      const kk = 'KOMENTARZ|' + id, ek = known.get(kk), opis = 'komentarz z formularza ' + (!w.komentarz.word && !w.komentarz.pdf ? 'nie trafia ani do Worda, ani do PDF' : !w.komentarz.word ? 'nie trafia do Worda' : 'nie trafia do PDF');
      if (!ek || ek.detail !== opis) bad.push(id + ': ' + opis + (ek ? ' (na liście znanych: „' + ek.detail + '”)' : ''));
      else znane.push(kk);
    } else if (known.has('KOMENTARZ|' + id)) bad.push(id + ': komentarz jest już w obu plikach – usuń KOMENTARZ|' + id + ' z quality/baselines/word-pdf.json (lista może tylko maleć)');
    if (pusta(w.roznica)) { if (e) bad.push(id + ': Word i PDF są już identyczne – usuń ' + key + ' z quality/baselines/word-pdf.json (lista może tylko maleć)'); continue; }
    if (!e) { bad.push(id + ': Word ≠ PDF – ' + krotko(w.roznica)); continue; }
    if (JSON.stringify(e.roznica) !== JSON.stringify(w.roznica)) { bad.push(id + ': różnica Word/PDF inna niż na liście znanych – teraz: ' + krotko(w.roznica) + ' | na liście: ' + krotko(e.roznica)); continue; }
    znane.push(key);
  }
  for (const k of known.keys()) { const id = k.split('|')[1]; if (!ids.includes(id) && id !== 'REACTIVE') bad.push(k + ': wpis listy znanych różnic dla raportu, którego nie ma na liście PPM – usuń go'); }
  if (process.env.OEST_WORD_PDF_JSON) fs.writeFileSync(process.env.OEST_WORD_PDF_JSON, JSON.stringify({ wyniki, bledy: bad }, null, 1));
  const zgodne = Object.keys(wyniki).filter(id => pusta(wyniki[id].roznica) && !(wyniki[id].komentarz && !(wyniki[id].komentarz.word && wyniki[id].komentarz.pdf)));
  console.log('Word = PDF: ' + Object.keys(wyniki).length + ' raportów sprawdzonych, identycznych ' + zgodne.length + ', ze znaną różnicą (quality/baselines/word-pdf.json) ' + znane.length + ': ' + (znane.join(', ') || '—'));
  for (const k of znane) { const e = known.get(k); console.log('  ZNANA RÓŻNICA ' + k + ': ' + (e.roznica ? krotko(e.roznica) : e.detail)); }
  if (bad.length) { console.error('WORD PDF UI FAIL (' + bad.length + '):\n- ' + bad.join('\n- ')); process.exitCode = 1; return; }
  console.log('WORD PDF UI PASS: ' + ids.length + ' inspekcji z listy PPM + Reactive, każda para Word/PDF porównana słowo po słowie, kratki ☑/☒, nagłówek/stopka, zdjęcia i komentarz.');
})().catch(e => { console.error(e); process.exitCode = 1; });
