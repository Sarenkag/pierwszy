// Przyciski Vantify na karcie Reactive (Grzegorz 18/11/2026 „Tak”, PROD-038), scenariusz Grzegorza z 18/11:
// haczyki na drzwiach biura w Tower B. Open Vantify: podgląd Summary/Description po angielsku (z miejscem), pierwszy raz okno
// Vantify z tekstem do skopiowania i numer zlecenia z okna; potem apka zakłada sama (bez PDF). „Czeka na zatwierdzenie” = sprawdź.
// Close Vantify: braki → Wróć / Zamknij mimo to; świeży odczyt – inna nazwa w Vantify = stop bez wysyłki; Job Sheet tylko PDF,
// pytanie „Tak, zamknij”, potem „✓ Zamknięte w Vantify” dopiero po potwierdzeniu z Vantify. Ukryte okno Vantify = atrapa.
// Uruchomienie: node app/tests/reactive-vantify-ui-check.cjs (po npm run copy-web)
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const { chromium } = require(process.env.OEST_PLAYWRIGHT_PATH || 'playwright');
const root = path.resolve(__dirname, '../www'), SHOTS = process.env.OEST_SHOTS || '';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  let p = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0]));
  if (p === root) p = path.join(root, 'index.html');
  if (!p.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(p, (e, b) => { if (e) { res.writeHead(404).end(); return; } res.setHeader('Content-Type', TYPES[path.extname(p)] || 'application/octet-stream'); res.end(b); });
});
const fails = [], check = (ok, msg) => { if (!ok) fails.push(msg); };
function fakePhone() {
  window.__vt = { calls: [], wzory: {}, next: [], open: null };
  const V = {
    wzory: async () => ({ ...window.__vt.wzory }),
    action: async o => { window.__vt.calls.push(JSON.parse(JSON.stringify(o.action))); const n = window.__vt.next.shift(); return typeof n === 'function' ? n(o.action) : n || { status: 'error', code: 'brak' }; },
    open: async o => { window.__vt.calls.push({ op: 'window', ...o }); return window.__vt.open || { events: [] }; }
  };
  const plugins = { Vantify: V, Translate: { plToEn: async ({ text }) => ({ text: 'EN ' + text }) } };
  window.Capacitor = { isNativePlatform: () => true, Plugins: plugins, registerPlugin: n => plugins[n] || new Proxy({}, { get: (_, k) => k === 'then' ? undefined : () => Promise.reject(Error('UNAVAILABLE')) }), convertFileSrc: x => x };
}
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const B = 'http://127.0.0.1:' + server.address().port; let browser; const errors = [];
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.OEST_BROWSER_PATH ? { executablePath: process.env.OEST_BROWSER_PATH } : {}) });
    const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, serviceWorkers: 'block' });
    await ctx.addInitScript(() => { if (!localStorage.getItem('oest.account')) localStorage.setItem('oest.account', JSON.stringify({ provider: 'local', id: 'rx-vt', email: 'demo@example.com', first: 'Greg', last: 'Sarna' })); });
    await ctx.addInitScript(fakePhone);
    const pg = await ctx.newPage(); pg.setDefaultTimeout(10000); pg.on('pageerror', e => errors.push(e.message));
    const ask = () => pg.locator('.oest-ask:not([data-wy-out])');
    const gone = () => pg.waitForSelector('.oest-ask', { state: 'detached' });
    const msg = re => pg.waitForFunction(r => new RegExp(r).test(document.querySelector('#rxMessage')?.textContent || ''), re.source);
    const saved = () => pg.waitForFunction(() => document.querySelector('#rxMessage')?.textContent.includes('Szkic zapisany'));
    const row = id => pg.locator('[data-rx=row][data-id=' + id + ']').click();
    const calls = () => pg.evaluate(() => window.__vt.calls);
    const jobs = () => pg.evaluate(() => OESTReactiveUI.repository.get().then(d => d.jobs));
    const photo = path.join(require('node:os').tmpdir(), 'rx-vt-' + process.pid + '.png');
    await pg.goto(B + '/#reactive');
    const png = await pg.evaluate(() => { const c = document.createElement('canvas'); c.width = 320; c.height = 240; const x = c.getContext('2d'); x.fillStyle = '#987'; x.fillRect(0, 0, 320, 240); return c.toDataURL('image/png').split(',')[1]; });
    fs.writeFileSync(photo, Buffer.from(png, 'base64'));
    async function job(title) {
      await pg.locator('[data-rx=new]').click(); await pg.locator('[data-rx-field=title]').waitFor();
      await pg.locator('[data-rx-field=title]').fill(title); await saved();
      await row('where'); await pg.locator('[data-rx=building][data-value="Tower B"]').click(); await pg.locator('[data-rx-field=level]').selectOption('5'); await pg.locator('[data-rx-field=room]').fill('Office door');
      await row('start'); await pg.locator('[data-rx-field=note]').fill('Proszę o 10 haczyków na drzwiach biura.'); await saved();
      await pg.locator('[data-rx-photos=before]').setInputFiles(photo); await pg.waitForFunction(() => document.querySelector('#rx-before img'));
    }
    // ---------- 1. nowe zadanie: dwa przyciski Vantify, ta sama wielkość ----------
    await job('Haczyki na drzwiach biura');
    const [o, c] = [await pg.locator('[data-rx=vt-open]').boundingBox(), await pg.locator('[data-rx=vt-close]').boundingBox()];
    check(o && c && Math.abs(o.width - c.width) < 2 && Math.abs(o.height - c.height) < 2 && Math.abs(o.y - c.y) < 2, 'Open/Close Vantify nie w jednym rzędzie albo różnej wielkości');
    check(await pg.locator('[data-rx=vt-open]').textContent() === 'Open Vantify', 'brak „Open Vantify”');
    await pg.locator('[data-rx=vt-close]').click(); await msg(/Najpierw Open Vantify/);
    check((await calls()).length === 0, 'Close bez założenia coś wysłało');
    // ---------- 2. Open pierwszy raz: podgląd EN → okno Vantify z tekstem → numer z okna ----------
    // w oknie Grzegorz poprawił nazwę – karta ma zapisać Summary z Vantify, nie z podglądu (przegląd Codex #146)
    await pg.evaluate(() => { window.__vt.open = { events: [{ op: 'create', id: '3070001', t: 1 }] }; window.__vt.next.push({ status: 'ok', jobs: [{ id: 3070001, status: 'approval_pending', final: false, summary: 'Coat hooks – office door, Tower B' }] }); });
    await pg.locator('[data-rx=vt-open]').click(); await ask().locator('.rx-vt-sum').waitFor();
    const sum = await ask().locator('.rx-vt-sum').inputValue(), desc = await ask().locator('.rx-vt-desc').inputValue();
    check(/^EN Haczyki na drzwiach biura$/.test(sum), 'Summary nie przetłumaczone: ' + sum);
    check(/EN Proszę o 10 haczyków/.test(desc) && /Location: Tower B, 5, EN Office door/.test(desc), 'Description bez tłumaczenia albo miejsca: ' + desc);
    await ask().locator('.rx-vt-sum').fill('Coat hooks on office door – Tower B');
    if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, 'reactive-vantify-podglad.png') });
    await ask().locator('[data-a=ok]').click(); await ask().locator('[data-a=ok]').waitFor();
    check(/Pierwszy raz/.test(await ask().textContent()), 'pierwszy raz: brak wyjaśnienia');
    await ask().locator('[data-a=ok]').click();
    await pg.waitForFunction(() => /✓ Vantify #3070001/.test(document.querySelector('[data-rx=vt-check]')?.textContent || ''));
    { const k = await calls(); check(k.length === 2 && k[0].op === 'window' && k[1].op === 'status' && k[1].ids[0] === 3070001 && k[0].hash === '#/user/jobs/add//site' && k[0].summary === 'Coat hooks on office door – Tower B' && /Location: Tower B/.test(k[0].description) && !k[0].fileB64, 'okno Vantify: zły adres/tekst albo PDF przy zakładaniu: ' + JSON.stringify(k)); }
    { const j = (await jobs()).find(x => x.reactive?.vantify); check(j && j.reactive.vantify.id === 3070001 && j.reactive.vantify.status === 'approval_pending' && j.reactive.vantify.summary === 'Coat hooks – office door, Tower B', 'numer zlecenia albo Summary z Vantify nie zapisane w zadaniu: ' + JSON.stringify(j && j.reactive.vantify)); }
    check(/Czeka na zatwierdzenie/.test(await pg.locator('.rx-vt-row').textContent()), 'brak „Czeka na zatwierdzenie”');
    // drugi raz Open się nie da: stuknięcie = sprawdzenie statusu
    await pg.evaluate(() => { window.__vt.next.push({ status: 'ok', jobs: [{ id: 3070001, status: 'approval_pending', final: false, summary: 'Coat hooks – office door, Tower B' }] }); });
    await pg.locator('[data-rx=vt-check]').first().click(); await msg(/Vantify #3070001: czeka na zatwierdzenie/);
    { const k = await calls(); check(k.length === 3 && k[2].op === 'status' && k[2].ids[0] === 3070001 && k[2].site === 6324 && k[2].nonce, 'sprawdzenie: złe zapytanie ' + JSON.stringify(k[2])); }
    // ---------- 2b. zadanie zakończone w apce, zlecenie czeka w Vantify: przyciski Vantify zostają (przegląd Codex #146) ----------
    { const id = await pg.evaluate(async () => { const R = OESTReactiveUI.repository, j = (await R.get()).jobs.find(x => x.reactive?.vantify?.id === 3070001); await R.saveReactive({ ...j.reactive, status: 'completed' }); return j.id; });
      const at0 = (await jobs()).find(x => x.id === id).closedAt;
      await pg.goto(B + '/#reactive/job/' + id); await pg.reload(); await pg.locator('.rx-vt-row').waitFor();
      check(/Czeka na zatwierdzenie/.test(await pg.locator('.rx-vt-row').textContent()), 'zakończone w apce: brak przycisków Vantify');
      await pg.waitForTimeout(50);
      await pg.evaluate(() => { window.__vt.calls = []; window.__vt.next.push({ status: 'ok', jobs: [{ id: 3070001, status: 'acknowledged', final: false, summary: 'Coat hooks – office door, Tower B' }] }); });
      await pg.locator('.rx-vt-row [data-rx=vt-check]').nth(1).click(); await msg(/zatwierdzone – można zamknąć/);
      const j = (await jobs()).find(x => x.id === id);
      check(j.reactive.status === 'completed' && j.reactive.vantify.status === 'acknowledged' && j.closedAt === at0, 'zakończone w apce: sprawdzenie Vantify zmieniło stan zadania albo datę zakończenia ' + JSON.stringify({ s: j.reactive.status, v: j.reactive.vantify, a: [at0, j.closedAt] }));
      check(await pg.locator('[data-rx=vt-close].go').count() === 1, 'zakończone w apce: Close Vantify niedostępny po zatwierdzeniu'); }
    // ---------- 3. Open z wzorem: apka zakłada sama ----------
    await pg.locator('[data-rx=back]').first().click().catch(() => {}); await pg.goto(B + '/#reactive'); await pg.locator('[data-rx=new]').waitFor();
    await pg.evaluate(() => { window.__vt.calls = []; window.__vt.wzory = { create: true }; window.__vt.next.push({ status: 'error', code: 'timeout' }, { status: 'error', code: 'http422', msg: 'Invalid' }, { status: 'ok', id: 3070002, job: { id: 3070002, status: 'approval_pending', summary: 'EN Wieszaki w kuchni' }, photos: 1, photosSeen: 1 }); });
    await job('Wieszaki w kuchni');
    // 3a. brak odpowiedzi: karta pamięta „mogło powstać” (przegląd Codex #146)
    await pg.locator('[data-rx=vt-open]').click(); await ask().locator('.rx-vt-sum').waitFor(); await ask().locator('[data-a=ok]').click();
    await msg(/Brak odpowiedzi z Vantify/);
    { const j = (await jobs()).find(x => x.reactive?.title === 'Wieszaki w kuchni'); check(j && j.reactive.vantify && j.reactive.vantify.pending === true && !j.reactive.vantify.id && j.reactive.vantify.summary === 'EN Wieszaki w kuchni', 'brak odpowiedzi: karta nie pamięta niepewnego zakładania ' + JSON.stringify(j && j.reactive.vantify)); }
    check(await pg.locator('[data-rx=vt-open].rx-vt-off').count() === 1, 'niepewne zakładanie: Open Vantify bez wyszarzenia');
    // 3b. ponowne Open: najpierw pytanie, czy na pewno (zlecenie mogło powstać); Wróć = nic nie wysłane
    await pg.locator('[data-rx=vt-open]').click(); await ask().waitFor();
    check(/mogło już powstać/.test(await ask().textContent()), 'ponowne Open bez ostrzeżenia o możliwym duplikacie');
    await ask().locator('[data-a=no]').click(); await gone();
    check((await calls()).length === 1, 'Wróć przy niepewnym zakładaniu coś wysłało');
    // 3c. „Załóż mimo to” → Vantify odmówił (HTTP 4xx) = pewnie nie założone → karta wraca do zwykłego „Open Vantify”
    await pg.locator('[data-rx=vt-open]').click(); await ask().locator('[data-a=ok]').click(); await ask().locator('.rx-vt-sum').waitFor(); await ask().locator('[data-a=ok]').click();
    await msg(/Vantify nie przyjął: Invalid/);
    { const j = (await jobs()).find(x => x.reactive?.title === 'Wieszaki w kuchni'); check(j && !j.reactive.vantify, 'odmowa 4xx: karta dalej „niepewna”'); }
    // 3d. zakładanie udane – ze zdjęciem przed (Grzegorz 20/11/2026: „przy zakładaniu zdjęcie i opis”), bez Job Sheet
    await pg.locator('[data-rx=vt-open]').click(); await ask().locator('.rx-vt-sum').waitFor();
    check(/Zdjęcia przed: 1/.test(await ask().locator('.rx-vt-photos').textContent()), 'okno Open Vantify nie mówi o zdjęciu przed');
    await ask().locator('[data-a=ok]').click();
    await pg.waitForFunction(() => /✓ Vantify #3070002/.test(document.querySelector('.rx-vt-row')?.textContent || ''));
    await msg(/Założone w Vantify #3070002\. Czeka na zatwierdzenie/);
    { const k = await calls(); check(k.length === 3 && k.every(c => c.op === 'create') && k[0].summary === 'EN Wieszaki w kuchni' && /EN Proszę/.test(k[0].description) && !('file' in k[0]), 'zakładanie: złe zapytanie ' + JSON.stringify(k)); }
    { const k = await calls(); check(new Set(k.map(c => c.nonce)).size === 3, 'ponowne zakładanie z tym samym nonce'); }
    { const k = await calls(), f = k[2].files || []; check(f.length === 1 && /^image\//.test(f[0].type) && f[0].title === 'Before photo 1' && /^Before-photo-1\.(jpg|png)$/.test(f[0].name) && f[0].b64.length > 100 && !k.some(c => c.file), 'zakładanie: zdjęcie przed nie poszło (albo poszedł PDF) ' + JSON.stringify(f.map(x => ({ ...x, b64: x.b64 && x.b64.length })))); }
    { const k = await calls(); check(k.length === 3 && k[0].op === 'create' && k[0].summary === 'EN Wieszaki w kuchni' && /EN Proszę/.test(k[0].description) && !('file' in k[0]), 'zakładanie: złe zapytanie ' + JSON.stringify(k)); }
    // ---------- 4. Close: braki → Wróć ----------
    await pg.evaluate(() => { window.__vt.calls = []; window.__vt.wzory = { create: true, commence: true, complete: true }; window.__vt.next.push({ status: 'ok', jobs: [{ id: 3070002, status: 'acknowledged', final: false, summary: 'EN Wieszaki w kuchni' }] }); });
    await pg.locator('[data-rx=vt-check]').first().click(); await msg(/zatwierdzone – można zamknąć/);
    check(await pg.locator('[data-rx=vt-close].go').count() === 1, 'po zatwierdzeniu Close Vantify nieaktywny');
    await pg.locator('[data-rx=vt-close]').click(); await ask().waitFor();
    check(/Brakuje: zdjęć po, info na koniec/.test(await ask().textContent()), 'braki: brak pytania');
    await ask().locator('[data-a=no]').click(); await gone();
    check((await calls()).length === 1, 'Wróć mimo to coś wysłało');
    // ---------- 5. inna nazwa w Vantify → stop, nic nie wysłane ----------
    await pg.locator('[data-rx-photos=after]').setInputFiles(photo); await pg.waitForFunction(() => document.querySelector('#rx-after img'));
    await row('end'); await pg.locator('[data-rx-field=endNote]').fill('10 hooks installed.'); await saved();
    await pg.evaluate(() => { window.__vt.calls = []; window.__vt.next.push({ status: 'ok', jobs: [{ id: 3070002, status: 'acknowledged', final: false, summary: 'Something else' }] }); });
    await pg.locator('[data-rx=vt-close]').click(); await msg(/inną nazwę: „Something else”\. Nic nie wysłałem/);
    { const k = await calls(); check(k.length === 1 && k[0].op === 'status', 'inna nazwa: poszło coś poza odczytem'); }
    // ---------- 6. zamknięcie: Job Sheet PDF, „Tak, zamknij”, potwierdzenie z Vantify ----------
    // data zdjęcia z modułu zdjęć (pole created), nie z pliku (plik w raporcie jest już bez EXIF) – przegląd Codex #146
    // zdjęcie z wczoraj, zadanie w apce z wczoraj, zlecenie w Vantify dziś: daty z wczoraj (granica = data zadania w apce, PROD-038)
    const y = new Date(Date.now() - 86400000), ymdY = y.getFullYear() + '-' + String(y.getMonth() + 1).padStart(2, '0') + '-' + String(y.getDate()).padStart(2, '0');
    await pg.locator('[data-rx-field=orderDate]').fill(ymdY); await pg.locator('[data-rx-field=orderDate]').dispatchEvent('change'); await saved();
    const shot = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 12, 0, 0).getTime();
    await pg.evaluate(t => { const Z = window.OESTZdjecia, o = Z.list.bind(Z); Z.list = async (...a) => (await o(...a)).map(r => ({ ...r, created: new Date(t).toISOString() })); }, shot);
    // okno podsumowania przed zamknięciem (PROD-039): „Popraw” wraca do karty i nic nie wysyła
    await pg.evaluate(() => { window.__vt.calls = []; window.__vt.next.push({ status: 'ok', jobs: [{ id: 3070002, status: 'acknowledged', final: false, summary: 'EN Wieszaki w kuchni' }] }); });
    await pg.locator('[data-rx=vt-close]').click(); await pg.locator('[data-rx=sum-ok]').waitFor({ timeout: 20000 });
    if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, 'reactive-podsumowanie.png') });
    { const t = await pg.locator('.rx-body').innerText(), p = await pg.locator('[data-rx-sum]').evaluateAll(a => a.map(x => x.value).join('\n'));
      check(/^EN /.test(p) && /EN 10 hooks installed/.test(p) && /\.pdf\)/.test(t) && !/docx/.test(t), 'podsumowanie Close Vantify: treść nie po angielsku albo plik nie tylko PDF ' + p); }
    check(/Zgadzam się, zamknij/.test(await pg.locator('[data-rx=sum-ok]').textContent()) && await pg.locator('[data-rx=sum-del]').count() > 0, 'okno podsumowania: brak ✕ albo „Zgadzam się, zamknij”');
    await pg.locator('[data-rx=back]').click(); await pg.locator('[data-rx=vt-close]').waitFor();
    { const k = await calls(); check(k.length === 1 && k[0].op === 'status', 'Popraw w podsumowaniu coś wysłało ' + JSON.stringify(k)); }
    await pg.evaluate(() => { window.__vt.calls = []; window.__vt.next.push({ status: 'ok', jobs: [{ id: 3070002, status: 'acknowledged', final: false, summary: 'EN Wieszaki w kuchni' }] }, { status: 'ok', job: { id: 3070002, status: 'completed', final: true }, closed: true, fileSeen: false }); });
    await pg.evaluate(() => { window.__rep = []; const K = window.OESTReactiveCore, R = K.report; K.report = function (d, ...a) { window.__rep.push(JSON.parse(JSON.stringify(d))); return R.call(this, d, ...a); }; });
    await pg.locator('[data-rx=vt-close]').click(); await pg.locator('[data-rx=sum-ok]').waitFor({ timeout: 20000 });
    { const dd = String(y.getDate()).padStart(2, '0') + String(y.getMonth() + 1).padStart(2, '0') + y.getFullYear(); check(new RegExp(dd + ' \\(\\.pdf\\)').test(await pg.locator('.rx-body').innerText()), 'podsumowanie: data pliku inna niż w PDF (zdjęcie z wczoraj)'); }
    await pg.locator('[data-rx=sum-ok]').click(); await ask().locator('[data-a=ok]').waitFor({ timeout: 20000 });
    { const r = await pg.evaluate(() => window.__rep.at(-1) || {}); check(r.room === 'EN Office door' && /^EN 10 hooks installed/.test(r.endNote || '') && r.title === 'EN Wieszaki w kuchni', 'Job Sheet: pola wpisane ręcznie nie po angielsku ' + JSON.stringify({ room: r.room, endNote: r.endNote, title: r.title })); }
    const q = await ask().textContent();
    check(/Commence \(jeśli trzeba\) i Complete z datą \d\d\/\d\d\/\d{4}/.test(q) && /REACTIVE EN Wieszaki w kuchni \d{8}\.pdf/.test(q), 'pytanie przed zamknięciem bez daty/pliku PDF albo nazwa nie po angielsku (Summary z Vantify): ' + q);
    check(!/docx/i.test(q), 'przy zamknięciu Word zamiast tylko PDF');
    await ask().locator('[data-a=ok]').click();
    // Vantify zamknął, ale pliku nie widać: karta pamięta to na stałe („⚠ Brak pliku”), stuknięcie sprawdza plik znowu (przegląd Codex #146)
    await pg.waitForFunction(() => /⚠ Brak pliku w Vantify/.test(document.querySelector('.rx-vt-row')?.textContent || ''), null, { timeout: 15000 });
    await msg(/nie widzę pliku przy zleceniu/);
    { const k = await calls(), cl = k[1] || {}; const pdf = cl.file && Buffer.from(cl.file.b64, 'base64').subarray(0, 5).toString();
      check(k.length === 2 && cl.op === 'close' && cl.id === 3070002 && cl.summary === 'EN Wieszaki w kuchni' && pdf === '%PDF-' && cl.file.type === 'application/pdf' && /\.pdf$/.test(cl.file.name) && cl.onSite && cl.done && cl.onSite <= cl.done && cl.done === new Date(shot).toISOString(), 'zamknięcie: złe zapytanie ' + JSON.stringify({ ...cl, file: cl.file && { ...cl.file, b64: (cl.file.b64 || '').length } })); }
    { const j = (await jobs()).find(x => x.reactive?.vantify?.id === 3070002); check(j && j.reactive.vantify.final && j.reactive.vantify.closedAt && j.reactive.vantify.fileSeen === false && /REACTIVE EN Wieszaki/.test(j.reactive.vantify.sheetTitle || ''), 'zamknięcie / brak pliku nie zapisane w zadaniu ' + JSON.stringify(j && j.reactive.vantify)); }
    await pg.evaluate(() => { window.__vt.calls = []; window.__vt.next.push({ status: 'ok', jobs: [{ id: 3070002, status: 'completed', final: true, summary: 'EN Wieszaki w kuchni', fileSeen: true }] }); });
    await pg.locator('.rx-vt-row [data-rx=vt-check]').nth(1).click(); await msg(/Job Sheet jest przy zleceniu/);
    await pg.waitForFunction(() => /✓ Zamknięte w Vantify/.test(document.querySelector('.rx-vt-row')?.textContent || ''));
    { const k = await calls(); check(k.length === 1 && k[0].op === 'status' && /REACTIVE EN Wieszaki/.test(k[0].fileTitle || ''), 'ponowne sprawdzenie pliku: złe zapytanie ' + JSON.stringify(k)); }
    if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, 'reactive-vantify-zamkniete.png') });
    // ---------- 7. Vantify nie potwierdził → bez „✓” ----------
    // (sprawdzone na module: wynik bez closed nie zmienia stanu na zamknięte)
    const notClosed = await pg.evaluate(() => OESTReactiveVantify.state({ vantify: { id: 1, status: 'commenced' } }));
    check(notClosed === 'open', 'stan „commenced” uznany za zamknięty');
    // ---------- 7b. zdjęcie przed z karty zniknęło (np. wyczyszczone) → nie zakłada bez niego (przegląd Codex #166) ----------
    await pg.goto(B + '/#reactive'); await job('Brak zdjęcia');
    await pg.evaluate(() => new Promise((res, rej) => { const r = indexedDB.open('oest-handover'); r.onsuccess = () => { const tx = r.result.transaction('media', 'readwrite'); tx.objectStore('media').clear(); tx.oncomplete = () => { r.result.close(); res(); }; tx.onerror = () => rej(tx.error); }; }));
    await pg.evaluate(() => { window.__vt.calls = []; window.__vt.wzory = { create: true }; });
    await pg.locator('[data-rx=vt-open]').click(); await ask().locator('.rx-vt-sum').waitFor(); await ask().locator('[data-a=ok]').click();
    await msg(/Brakuje zdjęcia/);
    check((await calls()).length === 0, 'brak zdjęcia przed: mimo to coś wysłane do Vantify');
    check(await pg.locator('[data-rx=vt-open]:not(.rx-vt-off)').count() === 1, 'brak zdjęcia przed: karta w stanie „zakładam”');
    // ---------- 8. EN ----------
    await pg.evaluate(() => window.OESTSettings.update(s => { s.appearance.language = 'en'; })); await pg.goto(B + '/#reactive'); await pg.locator('[data-rx=new]').waitFor();
    await pg.locator('[data-rx=new]').click(); await pg.locator('.rx-vt-row').waitFor();
    const en = await pg.locator('.rx-vt-row').innerText();
    check(/Open Vantify/.test(en) && /Close Vantify/.test(en) && !/[ąćęłńóśźż]/i.test(en), 'EN: przyciski nie po angielsku: ' + en);
  } catch (e) { fails.push('wyjątek: ' + (e && e.stack || e)); }
  finally { if (browser) await browser.close(); server.close(); }
  if (errors.length) fails.push('błędy strony: ' + errors.join(' | '));
  if (fails.length) { console.error('REACTIVE VANTIFY UI FAIL\n- ' + fails.join('\n- ')); process.exitCode = 1; }
  else console.log('REACTIVE VANTIFY UI PASS: Open/Close Vantify w jednym rzędzie, podgląd EN z miejscem, pierwszy raz w oknie Vantify (numer z okna, bez PDF), potem zakładanie samo, „Czeka na zatwierdzenie” = sprawdź, braki Wróć/Zamknij mimo to, inna nazwa = stop, Job Sheet tylko PDF, „✓ Zamknięte” po potwierdzeniu, EN');
})();
