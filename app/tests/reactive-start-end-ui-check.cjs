const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const { chromium } = require('./przegladarka.cjs');
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
  const wav = btoa('RIFF' + '\0'.repeat(40) + 'abcd');
  const plugins = {
    HandoverTools: { startAudio: async () => ({}), stopAudio: async () => ({ data: wav }), transcribe: async () => ({ text: 'pompa numer 12 cieknie przy zaworze, temperatura 54 stopnie' }) },
    Translate: { plToEn: async () => ({ text: 'Pump number 12 is leaking at the valve, temperature 54 °C' }) }
  };
  window.Capacitor = { isNativePlatform: () => true, Plugins: plugins, isPluginAvailable: n => !!plugins[n], registerPlugin: n => plugins[n] || new Proxy({}, { get: (_, k) => k === 'then' ? undefined : () => Promise.reject(Error('UNAVAILABLE')) }), convertFileSrc: x => x };
  window.__askMode = '';
}


// Ekran Reactive wg szkicu Grzegorza (18/11/2026): DATA+TYP i KTO+GDZIE w jednym rzędzie; „Dodaj info na start / na koniec”
// (🎤+ głos, 📝+ tekst, ponumerowane ikonki – stuknięcie = ta jedna notatka, pole tylko wydłużane); Stan/części/kosztorys/Odłóż pod ⋮;
// zdjęcie z galerii z inną datą → pytanie Tak/Nie o zmianę daty zlecenia. Start i koniec mają osobne notatki.
// Uruchomienie: node app/tests/reactive-start-end-ui-check.cjs (po npm run copy-web)
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const B = 'http://127.0.0.1:' + server.address().port; let browser; const errors = [];
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.OEST_BROWSER_PATH ? { executablePath: process.env.OEST_BROWSER_PATH } : {}) });
    const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, serviceWorkers: 'block' });
    await ctx.addInitScript(() => { if (!localStorage.getItem('oest.account')) localStorage.setItem('oest.account', JSON.stringify({ provider: 'local', id: 'rx-se', email: 'demo@example.com', first: 'Greg', last: 'Sarna' })); });
    await ctx.addInitScript(fakePhone);
    const pg = await ctx.newPage(); pg.setDefaultTimeout(8000); pg.on('pageerror', e => errors.push(e.message));
    const until = async (fn, arg) => { for (let i = 0; i < 25; i++) { if (await pg.evaluate(fn, arg)) return true; await pg.waitForTimeout(200); } return false; };
    const ask = () => pg.locator('.oest-ask:not([data-wy-out])');
    const draft = () => pg.evaluate(() => OESTReactiveUI.repository.get().then(d => Object.values(d.reactiveDrafts)[0]));
    const saved = () => pg.waitForFunction(() => document.querySelector('#rxMessage')?.textContent.includes('Szkic zapisany'));

    await pg.goto(B + '/#reactive'); await pg.locator('[data-rx=new]').click(); await pg.locator('[data-rx-field=title]').waitFor();
    const scope = 'rx|' + (await pg.evaluate(() => location.hash)).split('/').pop();
    // ---------- układ ----------
    const box = s => pg.locator(s).first().boundingBox();
    const [d, t] = [await box('[data-rx-field=orderDate]'), await box('[data-rx=row][data-id=type]')];
    check(Math.abs(d.y - t.y) < 30 && t.x > d.x, 'DATA i TYP nie w jednym rzędzie');
    const [k, g] = [await box('[data-rx=row][data-id=who]'), await box('[data-rx=row][data-id=where]')];
    check(Math.abs(k.y - g.y) < 2 && g.x > k.x, 'KTO i GDZIE nie w jednym rzędzie');
    const [pb, pa] = [await box('#rx-before'), await box('#rx-after')];
    check(Math.abs(pb.y - pa.y) < 2 && pa.x > pb.x, 'PRZED i PO nie obok siebie');
    check(await pg.locator('[data-rx=row][data-id=status]').count() === 0, 'Status nadal na ekranie zamiast pod ⋮');
    // ---------- info na start: otwarte od razu, 🎤+ 📝+, pole tylko wydłużane ----------
    check(await pg.locator('#rxNotes .nt-rec').isVisible() && await pg.locator('#rxNotes .nt-add').isVisible(), 'start: brak 🎤+ / 📝+');
    const css = await pg.locator('.rx-info-t').evaluate(e => { const c = getComputedStyle(e); return c.resize + '|' + (e.getBoundingClientRect().width >= e.parentElement.getBoundingClientRect().width - 12) + '|' + c.minWidth; });
    check(/^vertical\|true\|/.test(css), 'start: pole nie jest „tylko wydłużane” na całą szerokość: ' + css);
    // wolny tłumacz + odświeżanie paska w trakcie: wynik tłumaczenia nie może zostać nadpisany drugim przetwarzaniem (Codex #144 P1)
    await pg.evaluate(() => { const t = window.Capacitor.Plugins.Translate, f = t.plToEn; t.plToEn = a => new Promise(r => setTimeout(() => r(f(a)), 900)); });
    await pg.locator('#rxNotes .nt-add').click(); await pg.waitForSelector('.nt-pop textarea');
    await pg.locator('.nt-pop textarea').fill('pompa numer 12 cieknie'); await ask().locator('[data-a=ok]').click();
    await pg.waitForFunction(() => document.querySelector('#rxNotes .nt-list [data-nt-id]')?.textContent === '📝1', null, { timeout: 10000 });
    await pg.evaluate(k => Promise.all([OESTNotatki.summary(k), OESTNotatki.summary(k)]), scope);
    check(await until(k => OESTNotatki.list(k).then(a => a.length === 1 && /Pump number 12/.test(a[0].en) && a[0].pl === 'pompa numer 12 cieknie'), scope), 'start: notatka pisana bez tekstu EN');
    await pg.waitForTimeout(1200); check(await pg.evaluate(k => OESTNotatki.list(k).then(a => a.length === 1 && /Pump number 12/.test(a[0].en) && !a[0].err && a[0].st !== 'busy'), scope), 'start: tłumaczenie notatki pisanej nadpisane drugim przetwarzaniem');
    await pg.locator('#rxNotes .nt-rec').click(); await pg.waitForSelector('.oest-rec'); await pg.waitForTimeout(1200); await pg.locator('.oest-rec button').click();
    await pg.waitForFunction(() => document.querySelectorAll('#rxNotes .nt-list [data-nt-id]').length === 2 && document.querySelectorAll('#rxNotes .nt-list [data-nt-id]')[1].textContent === '🎤2', null, { timeout: 10000 });
    await pg.locator('#rxNotes .nt-list [data-nt-id]').first().click(); await pg.waitForSelector('.nt-pop .nt-note');
    check(await pg.locator('.nt-pop .nt-note').count() === 1 && await pg.locator('.nt-pop [data-nt=edit]').count() === 1 && await pg.locator('.nt-pop .nt-del, .nt-pop [data-nt=del]').count() === 1, 'ikonka: okienko nie z tą jedną notatką (edycja/usuwanie)');
    await ask().locator('[data-a=ok]').click(); await pg.waitForSelector('.oest-ask', { state: 'detached' });
    // przerwana poprawka notatki 1 (Popraw → Wstecz) nie otwiera się po stuknięciu ikonki 2 (Codex #144)
    await pg.locator('#rxNotes .nt-list [data-nt-id]').first().click(); await pg.locator('.nt-pop [data-nt=edit]').click(); await pg.waitForSelector('.nt-pop textarea[data-nt-f=en]');
    await pg.keyboard.press('Escape'); await pg.waitForSelector('.nt-pop', { state: 'detached' });
    await pg.locator('#rxNotes .nt-list [data-nt-id]').nth(1).click(); await pg.waitForSelector('.nt-pop .nt-note');
    check(await pg.locator('.nt-pop textarea').count() === 0 && await pg.locator('.nt-pop [data-nt=play]').count() === 1, 'ikonka 2: otwarła się przerwana poprawka notatki 1');
    await ask().locator('[data-a=ok]').click(); await pg.waitForSelector('.oest-ask', { state: 'detached' });
    await pg.locator('#rxNotes .nt-list [data-nt-id]').first().click(); await pg.waitForSelector('.nt-pop textarea[data-nt-f=en]');
    await ask().locator('[data-nt=cancel]').click(); await ask().locator('[data-a=ok]').click(); await pg.waitForSelector('.oest-ask', { state: 'detached' });
    await pg.locator('[data-rx-field=note]').fill('Leak at pump 12.'); await saved();
    if (SHOTS) { await pg.locator('#rxNotes').scrollIntoViewIfNeeded(); await pg.screenshot({ path: path.join(SHOTS, 'reactive-start-notatki.png') }); }
    // ---------- info na koniec: osobne notatki ----------
    await pg.locator('[data-rx=row][data-id=end]').click(); await pg.locator('#rxNotesEnd .nt-add').waitFor();
    // sekcje niezależne (Grzegorz 22/11/2026 „tak”): otwarcie „na koniec” nie zwija „na start” z 🎤 i notatkami
    check(await pg.locator('#rxNotes .nt-rec').isVisible() && await pg.locator('#rxNotesEnd .nt-rec').isVisible(), 'otwarcie „na koniec” zwinęło „na start” (mikrofon zniknął)');
    await pg.locator('[data-rx=row][data-id=start]').click(); await pg.locator('#rxNotes').waitFor({ state: 'detached' });
    check(await until(() => (document.querySelector('[data-ntc=start]') || {}).hidden === false && /^🎤 2( · 📷 \d+)?$/.test(document.querySelector('[data-ntc=start]').textContent)), 'zwinięte „na start”: brak licznika 🎤 2 na nagłówku');
    check(await pg.evaluate(() => { const n = document.querySelectorAll('#rx-before img').length, t = document.querySelector('[data-ntc=start]').textContent; return n ? t.endsWith('📷 ' + n) : !/📷/.test(t); }), 'zwinięte „na start”: liczba zdjęć przed nie zgadza się z kartą');
    check(await pg.locator('#rxNotesEnd .nt-rec').isVisible(), 'zwinięcie „na start” zwinęło też „na koniec”');
    await pg.locator('[data-rx=row][data-id=start]').click(); await pg.locator('#rxNotes .nt-rec').waitFor();
    await pg.locator('#rxNotesEnd .nt-add').click(); await pg.waitForSelector('.nt-pop textarea');
    await pg.locator('.nt-pop textarea').fill('wymieniono uszczelkę'); await ask().locator('[data-a=ok]').click();
    await pg.waitForFunction(() => document.querySelector('#rxNotesEnd .nt-list [data-nt-id]')?.textContent === '📝1', null, { timeout: 10000 });
    check(await until(k => Promise.all([OESTNotatki.list(k), OESTNotatki.list(k + '|end')]).then(([a, b]) => a.length === 2 && b.length === 1), scope), 'start/koniec: notatki pomieszane');
    await pg.locator('[data-rx-field=endNote]').fill('Seal replaced.'); await saved();
    { const x = await draft(); check(x.note === 'Leak at pump 12.' && x.endNote === 'Seal replaced.', 'szkic: brak note/endNote'); }
    check(await pg.evaluate(() => /Work done: Seal replaced\./.test(OESTReactiveCore.details({ title: 'x', building: 'Premises', requestedBy: 'self', note: 'a', endNote: 'Seal replaced.' }))), 'raport: brak „Work done”');
    // ---------- ⋮: stan, części, kosztorys, Odłóż ----------
    await pg.locator('[data-rx=row][data-id=more]').click();
    check(await pg.locator('[data-rx=status]').count() >= 3 && await pg.locator('[data-rx-field=quote]').count() === 1 && await pg.locator('[data-rx=park]').count() === 1, '⋮: brak stanu / kosztorysu / Odłóż');
    await pg.locator('[data-rx=row][data-id=more]').click();
    // ---------- data ze zdjęcia z galerii ----------
    const pick = (day) => pg.evaluate(day => { const c = document.createElement('canvas'); c.width = 64; c.height = 48; return new Promise(r => c.toBlob(b => { const f = new File([b], 'p.jpg', { type: 'image/jpeg', lastModified: new Date(day + 'T10:00:00').getTime() }), dt = new DataTransfer(); dt.items.add(f); const el = document.querySelector('[data-rx-photos=before]'); el.files = dt.files; el.dispatchEvent(new Event('change')); r(); }, 'image/jpeg')); }, day);
    const today = await pg.locator('[data-rx-field=orderDate]').inputValue();
    await pick(today); await pg.waitForFunction(() => document.querySelectorAll('#rx-before img').length === 1, null, { timeout: 10000 });
    check(await ask().count() === 0, 'data: pytanie mimo tej samej daty');
    await pick('2026-11-03'); await ask().waitFor();
    check(/03\/11\/2026/.test(await ask().textContent()), 'data: w pytaniu brak daty zdjęcia');
    await ask().locator('[data-a=no]').click(); await pg.waitForFunction(() => document.querySelectorAll('#rx-before img').length === 2, null, { timeout: 10000 });
    check(await pg.locator('[data-rx-field=orderDate]').inputValue() === today, 'data: „Nie” zmieniło datę');
    await pick('2026-11-05'); await ask().waitFor(); await ask().locator('[data-a=ok]').click();
    await pg.waitForFunction(() => document.querySelectorAll('#rx-before img').length === 3, null, { timeout: 10000 });
    check(await pg.locator('[data-rx-field=orderDate]').inputValue() === '2026-11-05', 'data: „Tak” nie zmieniło daty w polu');
    await pg.waitForTimeout(400); check((await draft()).orderDate === '2026-11-05', 'data: „Tak” nie zapisało daty w szkicu');
    if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, 'reactive-start-end.png'), fullPage: true });
    // ---------- EN ----------
    await pg.evaluate(() => window.OESTSettings.update(s => { s.appearance.language = 'en'; })); await pg.reload(); await pg.locator('#rxNotes .nt-add').waitFor();
    const en = await pg.locator('#v-reactive .rx-body').innerText();
    check(/Add info on start/.test(en) && /Add info on end/.test(en) && /Voice/.test(en) && !/[ąćęłńóśźż]/i.test(en.replace(/pompa.*|wymieniono.*/g, '')), 'EN: ekran nie po angielsku');
  } catch (e) { fails.push('wyjątek: ' + (e && e.stack || e)); }
  finally { if (browser) await browser.close(); server.close(); }
  if (errors.length) fails.push('błędy strony: ' + errors.join(' | '));
  if (fails.length) { console.error('REACTIVE START/END UI FAIL\n- ' + fails.join('\n- ')); process.exitCode = 1; }
  else console.log('REACTIVE START/END UI PASS: DATA+TYP i KTO+GDZIE w rzędzie, PRZED|PO obok, info na start/koniec (🎤+ 📝+, ikonki, jedna notatka w okienku, osobne notatki start/koniec, pole tylko wydłużane), Work done w raporcie, ⋮ stan/kosztorys/Odłóż, data ze zdjęcia Tak/Nie, EN');
})();
