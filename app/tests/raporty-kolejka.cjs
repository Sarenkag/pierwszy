// Wspólny dla testów raportów z kolejki (plan audytu 1.4 i 1.5): wypełnia KAŻDĄ inspekcję EFA-INS z listy PPM jak użytkownik
// (wszystko OK, temperatury, zdjęcie ogólne i kartki, podpis, ⚙ „nasz raport”), klika Wyślij i zwraca pliki zapisane w kolejce wysyłki;
// do tego raport Reactive z OESTReactiveReport.build (ta sama funkcja co w apce). Nie jest testem (nazwa bez -ui-check / .test).
// zbierz({ wtyczka }) – wtyczka: true = atrapa silnika LibreOffice (Capacitor.Plugins.LibreOffice.toPdf), która zapisuje
// w zwracanym PDF znacznik ZNACZNIK + SHA-256 otrzymanego Worda; false = bez silnika (PDF z rysownika, jak w przeglądarce).
// Wynik: { raporty: [{ id, pliki: [{ name, data(base64) }], errs }], bledy: [tekst] } – inspekcja, której nie da się wysłać, trafia do bledy.
'use strict';
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const { inspections } = require('./ppm-lista.cjs');
const root = path.resolve(__dirname, '../www'), ZNACZNIK = '%OEST-ZWORDA ';
const wtyczkaLO = znacznik => {
  const hex = b => Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join('');
  window.Capacitor = Object.assign(window.Capacitor || {}, {
    isPluginAvailable: n => n === 'LibreOffice',
    Plugins: Object.assign((window.Capacitor && window.Capacitor.Plugins) || {}, { LibreOffice: { toPdf: async ({ docx }) => {
      const s = atob(docx), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
      // poprawny 1-stronicowy PDF ze znacznikiem w treści strony – przeżywa sklejanie kilku PDF (pdf-lib, Flushing: firma + basic)
      const c = znacznik + hex(await crypto.subtle.digest('SHA-256', u)) + '\nBT ET', obj = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
        '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R >>', '<< /Length ' + c.length + ' >>\nstream\n' + c + '\nendstream'];
      let p = '%PDF-1.4\n'; const off = []; obj.forEach((o, i) => { off.push(p.length); p += (i + 1) + ' 0 obj\n' + o + '\nendobj\n'; });
      const x = p.length; p += 'xref\n0 5\n0000000000 65535 f \n' + off.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('') + 'trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n' + x + '\n%%EOF\n';
      return { pdf: btoa(p) };
    } } })
  });
};
const przechwyc = () => { const put = IDBObjectStore.prototype.put; IDBObjectStore.prototype.put = function (v) { try { if (this.name === 'queue' && v && Array.isArray(v.files) && v.files.some(f => /\.pdf$/.test(f.name))) window.__raport = v.files.map(f => ({ name: f.name, bytes: f.bytes ? new Uint8Array(f.bytes instanceof ArrayBuffer ? f.bytes : f.bytes.buffer ? new Uint8Array(f.bytes.buffer, f.bytes.byteOffset, f.bytes.byteLength) : f.bytes).slice() : null })); } catch (e) {} return put.apply(this, arguments); }; };
const readQueue = () => { const b64 = u => { let s = ''; for (let i = 0; i < u.length; i += 32768) s += String.fromCharCode.apply(null, u.subarray(i, i + 32768)); return btoa(s); }; return window.__raport ? window.__raport.map(f => ({ name: f.name, data: f.bytes ? b64(f.bytes) : '' })) : null; };
const jpeg = (pg, [w, h], kolor) => pg.evaluate(([w, h, kolor]) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.fillStyle = kolor; x.fillRect(0, 0, w, h); return c.toDataURL('image/jpeg', 0.8).split(',')[1]; }, [w, h, kolor]).then(b => ({ name: 'foto-' + w + '.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(b, 'base64') }));

async function zbierz({ wtyczka = false } = {}) {
  const { chromium } = require(process.env.OEST_PLAYWRIGHT_PATH || 'playwright');
  const server = http.createServer((req, res) => {
    const p = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0]));
    if (!p.startsWith(root + path.sep) && p !== root) { res.writeHead(403).end(); return; }
    const file = p === root ? path.join(root, 'index.html') : p;
    fs.readFile(file, (e, b) => { if (e) { res.writeHead(404).end(); return; } res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.docx') ? 'application/octet-stream' : 'text/html; charset=utf-8'); res.end(b); });
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const url = 'http://127.0.0.1:' + server.address().port, ids = inspections(root), raporty = [], bledy = [];
  let browser;
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.OEST_BROWSER_PATH ? { executablePath: process.env.OEST_BROWSER_PATH } : {}) });
    const nowy = async () => {
      const ctx = await browser.newContext({ viewport: { width: 412, height: 900 }, serviceWorkers: 'block' }), pg = await ctx.newPage(), errs = [];
      pg.on('pageerror', e => errs.push(e.message));
      await ctx.addInitScript(() => { localStorage.setItem('oest.account', JSON.stringify({ provider: 'local', id: 't', email: 'demo@example.com', first: 'Greg', last: 'Sarna' })); localStorage.setItem('insp.cfg', JSON.stringify({ insp: 'G. Sarna', email: 'demo@example.com' })); });
      if (wtyczka) await ctx.addInitScript(wtyczkaLO, ZNACZNIK);
      await ctx.addInitScript(przechwyc);
      return { ctx, pg, errs };
    };
    const one = async id => {
      const { ctx, pg, errs } = await nowy(), zle = m => bledy.push(id + ': ' + m + (errs.length ? ' (błędy strony: ' + errs.join(' | ') + ')' : ''));
      try {
        await pg.goto(url + '/inspekcje/index.html#ppm=' + id); await pg.waitForLoadState('networkidle');
        await pg.locator('#toQueue').waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
        if (!(await pg.locator('#toQueue').isVisible().catch(() => false))) return zle('brak formularza z przyciskiem Wyślij');
        if (wtyczka && !(await pg.evaluate(() => !!(window.OESTWordPdf && window.OESTWordPdf.dostepny())))) return zle('atrapa silnika LibreOffice nie jest widoczna dla moduly/word-pdf');
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
        raporty.push({ id, pliki, errs: errs.slice() });
      } finally { await ctx.close(); }
    };
    const kolejka = [...ids], NARAZ = Math.max(1, +(process.env.OEST_RAPORT_NARAZ || 3));
    await Promise.all(Array.from({ length: NARAZ }, async () => { while (kolejka.length) await one(kolejka.shift()); }));
    // Reactive: ta sama funkcja raportu co w apce (OESTReactiveReport.build)
    const { ctx, pg, errs } = await nowy();
    try {
      await pg.goto(url + '/index.html#home'); await pg.waitForFunction(() => window.OESTReactiveReport && window.OESTReactiveCore);
      const pliki = await pg.evaluate(async () => {
        const img = ([w, h], kolor) => new Promise(r => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.fillStyle = kolor; x.fillRect(0, 0, w, h); c.toBlob(r, 'image/jpeg', 0.8); });
        const draft = { title: 'Door handle detached', building: 'Tower B', level: '5', room: 'Kitchen', note: 'Report check', status: 'open', requestedBy: 'General requests', beforeMediaIds: ['a'], afterMediaIds: ['b'], vantify: { id: 3123456, status: 'approval_pending' } };
        draft.reportText = window.OESTReactiveCore.details(draft);
        const fields = window.OESTReactiveCore.report(draft, { first: 'Greg', last: 'Sarna', formSignature: 'G. Sarna' });
        const r = await window.OESTReactiveReport.build(fields, [{ blob: await img([208, 156], '#888'), phase: 'before' }, { blob: await img([224, 168], '#444'), phase: 'after' }]);
        const b64 = u => { let s = ''; const a = new Uint8Array(u); for (let i = 0; i < a.length; i += 32768) s += String.fromCharCode.apply(null, a.subarray(i, i + 32768)); return btoa(s); };
        return [{ name: fields.fileName + '.docx', data: b64(r.docx) }, { name: fields.fileName + '.pdf', data: b64(r.pdf) }];
      });
      raporty.push({ id: 'REACTIVE', pliki, errs: errs.slice() });
    } catch (e) { bledy.push('REACTIVE: ' + e.message); } finally { await ctx.close(); }
  } finally { if (browser) await browser.close(); server.close(); }
  return { raporty, bledy, oczekiwane: ids.length + 1 };
}
module.exports = { zbierz, ZNACZNIK };
