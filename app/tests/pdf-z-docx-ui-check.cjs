// Plan audytu 19/11/2026, punkt 1.4 (ustalenie nr 8, etap 1): PDF raportu powstał z TYCH SAMYCH bajtów Worda, który idzie mailem.
// Zasada (Grzegorz 04/11 i 20/11/2026, PROD-023): Word i PDF identyczne – PDF z tego samego wypełnionego Worda (moduly/word-pdf → zWorda,
// silnik LibreOffice w telefonie). W przeglądarce silnika nie ma, więc test podstawia wtyczkę LibreOffice (Capacitor.Plugins.LibreOffice.toPdf),
// która zapisuje skrót SHA-256 otrzymanego Worda w zwróconym PDF. Potem dla KAŻDEJ inspekcji EFA-INS z listy PPM i dla raportu Reactive:
// każdy PDF, który ma obok siebie Word o tej samej nazwie, musi być PDF-em z wtyczki, a skrót w nim = SHA-256 tego Worda (bajt w bajt).
// PDF narysowany osobnym rysownikiem (buildPdf, buildPhotoPdf, buildFlushPdf, OESTWordPdf.pdf) albo z innego Worda = rozbieżność.
// Rozbieżności, które już są w apce, są na liście quality/baselines/pdf-z-docx.json (lista może tylko maleć):
// nowa = FAIL, z listy, której już nie ma = FAIL (usuń wpis), inspekcja, której nie da się sprawdzić = FAIL.
// NIE sprawdza: czy prawdziwy silnik LibreOffice na Pixelu daje dobry PDF (to workflow „PDF z Worda – emulator” i telefon).
const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), crypto = require('node:crypto');
const { chromium } = require(process.env.OEST_PLAYWRIGHT_PATH || 'playwright'), root = path.resolve(__dirname, '../www');
const { inspections } = require('./ppm-lista.cjs');
const BASELINE = path.resolve(__dirname, '../../quality/baselines/pdf-z-docx.json');
const ZNACZNIK = '%OEST-ZWORDA ';
const server = http.createServer((req, res) => {
  const p = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(root + path.sep) && p !== root) { res.writeHead(403).end(); return; }
  const file = p === root ? path.join(root, 'index.html') : p;
  fs.readFile(file, (e, b) => { if (e) { res.writeHead(404).end(); return; } res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.docx') ? 'application/octet-stream' : 'text/html; charset=utf-8'); res.end(b); });
});
// atrapa wtyczki LibreOffice: PDF z wpisanym skrótem otrzymanego Worda (tylko do sprawdzenia, z czego powstał PDF)
const wtyczka = znacznik => {
  const hex = b => Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join('');
  window.Capacitor = Object.assign(window.Capacitor || {}, {
    isPluginAvailable: n => n === 'LibreOffice',
    Plugins: Object.assign((window.Capacitor && window.Capacitor.Plugins) || {}, { LibreOffice: { toPdf: async ({ docx }) => {
      const s = atob(docx), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
      return { pdf: btoa('%PDF-1.4\n' + znacznik + hex(await crypto.subtle.digest('SHA-256', u)) + '\n%%EOF\n') };
    } } })
  });
};
const przechwyc = () => { const put = IDBObjectStore.prototype.put; IDBObjectStore.prototype.put = function (v) { try { if (this.name === 'queue' && v && Array.isArray(v.files) && v.files.some(f => /\.pdf$/.test(f.name))) window.__raport = v.files.map(f => ({ name: f.name, bytes: f.bytes ? new Uint8Array(f.bytes instanceof ArrayBuffer ? f.bytes : f.bytes.buffer ? new Uint8Array(f.bytes.buffer, f.bytes.byteOffset, f.bytes.byteLength) : f.bytes).slice() : null })); } catch (e) {} return put.apply(this, arguments); }; };
const readQueue = () => { const b64 = u => { let s = ''; for (let i = 0; i < u.length; i += 32768) s += String.fromCharCode.apply(null, u.subarray(i, i + 32768)); return btoa(s); }; return window.__raport ? window.__raport.map(f => ({ name: f.name, data: f.bytes ? b64(f.bytes) : '' })) : null; };
const jpeg = (pg, [w, h], kolor) => pg.evaluate(([w, h, kolor]) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.fillStyle = kolor; x.fillRect(0, 0, w, h); return c.toDataURL('image/jpeg', 0.8).split(',')[1]; }, [w, h, kolor]).then(b => ({ name: 'foto-' + w + '.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(b, 'base64') }));
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
// pary Word + PDF o tej samej nazwie: PDF ma pochodzić z wtyczki i z tych samych bajtów Worda
function sprawdzPary(id, pliki, roz, sp) {
  const buf = f => Buffer.from(f.data, 'base64'), word = new Map(pliki.filter(f => f.name.endsWith('.docx')).map(f => [f.name.slice(0, -5), f]));
  let par = 0;
  for (const p of pliki.filter(f => f.name.endsWith('.pdf'))) {
    const w = word.get(p.name.slice(0, -4)); if (!w) continue; par++;
    const tekst = buf(p).toString('latin1'), i = tekst.indexOf(ZNACZNIK), czesc = p.name.replace(/^.*?( - [^.]+)?\.pdf$/, (_, s) => s ? s.slice(3) : 'raport');
    if (i < 0) roz.push({ id: 'rysownik:' + id + ':' + czesc, opis: id + ': „' + p.name + '” narysowany osobno, nie z Worda „' + w.name + '”' });
    else if (tekst.slice(i + ZNACZNIK.length, i + ZNACZNIK.length + 64) !== sha(buf(w))) roz.push({ id: 'inny-word:' + id + ':' + czesc, opis: id + ': „' + p.name + '” powstał z innych bajtów niż wysyłany Word „' + w.name + '”' });
    else sp(true, '');
  }
  sp(par > 0, id + ': w raporcie nie ma żadnej pary Word + PDF o tej samej nazwie (' + pliki.map(f => f.name).join(', ') + ')');
}

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const url = 'http://127.0.0.1:' + server.address().port, bad = [], roz = [], ids = inspections(root), sprawdzone = [];
  let browser, sprawdzen = 0;
  const sp = (ok, m) => { sprawdzen++; if (!ok) bad.push(m); return ok; };
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.OEST_BROWSER_PATH ? { executablePath: process.env.OEST_BROWSER_PATH } : {}) });
    const nowy = async () => {
      const ctx = await browser.newContext({ viewport: { width: 412, height: 900 }, serviceWorkers: 'block' }), pg = await ctx.newPage(), errs = [];
      pg.on('pageerror', e => errs.push(e.message));
      await ctx.addInitScript(() => { localStorage.setItem('oest.account', JSON.stringify({ provider: 'local', id: 't', email: 'demo@example.com', first: 'Greg', last: 'Sarna' })); localStorage.setItem('insp.cfg', JSON.stringify({ insp: 'G. Sarna', email: 'demo@example.com' })); });
      await ctx.addInitScript(wtyczka, ZNACZNIK); await ctx.addInitScript(przechwyc);
      return { ctx, pg, errs };
    };
    const one = async id => {
      const { ctx, pg, errs } = await nowy(), zle = m => bad.push(id + ': ' + m + (errs.length ? ' (błędy strony: ' + errs.join(' | ') + ')' : ''));
      try {
        await pg.goto(url + '/inspekcje/index.html#ppm=' + id); await pg.waitForLoadState('networkidle');
        await pg.locator('#toQueue').waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
        if (!(await pg.locator('#toQueue').isVisible().catch(() => false))) return zle('brak formularza z przyciskiem Wyślij');
        sp(await pg.evaluate(() => !!(window.OESTWordPdf && window.OESTWordPdf.dostepny())), id + ': atrapa silnika LibreOffice nie jest widoczna dla moduly/word-pdf');
        const vis = s => pg.locator(s).first().isVisible().catch(() => false);
        // ⚙ wysyłki: „nasz raport” – formularz Word idzie w raporcie (jak raport-ui-check i word-pdf-ui-check)
        if (await vis('#sendCfg')) { await pg.click('#sendCfg'); await pg.locator('.oest-ask [data-a="ok"]').waitFor(); const q = pg.locator('[data-sn="q"]:not([disabled])'); if (await q.count()) await q.check(); await pg.click('.oest-ask [data-a="ok"]'); await pg.locator('.oest-ask').waitFor({ state: 'detached' }).catch(() => {}); }
        if (await vis('#flWeek [data-w="1"]')) await pg.click('#flWeek [data-w="1"]');
        const temps = await pg.locator('#tempList input[data-t]').count();
        for (let i = 0; i < temps; i++) await pg.locator('#tempList input[data-t="' + i + '"]').fill(String(40 + i / 10));
        if (await vis('#allOk')) await pg.click('#allOk');
        if (await vis('#galIn')) await pg.setInputFiles('#galIn', await jpeg(pg, [176, 132], '#36c'));
        const kartkaIn = (await vis('#shGalIn')) ? '#shGalIn' : (await vis('label:has(#shCamIn)')) ? '#shCamIn' : '';
        if (kartkaIn) await pg.setInputFiles(kartkaIn, await jpeg(pg, [150, 212], '#c63'));
        await pg.waitForLoadState('networkidle');
        if (await vis('#podpis')) await pg.fill('#podpis', 'G. Sarna');
        await pg.waitForFunction(() => !document.querySelector('#toQueue').disabled, null, { timeout: 15000 }).catch(() => {});
        if (await pg.locator('#toQueue').isDisabled()) return zle('Wyślij zablokowane (' + (await pg.locator('#formHint').textContent().catch(() => '')) + ')');
        await pg.click('#toQueue');
        if (!(await pg.waitForFunction(() => !!window.__raport, null, { timeout: 20000, polling: 100 }).then(() => true, () => false))) return zle('Wyślij nie dodało raportu do kolejki');
        const pliki = await pg.evaluate(readQueue);
        if (!pliki) return zle('brak raportu w kolejce');
        sprawdzPary(id, pliki, roz, sp);
        sp(!errs.length, id + ': błędy strony: ' + errs.join(' | '));
        sprawdzone.push(id);
      } finally { await ctx.close(); }
    };
    const kolejka = [...ids], NARAZ = Math.max(1, +(process.env.OEST_RAPORT_NARAZ || 3));
    await Promise.all(Array.from({ length: NARAZ }, async () => { while (kolejka.length) await one(kolejka.shift()); }));
    // Reactive: ta sama funkcja raportu co w apce (OESTReactiveReport.build)
    {
      const { ctx, pg, errs } = await nowy();
      try {
        await pg.goto(url + '/index.html#home'); await pg.waitForFunction(() => window.OESTReactiveReport && window.OESTReactiveCore);
        const out = await pg.evaluate(async () => {
          const img = ([w, h], kolor) => new Promise(r => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.fillStyle = kolor; x.fillRect(0, 0, w, h); c.toBlob(r, 'image/jpeg', 0.8); });
          const draft = { title: 'Door handle detached', building: 'Tower B', level: '5', room: 'Kitchen', note: 'PDF from Word check', status: 'open', requestedBy: 'General requests', beforeMediaIds: ['a'], afterMediaIds: ['b'], vantify: { id: 3123456, status: 'approval_pending' } };
          draft.reportText = window.OESTReactiveCore.details(draft);
          const fields = window.OESTReactiveCore.report(draft, { first: 'Greg', last: 'Sarna', formSignature: 'G. Sarna' });
          const r = await window.OESTReactiveReport.build(fields, [{ blob: await img([208, 156], '#888'), phase: 'before' }, { blob: await img([224, 168], '#444'), phase: 'after' }]);
          const b64 = u => { let s = ''; const a = new Uint8Array(u); for (let i = 0; i < a.length; i += 32768) s += String.fromCharCode.apply(null, a.subarray(i, i + 32768)); return btoa(s); };
          return [{ name: fields.fileName + '.docx', data: b64(r.docx) }, { name: fields.fileName + '.pdf', data: b64(r.pdf) }];
        });
        sprawdzPary('REACTIVE', out, roz, sp);
        sp(!errs.length, 'REACTIVE: błędy strony: ' + errs.join(' | '));
        sprawdzone.push('REACTIVE');
      } catch (e) { bad.push('REACTIVE: ' + e.message); } finally { await ctx.close(); }
    }
  } finally { if (browser) await browser.close(); server.close(); }
  sp(sprawdzone.length === ids.length + 1, 'sprawdzono ' + sprawdzone.length + ' z ' + (ids.length + 1) + ' raportów (pominięcie to nie PASS)');
  const base = JSON.parse(fs.readFileSync(BASELINE, 'utf8')), known = new Set(base.entries.map(e => e.id)), now = new Set(roz.map(r => r.id));
  for (const r of roz) if (!known.has(r.id)) bad.push('nowa rozbieżność spoza listy ' + path.basename(BASELINE) + ': ' + r.id + ' – ' + r.opis);
  for (const k of known) if (!now.has(k)) bad.push('wpis ' + k + ' z listy ' + path.basename(BASELINE) + ' już nie występuje – usuń go (lista maleje)');
  if (process.env.OEST_DEBUG) console.log(JSON.stringify(roz, null, 1));
  if (bad.length) { console.error('PDF Z DOCX UI FAIL:\n - ' + bad.join('\n - ')); process.exit(1); }
  console.log('PDF Z DOCX UI PASS: ' + sprawdzone.length + ' raportów (inspekcje EFA-INS z listy PPM + Reactive), PDF z tych samych bajtów Worda; znane rozbieżności z listy: ' + roz.length + '; ' + sprawdzen + ' sprawdzeń');
})().catch(e => { console.error('PDF Z DOCX UI FAIL:', e && e.stack || e); process.exit(1); });
