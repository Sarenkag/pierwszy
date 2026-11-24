// Przeglądarka raportów w klocku „Raporty” (etap 2b, Grzegorz 08/11/2026):
// - lista raportów z telefonu, najnowsze na górze, klocki (czesci/Klocek.vue, Ionic),
// - szukanie (kod / budynek / data) i filtr budynku,
// - PL/EN: wpisane szukanie zostaje, pole i lista nie skaczą,
// - stuknięcie: podgląd (ion-modal) treści Worda (tekst i zdjęcie), adresaci jak ⚙ wysyłki (domyślnie firmowy),
// - Wyślij: do kolejki maili idzie ten sam Word + PDF, bez ponownego zapisu archiwum (noArchive),
// - inne konto nie widzi cudzych raportów.
// Wynik NIE zastępuje sprawdzenia na Pixelu 8 Pro ani prawdziwej wysyłki Gmail / Dysku.
const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), assert = require('node:assert/strict');
const { chromium } = require('./przegladarka.cjs');
const root = path.resolve(__dirname, '../www');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  let p = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(root + path.sep) && p !== root) { res.writeHead(403).end(); return; }
  if (req.url.split('?')[0].endsWith('/')) p = path.join(p, 'index.html');
  fs.readFile(p, (e, b) => { if (e) { res.writeHead(404).end(); return; } res.setHeader('Content-Type', TYPES[path.extname(p)] || 'application/octet-stream'); res.end(b); });
});
const ACCOUNT = { provider: 'local', id: 'test', email: 'demo@example.com', first: 'Greg', last: 'Sarna' };
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const url = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ headless: true, ...(process.env.OEST_BROWSER_PATH ? { executablePath: process.env.OEST_BROWSER_PATH } : {}) });
  const errors = [];
  let passed = 0; const ok = (c, m) => { assert.ok(c, m); passed++; };
  try {
    const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 1 });
    await ctx.addInitScript(a => { if (!localStorage.getItem('oest.account')) localStorage.setItem('oest.account', a); }, JSON.stringify(ACCOUNT));
    const p = await ctx.newPage(); p.on('pageerror', e => errors.push(e.message));
    await p.goto(url + '/#home'); await p.locator('#oest-szkielet .oest-jezyk ion-button').first().waitFor(); // ekran główny (Ionic + Vue) gotowy
    // dane jak po wysłaniu: profil z adresami, 3 raporty (Word z tekstem i zdjęciem) + 1 cudzy
    await p.evaluate(async png => {
      OESTSettings.update(s => { s.profile.companyEmail = 'work@firma.com'; s.profile.privateEmail = 'me@home.com'; return s; });
      const img = Uint8Array.from(atob(png), c => c.charCodeAt(0));
      function docx(title, rows) {
        const z = new PizZip();
        const p = t => '<w:p><w:r><w:t>' + t + '</w:t></w:r></w:p>';
        z.file('word/document.xml', '<w:document><w:body>' + p(title) + '<w:tbl>' + rows.map(r => '<w:tr>' + r.map(c => '<w:tc>' + p(c) + '</w:tc>').join('') + '</w:tr>').join('') + '</w:tbl>' + p('Tap 3 &amp; 4 OK') + '</w:body></w:document>');
        z.file('word/media/image1.png', img);
        return z.generate({ type: 'uint8array' });
      }
      const db = await new Promise((res, rej) => { const rq = indexedDB.open('oest-raporty', 1); rq.onupgradeneeded = () => rq.result.createObjectStore('raporty', { keyPath: 'id' }); rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error); });
      const t = db.transaction('raporty', 'readwrite'), st = t.objectStore('raporty');
      const rec = (owner, name, folder, sentAt, extra) => Object.assign({ id: owner + '|' + name, owner, name, key: name, file: name, folder, docx: docx('WEEKLY TAPS/SHOWER FLUSHING RECORD ' + name, [['Tap', 'Result'], ['Kitchen L13', 'Yes']]), pdf: new Uint8Array(50).fill(1), meta: { code: name.split(' ')[0], sentAt }, created: new Date(sentAt).toISOString(), updated: new Date(sentAt).toISOString(), versions: 1, driveId: 'abc123', driveName: name + '.docx', dirty: false, bytes: 500 }, extra || {});
      st.put(rec('demo@example.com', 'Weekly Flushing TB 06112026', ['Tower B', 'Weekly Flushing'], Date.parse('2026-11-06T10:00:00')));
      st.put(rec('demo@example.com', 'ATS TB 07112026', ['Tower B', 'ATS'], Date.parse('2026-11-07T10:00:00'), { driveId: '', dirty: true }));
      st.put(rec('demo@example.com', 'DB-TA-L5 08112026', ['Tower A', 'Distribution Boards'], Date.parse('2026-11-08T09:00:00'), { versions: 2 }));
      st.put(rec('other@example.com', 'Secret 08112026', ['Pavilion', 'X'], Date.parse('2026-11-08T11:00:00')));
      st.put(rec('demo@example.com', 'REACTIVE Leak 01112026', ['Reactive'], Date.parse('2026-11-01T09:00:00'), { meta: { type: 'reactive', sentAt: Date.parse('2026-11-01T09:00:00') } }));
      await new Promise(r => { t.oncomplete = r; });
    }, PNG);

    await p.evaluate(()=>OESTEkrany.go('settings/my-reports')); await p.locator('#rptList ion-card').first().waitFor(); await p.waitForTimeout(300);
    const L = '#rptList ion-card', M = 'ion-modal', A = 'ion-alert';
    const names = () => p.$$eval('#rptList ion-card h2', a => a.map(e => e.textContent.trim()));
    // wybór budynku jak użytkownik: ion-select → lista (ion-popover) → opcja
    const budynek = async t => { await p.locator('#rptB').click(); const o = p.locator('ion-popover ion-item', { hasText: t }).first(); await o.waitFor(); await o.click(); await p.locator('ion-popover').waitFor({ state: 'detached' }); await p.waitForTimeout(120); };
    const szukaj = async t => { await p.locator('#rptQ input').fill(t); await p.waitForTimeout(120); };
    const zamknijAlert = async tekst => { const d = p.locator(A, { hasText: tekst }); await d.waitFor(); const t = await d.locator('.alert-message').innerText(); await d.locator('.alert-button').last().click(); await p.waitForFunction(() => !document.querySelector('ion-alert')); return t; };
    const toggle = k => p.evaluate(k => { const t = document.querySelector('ion-modal [data-to=' + k + ']'); return { on: !!t.checked, off: !!t.disabled }; }, k);
    ok(JSON.stringify(await names()) === JSON.stringify(['DB-TA-L5 08112026', 'ATS TB 07112026', 'Weekly Flushing TB 06112026', 'REACTIVE Leak 01112026']), 'lista: najnowsze na górze, bez cudzego raportu');
    const pills = await p.locator(L + ' ion-badge:not([color=light])').allTextContents();
    ok(pills[0] === 'Na Dysku' && pills[1] === 'Czeka na Dysk', 'status: Na Dysku / Czeka na Dysk');
    ok(/wersja 2/.test(await p.locator(L).first().innerText()), 'raport wysłany ponownie: „wersja 2”');

    await szukaj('tb');
    ok((await names()).length === 2, 'szukanie „tb”: 2 raporty Tower B');
    await budynek('Reactive');
    ok(JSON.stringify(await names()) === JSON.stringify([]), 'szukanie + filtr Reactive: nic');
    await budynek('Wszystkie');
    await szukaj('06/11/2026');
    ok(JSON.stringify(await names()) === JSON.stringify(['Weekly Flushing TB 06112026']), 'szukanie po dacie dd/mm/rrrr');
    await szukaj(''); await budynek('Tower A');
    ok(JSON.stringify(await names()) === JSON.stringify(['DB-TA-L5 08112026']), 'filtr budynku Tower A');
    await budynek('Wszystkie'); await szukaj('ats');

    // PL/EN: tekst się zmienia, wpisane szukanie zostaje, układ nie skacze
    const jezyk = p.locator('ion-header ion-toolbar ion-buttons[slot=end] ion-button').last();
    const box = () => p.evaluate(() => { const r = e => { const b = document.querySelector(e).getBoundingClientRect(); return [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)].join(','); }; return [r('#rptQ'), r('#rptB'), r('#rptList ion-card')].join('|'); });
    const plBox = await box();
    await jezyk.click(); await p.waitForTimeout(250);
    ok(await p.inputValue('#rptQ input') === 'ats', 'EN: wpisane szukanie zostaje');
    ok(/Code, building/.test(await p.getAttribute('#rptQ input', 'placeholder')) && /Waiting for Drive/.test(await p.locator('#rptList').innerText()), 'EN: teksty po angielsku');
    ok(await box() === plBox, 'PL/EN: pole szukania, wybór budynku i klocek w tym samym miejscu');
    await jezyk.click(); await p.waitForTimeout(250);
    await szukaj('');

    // podgląd i Wyślij
    await p.evaluate(() => { window.__q = []; OESTSender.active = () => true; OESTSender.enqueue = it => { window.__q.push({ ...it, docx: it.docx.length, pdf: it.pdf.length }); return Promise.resolve(it); }; });
    await p.locator(L, { hasText: 'Weekly Flushing TB' }).click();
    const dlg = p.locator(M); await dlg.locator('#rptView').waitFor(); await p.waitForTimeout(400);
    const txt = await dlg.innerText();
    ok(/WEEKLY TAPS\/SHOWER FLUSHING RECORD/.test(txt) && /Kitchen L13 \| Yes/.test(txt) && /Tap 3 & 4 OK/.test(txt), 'podgląd: tekst Worda (tabela w wierszu)');
    ok(await dlg.locator('#rptPics ion-img').count() === 1, 'podgląd: zdjęcie z raportu');
    ok(/drive\.google\.com\/file\/d\/abc123/.test(await p.evaluate(() => document.querySelector('ion-modal #rptDrive').href)), 'Otwórz na Dysku');
    const t0 = { sm: await toggle('sm'), sp: await toggle('sp'), se: await toggle('se') };
    ok(t0.sm.on && !t0.sp.on && t0.se.off, 'adresaci: domyślnie firmowy, inżynier bez adresu nieaktywny');
    await dlg.locator('[data-to=sp]').click(); await p.waitForTimeout(100);
    await dlg.locator('ion-footer ion-button', { hasText: 'Wyślij' }).click();
    await zamknijAlert('W kolejce');
    const q = await p.evaluate(() => window.__q);
    ok(q.length === 1 && q[0].noArchive === true && q[0].docx > 0 && q[0].pdf === 50 && q[0].name === 'Weekly Flushing TB 06112026', 'Wyślij: ten sam Word + PDF do kolejki, bez ponownego archiwum');
    ok(JSON.stringify(q[0].toList.slice().sort()) === JSON.stringify(['me@home.com', 'work@firma.com']), 'Wyślij: zaznaczeni adresaci');

    // Reactive: tylko firmowy e-mail (PROD-025)
    await p.waitForFunction(() => !document.querySelector('ion-modal'));
    await p.locator(L, { hasText: 'REACTIVE Leak' }).click(); await p.locator(M + ' #rptView').waitFor(); await p.waitForTimeout(300);
    { const sp = await toggle('sp'), sm = await toggle('sm'); ok(sp.off && sm.on && /tylko firmowy/.test(await p.locator(M).innerText()), 'Reactive: tylko firmowy e-mail'); }
    await p.locator(M + ' ion-footer ion-button', { hasText: 'Wyślij' }).click();
    await zamknijAlert('W kolejce');
    ok(JSON.stringify((await p.evaluate(() => window.__q))[1].toList) === JSON.stringify(['work@firma.com']), 'Reactive: wysłany tylko na firmowy');
    // kolejka odmówiła (np. brak miejsca): komunikat, nic nie udajemy
    await p.evaluate(() => { OESTSender.enqueue = () => Promise.reject(new Error('QuotaExceededError')); });
    await p.waitForFunction(() => !document.querySelector('ion-modal'));
    await p.locator(L, { hasText: 'DB-TA-L5' }).click(); await p.locator(M + ' #rptView').waitFor(); await p.waitForTimeout(300); await p.locator(M + ' ion-footer ion-button', { hasText: 'Wyślij' }).click();
    ok(/Nie udało się dodać raportu do kolejki/.test(await zamknijAlert('Nie wysłano')), 'błąd kolejki: komunikat');
    // raport bez kopii na Dysku: bez linku „Otwórz na Dysku”
    await p.waitForFunction(() => !document.querySelector('ion-modal'));
    await p.locator(L, { hasText: 'ATS TB' }).click(); await p.locator(M + ' #rptView').waitFor(); await p.waitForTimeout(300);
    ok(await p.locator(M + ' #rptDrive').count() === 0, 'bez kopii na Dysku: brak linku');
    await p.locator(M + ' ion-footer ion-button', { hasText: 'Zamknij' }).click(); await p.waitForFunction(() => !document.querySelector('ion-modal'));
    ok((await p.evaluate(() => window.__q.length)) === 2, 'Zamknij nic nie wysyła');
    // szukanie to nie zmiana ustawień: Wstecz bez pytania o niezapisane zmiany
    await szukaj('flush'); await p.locator('ion-header ion-back-button').click(); await p.waitForTimeout(400);
    ok(await p.locator(A).count() === 0 && /#settings$/.test(p.url()), 'po szukaniu Wstecz bez „niezapisanych zmian”');

    assert.deepEqual(errors, [], 'błędy strony');
    console.log('RAPORTY PRZEGLĄDARKA PASS: ' + passed + ' sprawdzeń (lista, szukanie, filtr, PL/EN bez przesunięć, podgląd tekst + zdjęcie, Wyślij do kolejki, inne konto)');
    await ctx.close();
  } finally { await browser.close(); server.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
