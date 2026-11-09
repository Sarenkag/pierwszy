// Notatki głosowe w Reactive i Hand over (moduly/notatki, Grzegorz 09/11/2026: „Tak, w obu” – to samo co w inspekcji:
// 🎤 Nagraj notatkę, okienko 📝 Notatki, „Połącz” w opis / we wpis; stare nagrania zostają tam, gdzie są).
// Prawdziwa apka z paczki app/www; wtyczki telefonu (nagranie, mowa → tekst, tłumacz) podstawione jak w notatki-ui-check.cjs.
// Reactive: nowe zadanie → 🎤 (stuknij, Zakończ) → licznik 1 → 📝 okienko (EN + PL) → ✨ Połącz → okienko propozycji →
//   „Wstaw do opisu” → opis i zapisany szkic mają tekst → ‹ wstecz nie kasuje szkicu z notatką → zadanie otwarte ponownie
//   ma tę samą notatkę → stare nagranie (sprzed zmiany) nadal widać z „Na tekst” → „Usuń szkic” usuwa też notatki.
// Hand over: ten sam pasek, „Połącz” wstawia do pustego pola i zaznacza „po angielsku”. Ekran EN: napisy po angielsku.
// Uruchomienie: OEST_PLAYWRIGHT_PATH=… OEST_BROWSER_PATH=… node app/tests/notatki-app-ui-check.cjs  (po npm run copy-web)
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
  const wav = btoa('RIFF' + '\0'.repeat(40) + 'abcd');
  const plugins = {
    HandoverTools: { startAudio: async () => ({}), stopAudio: async () => ({ data: wav }), transcribe: async () => ({ text: 'pompa numer 12 cieknie przy zaworze, temperatura 54 stopnie' }) },
    Translate: { plToEn: async () => ({ text: 'Pump number 12 is leaking at the valve, temperature 54 °C' }) }
  };
  window.Capacitor = { isNativePlatform: () => true, Plugins: plugins, registerPlugin: n => plugins[n] || new Proxy({}, { get: (_, k) => k === 'then' ? undefined : () => Promise.reject(Error('UNAVAILABLE')) }), convertFileSrc: x => x };
  window.__askMode = '';
}

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const B = 'http://127.0.0.1:' + server.address().port; let browser; const errors = [];
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.OEST_BROWSER_PATH ? { executablePath: process.env.OEST_BROWSER_PATH } : {}) });
    const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, serviceWorkers: 'block' });
    await ctx.addInitScript(() => { if (!localStorage.getItem('oest.account')) localStorage.setItem('oest.account', JSON.stringify({ provider: 'local', id: 'nt-app', email: 'demo@example.com', first: 'Greg', last: 'Sarna' })); });
    await ctx.addInitScript(fakePhone);
    // okienko pytania apki (moduly/przycisk): test odpowiada „OK”, gdy __askMode = 'ok'
    await ctx.addInitScript(() => { const go = () => { if (window.__askMode !== 'ok') return; const b = document.querySelector('.oest-ask:not([data-wy-out]) [data-a=ok]'); if (b && !b.closest('.nt-ask')) b.click(); }; new MutationObserver(go).observe(document, { childList: true, subtree: true }); });
    const pg = await ctx.newPage(); pg.setDefaultTimeout(8000); pg.on('pageerror', e => errors.push(e.message));
    const notes = k => pg.evaluate(k => OESTNotatki.list(k).then(a => a.map(n => ({ en: n.en, pl: n.pl, st: OESTNotatki.state(n) }))), k);
    // page.waitForFunction nie czeka na Promise – warunki z IndexedDB sprawdzane w pętli
    const until = async (fn, arg) => { for (let i = 0; i < 25; i++) { if (await pg.evaluate(fn, arg)) return true; await pg.waitForTimeout(200); } return false; };
    const record = async (bar, n) => {
      await pg.locator(bar + ' .nt-rec').click(); await pg.waitForSelector('.oest-rec'); await pg.waitForTimeout(1200);
      await pg.locator('.oest-rec button').click();
      await pg.waitForFunction(([b, n]) => document.querySelector(b + ' .nt-n').textContent === String(n), [bar, n], { timeout: 10000 });
      await pg.waitForFunction(b => !document.querySelector(b + ' .nt-join').hidden, bar, { timeout: 10000 });
    };

    // ---------- Reactive ----------
    await pg.goto(B + '/#reactive'); await pg.locator('[data-rx=new]').click(); await pg.locator('[data-rx-field=title]').waitFor();
    check(await pg.locator('#rxNotes .nt-rec').isVisible(), 'Reactive: brak „🎤 Nagraj notatkę”');
    check(await pg.locator('#rxNotes .nt-n').textContent() === '0', 'Reactive: licznik na starcie');
    check(await pg.locator('#rxRecord').isHidden(), 'Reactive: nagłówek starych nagrań widoczny bez nagrań');
    await record('#rxNotes', 1);
    // nowe, nietknięte zadanie (bez nazwy i opisu) – notatka trafia do niego (scope rx|<id szkicu>)
    const scope = await pg.evaluate(() => new Promise(r => { const q = indexedDB.open('oest-notatki'); q.onsuccess = () => { const t = q.result.transaction('notes').objectStore('notes').getAll(); t.onsuccess = () => r((t.result[0] || {}).scope || ''); }; }));
    check(/^rx\|.+/.test(scope), 'Reactive: notatka nie przy zadaniu: ' + scope);
    const rn = await notes(scope);
    check(rn.length === 1 && /isolator|Pump number 12/.test(rn[0].en) && /54 °C/.test(rn[0].pl), 'Reactive: notatka bez tekstu PL/EN: ' + JSON.stringify(rn));
    // ‹ zaraz po nagraniu (opis pusty): szkic z notatką nie jest „pusty” i zostaje
    await pg.locator('#v-reactive .top .back').click(); await pg.waitForTimeout(600);
    check(await until(k => OESTReactiveUI.repository.get().then(d => !!(d.reactiveDrafts || {})[k]), scope.slice(3)), 'Reactive: szkic z samą notatką skasowany po ‹');
    await pg.goto(B + '/#reactive/draft/' + scope.slice(3)); await pg.locator('#rxNotes .nt-n').waitFor();
    check(await until(() => document.querySelector('#rxNotes .nt-n').textContent === '1'), 'Reactive: po ‹ i ponownym otwarciu brak notatki');
    // okienko 📝 Notatki
    await pg.locator('#rxNotes .nt-open').click(); await pg.waitForSelector('.nt-pop .nt-note');
    check(/Pump number 12/.test(await pg.locator('.nt-pop .nt-en').textContent()), 'Reactive: okienko bez tekstu EN');
    if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, 'NT_REACTIVE_POPUP.png') });
    await pg.locator('.oest-ask [data-a=ok]').click(); await pg.waitForSelector('.oest-ask', { state: 'detached' });
    // ✨ Połącz → propozycja w okienku → Wstaw do opisu
    await pg.locator('#rxNotes .nt-join').click(); await pg.waitForSelector('.oest-ask textarea');
    check((await pg.locator('.oest-ask [data-a=ok]').textContent()).trim() === 'Wstaw do opisu', 'Reactive: przycisk „Wstaw do opisu”');
    if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, 'NT_REACTIVE_JOIN.png') });
    // poprawka w okienku, która gubi liczbę (12) → ostrzeżenie od razu, także gdy propozycja na starcie miała wszystkie liczby (przegląd Codex #113)
    { const ta = pg.locator('.oest-ask textarea'), v = await ta.inputValue(); await ta.fill(v.replace(/12/g, '')); await pg.waitForTimeout(100);
      const warn = await pg.locator('.oest-ask .nt-warn').textContent(); check(/12/.test(warn), 'Reactive: brak ostrzeżenia po usunięciu liczby 12: „' + warn + '”'); await ta.fill(v); }
    await pg.locator('.oest-ask [data-a=ok]').click(); await pg.waitForSelector('.oest-ask', { state: 'detached' });
    await pg.waitForFunction(() => /Pump number 12/.test(document.querySelector('[data-rx-field=note]').value));
    check(await until(() => OESTReactiveUI.repository.get().then(d => /Pump number 12/.test(Object.values(d.reactiveDrafts || {}).at(-1).note || ''))), 'Reactive: opis z notatek nie zapisany w szkicu');
    // ‹ i ponowne otwarcie: szkic z notatką zostaje (nie jest „pusty”), notatka ta sama
    await pg.locator('#v-reactive .top .back').click(); await pg.waitForTimeout(500);
    const kept = await pg.evaluate(() => OESTReactiveUI.repository.get().then(d => Object.keys(d.reactiveDrafts||{}).length));
    check(kept >= 1, 'Reactive: szkic z notatką skasowany po ‹');
    await pg.goto(B + '/#reactive/draft/' + scope.slice(3)); await pg.locator('#rxNotes .nt-n').waitFor();
    await pg.waitForFunction(() => document.querySelector('#rxNotes .nt-n').textContent === '1', null, { timeout: 5000 }).catch(() => check(false, 'Reactive: po ponownym otwarciu brak notatki'));
    // stare nagranie (sprzed 09/11) zostaje z „Na tekst”
    await pg.evaluate(async () => {
      const r = OESTReactiveUI.repository, d = Object.values((await r.get()).reactiveDrafts||{}).at(-1), id = 'old-audio-1';
      await r.saveReactiveDraft({ ...d, audioMediaIds: [id] }, [{ id, kind: 'audio', blob: new Blob([new Uint8Array(64)], { type: 'audio/wav' }), name: 'Audio.wav', mime: 'audio/wav', size: 64 }]);
    });
    await pg.goto(B + '/#home'); await pg.goto(B + '/#reactive/draft/' + scope.slice(3)); await pg.locator('#rxNotes .nt-n').waitFor();
    await pg.locator('#rxAudio .rx-voice').waitFor({ timeout: 5000 }).catch(() => check(false, 'Reactive: stare nagranie zniknęło'));
    check(await pg.locator('#rxRecord').isVisible() && await pg.locator('#rxAudio [data-rx=transcribe]').count() === 1, 'Reactive: stare nagranie bez „Na tekst” / nagłówka');
    // Usuń szkic = usuwa też jego notatki
    await pg.evaluate(() => { window.__askMode = 'ok'; });
    check((await notes(scope)).length === 1, 'Reactive: przed „Usuń szkic” brak notatki: ' + scope);
    await pg.locator('[data-rx=drop-draft]').click(); await pg.waitForFunction(() => location.hash === '#reactive');
    check(await until(k => OESTNotatki.list(k).then(a => !a.length), scope), 'Reactive: notatki zostały po „Usuń szkic”');
    await pg.evaluate(() => { window.__askMode = ''; });

    // ---------- Hand over ----------
    await pg.goto(B + '/#home'); await pg.locator('[data-go=handover]').click(); await pg.locator('#hoStart').waitFor();
    await pg.locator('#hoStart').fill('2026-11-09'); await pg.locator('#hoEnd').fill('2026-11-12'); await pg.locator('[data-ho=start]').click(); await pg.locator('#hoText').waitFor();
    check(await pg.locator('#hoNotes .nt-rec').isVisible(), 'Hand over: brak „🎤 Nagraj notatkę”');
    check(await pg.locator('[data-ho=record]').count() === 0, 'Hand over: stary przycisk nagrywania nadal jest');
    await record('#hoNotes', 1);
    await pg.locator('#hoNotes .nt-join').click(); await pg.waitForSelector('.oest-ask textarea');
    check((await pg.locator('.oest-ask [data-a=ok]').textContent()).trim() === 'Wstaw do wpisu', 'Hand over: przycisk „Wstaw do wpisu”');
    await pg.locator('.oest-ask [data-a=ok]').click(); await pg.waitForSelector('.oest-ask', { state: 'detached' });
    check(/Pump number 12/.test(await pg.locator('#hoText').inputValue()), 'Hand over: tekst nie wstawiony do wpisu');
    check(await pg.locator('#hoEnglish').isChecked(), 'Hand over: „po angielsku” nie zaznaczone po wstawieniu do pustego pola');
    if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, 'NT_HANDOVER.png'), fullPage: true });
    // wpis z samym nagraniem (bez tekstu) da się zapisać, nagranie zostaje przy wpisie, a jego notatki są w „📝 Notatki wpisu” (przegląd Codex #113)
    await pg.locator('#hoText').fill(''); await pg.locator('#hoKind').selectOption('note'); await pg.locator('[data-ho=save-entry]').click();
    check(await until(() => OESTHandover.repository.get().then(d => d.entries.length === 1)), 'Hand over: wpis z samym nagraniem nie zapisany: ' + await pg.locator('#hoMessage').textContent());
    const ent = await pg.evaluate(async () => { const d = await OESTHandover.repository.get(), e = d.entries[0]; const m = e ? await OESTHandover.repository.media(e.mediaIds[0]) : null; return e ? { n: e.mediaIds.length, kind: m && m.kind } : null; });
    check(ent && ent.n === 1 && ent.kind === 'audio', 'Hand over: nagranie nie trafiło do wpisu: ' + JSON.stringify(ent));
    await pg.locator('.ho-entry .ho-notes').waitFor({ timeout: 5000 }).catch(() => check(false, 'Hand over: brak „📝 Notatki wpisu” przy zapisanym wpisie'));
    if (await pg.locator('.ho-entry .ho-notes').isVisible()) {
      check((await pg.locator('.ho-entry .ho-notes .nt-n').textContent()) === '1', 'Hand over: licznik notatek wpisu');
      await pg.locator('.ho-entry .ho-notes').click(); await pg.waitForSelector('.nt-pop .nt-note');
      check(/Pump number 12/.test(await pg.locator('.nt-pop .nt-en').textContent()), 'Hand over: okienko notatek wpisu bez tekstu');
      await pg.locator('.oest-ask [data-a=ok]').click(); await pg.waitForSelector('.oest-ask', { state: 'detached' });
    }

    // ---------- EN ----------
    const p2 = await ctx.newPage(); p2.on('pageerror', e => errors.push(e.message)); // Hand over ma niezapisany wpis – osobna karta zamiast wychodzenia
    await p2.goto(B + '/#reactive'); await p2.locator('[data-rx=new]').waitFor(); await p2.evaluate(() => window.OESTSettings.update(s => { s.appearance.language = 'en'; })); await p2.locator('[data-rx=new]').click(); await p2.locator('#rxNotes .nt-rec').waitFor();
    const en = await p2.locator('#rxNotes').innerText();
    check(/Record note/.test(en) && /Notes/.test(en) && !/[ąćęłńóśźż]/i.test(en), 'EN: pasek notatek nie po angielsku: ' + en);
  } catch (e) { fails.push('wyjątek: ' + (e && e.stack || e)); }
  finally { if (browser) await browser.close(); server.close(); }
  if (errors.length) fails.push('błędy strony: ' + errors.join(' | '));
  if (fails.length) { console.error('NOTATKI APP UI FAIL\n- ' + fails.join('\n- ')); process.exitCode = 1; }
  else console.log('NOTATKI APP UI PASS: Reactive (🎤 → notatka → okienko → Połącz w opis → zapis szkicu → ‹ nie kasuje → stare nagranie zostaje → Usuń szkic czyści notatki), Hand over (pasek, Wstaw do wpisu + „po angielsku”, wpis z samym nagraniem, Notatki wpisu), EN.');
})();
