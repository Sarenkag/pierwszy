// Notatki głosowe w inspekcji (moduly/notatki, Grzegorz 08/11/2026: „zapis notatek, odczyt w fajnym okienku, edycja, jakość tekstu”).
// Prawdziwa strona inspekcji z paczki app/www; wtyczki telefonu (nagrywanie, rozpoznawanie mowy, tłumacz) podstawione,
// bo przeglądarka ich nie ma – sprawdzamy całą drogę apki: przycisk → nagranie → tekst PL → słowa branżowe → EN → okienko.
// Kroki: Notatka → 🎤 (stuknij, Zakończ) → licznik 1 → okienko: EN + PL, „gotowa” → Popraw → Zapisz → druga notatka bez liczby
// („sprawdź liczby”) → Połącz → Wstaw do komentarza → restart strony (notatki zostają) → usuń (dwa stuknięcia) → Wyczyść inspekcję.
// PL i EN: okienko z tymi samymi elementami, zrzuty do OEST_SHOTS (opcjonalnie).
// Uruchomienie: OEST_PLAYWRIGHT_PATH=… OEST_BROWSER_PATH=… node app/tests/notatki-ui-check.cjs  (po npm run copy-web)
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const { chromium } = require(process.env.OEST_PLAYWRIGHT_PATH || 'playwright');
const root = path.resolve(__dirname, '../www'), SHOTS = process.env.OEST_SHOTS || '';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const p = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(p, (e, b) => { if (e) { res.writeHead(404).end(); return; } res.setHeader('Content-Type', TYPES[path.extname(p)] || 'application/octet-stream'); res.end(b); });
});
const fails = [], R = {};
const check = (ok, msg) => { if (!ok) fails.push(msg); };
const ID = 'EFA-INS-014';
// wtyczki telefonu: nagranie (WAV), rozpoznawanie mowy po polsku (kolejne zdania), tłumacz ML Kit (świadomie z „insulator” i bez „12”)
function fakePhone() {
  const SAID = ['izolator przy a o w na trzynastce ma pęknięty dławik, temperatura 54 stopnie', 'panel pokazuje błąd na strefie 4 i 12'];
  const EN = { 0: 'The insulator at AOV on the thirteenth has a cracked gland, temperature 54 °C', 1: 'The panel shows an error in zone 4' };
  let said = Number(sessionStorage.getItem('nt.said') || 0);
  const wav = btoa('RIFF' + '\0'.repeat(40) + 'abcd');
  const plugins = {
    HandoverTools: { startAudio: async () => ({}), stopAudio: async () => ({ data: wav }), transcribe: async () => { const t = SAID[said % SAID.length]; said++; sessionStorage.setItem('nt.said', said); return { text: t }; } },
    Translate: { plToEn: async ({ text }) => { if (window.__ntSlow) await new Promise(r => setTimeout(r, window.__ntSlow)); return { text: /strefie/.test(text) ? EN[1] : EN[0] }; } },
    // model pobrany: zdanie zostaje jak z tłumacza; przy łączeniu notatek gubi „54” (ostrzeżenie musi się pojawić – przegląd Codex #108)
    OESTModel: { status: async () => ({ supported: true, ready: true, bytes: 1 }), generate: async ({ prompt }) => (window.__mdSlow && !/^Combine/.test(prompt) ? await new Promise(r => setTimeout(r, window.__mdSlow)) : 0, /^Combine/.test(prompt))
      ? { text: 'The isolator next to the AOV on level 13 has a cracked gland. The panel shows an error in zone 4.' }
      : { text: (prompt.split('Note:\n')[1] || '').split('\n\n')[0] } }
  };
  window.Capacitor = { isNativePlatform: () => true, Plugins: plugins, registerPlugin: n => plugins[n] || {}, convertFileSrc: x => x };
}

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const T0 = Date.now(); const log = m => process.env.NT_DEBUG && process.stderr.write(((Date.now() - T0) / 1000).toFixed(1) + "s " + m + "\n");
  const B = 'http://127.0.0.1:' + server.address().port; let browser; const errors = [];
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.OEST_BROWSER_PATH ? { executablePath: process.env.OEST_BROWSER_PATH } : {}) });
    const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, serviceWorkers: 'block' });
    await ctx.addInitScript(() => { if (!localStorage.getItem('oest.account')) localStorage.setItem('oest.account', JSON.stringify({ provider: 'local', id: 't', email: 'demo@example.com', first: 'Greg', last: 'Sarna' })); });
    await ctx.addInitScript(fakePhone);
    const pg = await ctx.newPage(); pg.on('pageerror', e => errors.push(e.message));
    const count = () => pg.locator('#ntN').textContent();
    const stage = () => pg.evaluate(i => { const a = JSON.parse(localStorage.getItem('oest.ppm.stage') || '{}'); return a[i] ? a[i].s : 'none'; }, ID);
    const open = async () => { await pg.goto(B + '/inspekcje/index.html#ppm=' + ID); await pg.waitForFunction(() => window.OESTNotatki && document.querySelector('#ntRec')); await pg.waitForTimeout(1500); };
    const record = async (n, wstecz) => {
      await pg.locator('#ntRec').click(); await pg.waitForSelector('.oest-rec'); await pg.waitForTimeout(1200);
      if (wstecz) { // Wstecz telefonu w trakcie nagrywania = Zakończ i zapis, strona zostaje (przegląd Codex #108)
        const u = pg.url(); R.wsteczPrzyNagrywaniu = await pg.evaluate(() => OESTWstecz.wstecz()); await pg.waitForTimeout(300);
        check(pg.url() === u && R.wsteczPrzyNagrywaniu === 'okno', 'Wstecz przy nagrywaniu opuścił inspekcję: ' + R.wsteczPrzyNagrywaniu + ' ' + pg.url());
      } else await pg.locator('.oest-rec button').click();
      await pg.waitForFunction(n => document.querySelector('#ntN').textContent === String(n), n, { timeout: 10000 });
      await pg.waitForFunction(() => !document.querySelector('.nt-tag.g'), null, { timeout: 10000 }).catch(() => {});
    };
    const popup = async () => { await pg.locator('#ntOpen').click(); await pg.waitForSelector('.nt-pop .nt-note, .nt-pop .nt-empty'); await pg.waitForTimeout(300); };
    const notes = () => pg.$$eval('.nt-pop .nt-note', a => a.map(n => ({ en: (n.querySelector('.nt-en') || {}).textContent || '', pl: (n.querySelector('.nt-pl') || {}).textContent || '', tag: n.querySelector('.nt-tag').textContent })));
    const close = async () => { await pg.locator('.oest-ask [data-a=ok]').click(); await pg.waitForSelector('.oest-ask', { state: 'detached' }); };

    await open();
    // 1. przycisk „Notatka” u góry rozwija pole notatki z 🎤 i „📝 Notatki”
    log('1. przycisk „Nota');
    await pg.locator('#v-form button.pbtn:has-text("Notatka")').first().click(); await pg.waitForTimeout(300);
    check(await pg.locator('#ntRec').isVisible(), '„🎤 Nagraj notatkę” niewidoczny po „Notatka”');
    check(await count() === '0', 'licznik notatek na starcie: ' + await count());
    // 2. nagranie → notatka z tekstem PL (słowa branżowe) i EN (isolator, nie insulator)
    log('2. nagranie → not');
    await record(1);
    check(await stage() === 'prog', 'notatka nie zmieniła statusu na „W trakcie” (' + await stage() + ')');
    if (SHOTS) { await pg.waitForSelector('.oest-rec', { state: 'detached' }).catch(() => {}); await pg.locator('#ntRec').scrollIntoViewIfNeeded(); await pg.waitForTimeout(600); await pg.screenshot({ path: path.join(SHOTS, 'notatki-inspekcja-PL.png') }); }
    await popup(); let a = await notes(); R.po1 = a;
    check(a.length === 1, 'w okienku ' + a.length + ' notatek zamiast 1');
    check(/isolator/.test(a[0].en) && !/insulator/i.test(a[0].en), 'EN bez poprawy „insulator” → „isolator”: ' + a[0].en);
    check(/AOV/.test(a[0].pl) && /54 °C/.test(a[0].pl), 'PL bez poprawy „a o w” → AOV i „54 stopnie” → 54 °C: ' + a[0].pl);
    check(/gotowa/.test(a[0].tag), 'pierwsza notatka nie jest „gotowa”: ' + a[0].tag);
    if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, 'notatki-okienko-PL.png') });
    // 3. Popraw → zmiana tekstu EN → Zapisz
    log('3. Popraw → zmian');
    await pg.locator('.nt-pop [data-nt=edit]').first().click(); await pg.waitForSelector('.nt-pop textarea[data-nt-f=en]');
    check(!(await pg.locator('.oest-ask [data-a=ok]').isVisible()), 'w trakcie poprawiania widać „Zamknij” (zgubiłby poprawkę)');
    if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, 'notatki-popraw-PL.png') });
    await pg.locator('.nt-pop textarea[data-nt-f=en]').fill('The isolator next to the AOV on level 13 has a cracked gland; temperature 54 °C.');
    // odsłuch w trakcie poprawiania nie gubi wpisanego tekstu (przegląd Codex #108)
    await pg.locator('.nt-pop [data-nt=play]').click(); await pg.waitForTimeout(400);
    check(/level 13 has a cracked gland/.test(await pg.locator('.nt-pop textarea[data-nt-f=en]').inputValue()), 'odsłuch w edycji skasował wpisaną poprawkę');
    // zapis w telefonie się nie udał (np. brak miejsca): poprawka zostaje w formularzu, komunikat, drugie „Zapisz” działa (przegląd Codex #108)
    await pg.evaluate(() => { const o = IDBObjectStore.prototype.put; IDBObjectStore.prototype.put = function () { IDBObjectStore.prototype.put = o; throw new DOMException('Brak miejsca w pamięci telefonu.', 'QuotaExceededError'); }; });
    await pg.locator('.nt-pop [data-nt=save]').click(); await pg.waitForTimeout(400);
    R.bladZapisu = await pg.locator('.nt-pop .nt-warn').textContent().catch(() => '');
    check(/Nie zapisano/.test(R.bladZapisu) && /level 13 has a cracked gland/.test(await pg.locator('.nt-pop textarea[data-nt-f=en]').inputValue()), 'nieudany zapis zgubił poprawkę albo nie pokazał komunikatu: ' + R.bladZapisu);
    await pg.locator('.nt-pop [data-nt=save]').click(); await pg.waitForSelector('.nt-pop .nt-note');
    a = await notes(); check(/level 13 has a cracked gland/.test(a[0].en), 'poprawka EN nie zapisana: ' + a[0].en);
    await close();
    // 4. druga notatka: tłumacz zgubił „12” → „sprawdź liczby” + ostrzeżenie w edycji
    log('4. druga notatka:');
    await record(2, true);
    await popup(); a = await notes(); R.po2 = a;
    check(a.length === 2 && /sprawdź liczby/.test(a[1].tag), 'druga notatka bez ostrzeżenia o liczbie: ' + JSON.stringify(a[1]));
    await pg.locator('.nt-pop [data-nt=edit]').nth(1).click(); await pg.waitForSelector('.nt-pop .nt-warn');
    check(/12/.test(await pg.locator('.nt-pop .nt-warn').textContent()), 'edycja nie pokazuje brakującej liczby 12');
    if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, 'notatki-liczby-PL.png') });
    // „Ułóż z polskiego” dla notatki 2 → Anuluj → Popraw notatki 1: spóźniony wynik nie trafia do notatki 1 (przegląd Codex #108)
    await pg.evaluate(() => { window.__ntSlow = 600; });
    await pg.locator('.nt-pop [data-nt=redo]').click(); await pg.locator('.nt-pop [data-nt=cancel]').click(); await pg.waitForSelector('.nt-pop .nt-note');
    await pg.locator('.nt-pop [data-nt=edit]').first().click(); await pg.waitForSelector('.nt-pop textarea[data-nt-f=en]'); await pg.waitForTimeout(900);
    await pg.evaluate(() => { window.__ntSlow = 0; });
    R.poSpoznionymTlumaczeniu = await pg.locator('.nt-pop textarea[data-nt-f=en]').inputValue();
    check(/level 13 has a cracked gland/.test(R.poSpoznionymTlumaczeniu), 'wynik „Ułóż” notatki 2 nadpisał edycję notatki 1: ' + R.poSpoznionymTlumaczeniu);
    // zamknięcie okienka w trakcie poprawiania (Wstecz / Escape / obok): poprawka wraca przy następnym otwarciu (przegląd Codex #108)
    await pg.locator('.nt-pop textarea[data-nt-f=en]').fill('Draft kept after closing.');
    await pg.keyboard.press('Escape'); await pg.waitForSelector('.nt-pop', { state: 'detached' });
    await pg.locator('#ntOpen').click(); await pg.waitForSelector('.nt-pop textarea[data-nt-f=en]'); await pg.waitForTimeout(300);
    check(await pg.locator('.nt-pop textarea[data-nt-f=en]').inputValue() === 'Draft kept after closing.', 'poprawka zgubiona po zamknięciu okienka w trakcie edycji');
    await pg.locator('.nt-pop [data-nt=cancel]').click(); await pg.waitForSelector('.nt-pop .nt-note');
    check(/level 13 has a cracked gland/.test((await notes())[0].en), 'Anuluj po przywróconej poprawce zmienił zapisaną notatkę');
    await close();
    // 5. Połącz notatki → propozycja → Wstaw: komentarz ma oba zdania, nic nie wstawia się samo
    log('5. Połącz notatki');
    await pg.locator('#komentarz').fill('Checked all floors.');
    check(await pg.locator('#ntJoin').isVisible(), '„Połącz notatki w komentarz” niewidoczny');
    await pg.locator('#ntJoin').click(); await pg.waitForSelector('#mdBox:not([hidden])');
    R.ostrzezeniePolacz = await pg.locator('#mdWarn').textContent();
    check(/54/.test(R.ostrzezeniePolacz), 'połączenie modelem zgubiło „54”, a nie ma ostrzeżenia: „' + R.ostrzezeniePolacz + '”');
    check(await pg.locator('#komentarz').inputValue() === 'Checked all floors.', 'komentarz zmienił się bez „Wstaw”');
    await pg.locator('#mdUse').click(); await pg.waitForTimeout(300);
    const kom = await pg.locator('#komentarz').inputValue(); R.komentarz = kom;
    check(/^Checked all floors\.\n\n.*cracked gland.*zone 4/s.test(kom), 'komentarz po „Wstaw” nie ma notatek pod istniejącym tekstem: ' + kom);
    await pg.waitForTimeout(800);
    // 6. restart apki: notatki zostają (zapis w telefonie)
    log('6. restart apki: ');
    await pg.reload(); await pg.waitForFunction(() => window.OESTNotatki); await pg.waitForTimeout(2000);
    check(await count() === '2', 'po restarcie licznik ' + await count() + ' zamiast 2');
    check(await pg.locator('#ntRec').isVisible(), 'po restarcie pole notatek zwinięte, choć są notatki');
    // 7. usuń: pierwsze stuknięcie pyta, drugie usuwa
    log('7. usuń: pierwsze');
    await popup(); await pg.locator('.nt-pop [data-nt=del]').nth(1).click(); await pg.waitForTimeout(200);
    check((await notes()).length === 2 && /Usunąć/.test(await pg.locator('.nt-pop [data-nt=del]').nth(1).textContent()), 'pierwsze stuknięcie 🗑 nie pyta');
    await pg.locator('.nt-pop [data-nt=del]').nth(1).click(); await pg.waitForTimeout(400);
    check((await notes()).length === 1, 'drugie stuknięcie nie usunęło notatki');
    await close(); check(await count() === '1', 'licznik po usunięciu ' + await count());
    // trwające „✨ Ułóż” przejęte przez „Połącz notatki” (jedna notatka = bez modelu, od razu): „Ułóż” nie zostaje wyłączony (przegląd Codex #108)
    await pg.locator('#komentarz').fill('Second check.');
    await pg.evaluate(() => { window.__mdSlow = 1500; }); await pg.locator('#mdRun').click(); await pg.waitForTimeout(100);
    check(await pg.locator('#mdRun').isDisabled(), 'warunek testu: „✨ Ułóż” nie ruszył');
    await pg.locator('#ntJoin').click(); await pg.waitForSelector('#mdBox:not([hidden])'); await pg.waitForTimeout(1800); await pg.evaluate(() => { window.__mdSlow = 0; });
    check(!(await pg.locator('#mdRun').isDisabled()), '„✨ Ułóż” wyłączony na stałe po przejęciu propozycji przez notatki');
    check(!/Rewrite|Second check\.$/.test(await pg.locator('#mdOut').inputValue()) && /cracked gland|zone/.test(await pg.locator('#mdOut').inputValue()), 'spóźniony wynik „Ułóż” podmienił propozycję z notatek: ' + await pg.locator('#mdOut').inputValue());
    // 8. EN: te same elementy okienka
    log('8. EN: te same el');
    await pg.evaluate(() => localStorage.setItem('oest.lang', 'en')); await pg.reload(); await pg.waitForFunction(() => window.OESTNotatki); await pg.waitForTimeout(2000);
    check(/Record note/.test(await pg.locator('#ntRec').textContent()), 'EN: przycisk nagrywania po polsku: ' + await pg.locator('#ntRec').textContent());
    await popup(); const en = await notes(); R.en = en;
    check(en.length === 1 && /ready/.test(en[0].tag) && /Edit/.test(await pg.locator('.nt-pop [data-nt=edit]').textContent()), 'EN: okienko niepełne/po polsku: ' + JSON.stringify(en));
    if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, 'notatki-okienko-EN.png') });
    await close();
    await pg.evaluate(() => localStorage.setItem('oest.lang', 'pl')); await pg.reload(); await pg.waitForFunction(() => window.OESTNotatki); await pg.waitForTimeout(2000);
    // 9. Wyczyść inspekcję usuwa też notatki
    log('9. Wyczyść inspek');
    await pg.evaluate(() => { window.OEST_clearInspection(); }); await pg.waitForSelector('.oest-ask [data-a=ok]'); await pg.locator('.oest-ask [data-a=ok]').click(); await pg.waitForTimeout(2500);
    check(await count() === '0', 'po „Wyczyść inspekcję” zostały notatki: ' + await count());
    R.poWyczysc = await count();
  } catch (e) { fails.push('wyjątek: ' + (e && e.stack || e)); }
  finally { if (browser) await browser.close(); server.close(); }
  errors.forEach(e => fails.push('błąd strony: ' + e));
  console.log(JSON.stringify(R, null, 1));
  if (fails.length) { console.log('notatki-ui-check FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log('notatki-ui-check PASS');
})();
