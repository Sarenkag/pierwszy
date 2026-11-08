// Język domyślny w Mój profil (Grzegorz 08/11/2026):
// - język ustawiony w profilu i zapisany = język całej apki,
// - PL/EN u góry przełącza tylko do zamknięcia apki (także po wejściu do inspekcji i powrocie zostaje przełączony),
// - po zamknięciu / restarcie apka wraca do języka z profilu,
// - przełączenie nie zmienia wyboru w profilu i nie przesuwa klocków Ustawień (bez drgania),
// - stare ustawienia bez pola języka w profilu dostają dotychczasowy język apki.
// Restart = nowy kontekst przeglądarki z tym samym localStorage (sessionStorage pusty, jak po zabiciu apki).
// Wynik NIE zastępuje sprawdzenia na Pixelu 8 Pro.
const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), assert = require('node:assert/strict');
const { chromium } = require(process.env.OEST_PLAYWRIGHT_PATH || 'playwright');
const root = path.resolve(__dirname, '../www');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  let p = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(root + path.sep) && p !== root) { res.writeHead(403).end(); return; }
  if (req.url.split('?')[0].endsWith('/')) p = path.join(p, 'index.html');
  fs.readFile(p, (e, b) => { if (e) { res.writeHead(404).end(); return; } res.setHeader('Content-Type', TYPES[path.extname(p)] || 'application/octet-stream'); res.end(b); });
});
const ACCOUNT = { provider: 'local', id: 'test', email: 'demo@example.com', first: 'Greg', last: 'Sarna' };

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const url = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ headless: true, ...(process.env.OEST_BROWSER_PATH ? { executablePath: process.env.OEST_BROWSER_PATH } : {}) });
  const errors = [];
  let state = null; // localStorage przenoszony między „uruchomieniami” apki
  async function launch() {
    const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 1, ...(state ? { storageState: state } : {}) });
    if (!state) await ctx.addInitScript(a => { if (!localStorage.getItem('oest.account')) localStorage.setItem('oest.account', a); }, JSON.stringify(ACCOUNT));
    await ctx.addInitScript(() => { const go = () => { const b = document.querySelector('.oest-ask:not([data-wy-out]) [data-a=ok]'); if (b && window.__askOk) b.click(); }; new MutationObserver(go).observe(document, { childList: true, subtree: true }); });
    const p = await ctx.newPage(); p.on('pageerror', e => errors.push(e.message));
    return { ctx, p };
  }
  async function close(app) { state = await app.ctx.storageState(); await app.ctx.close(); }
  const lang = p => p.evaluate(() => ({ ui: localStorage.getItem('oest.lang'), cur: OESTSettings.get().appearance.language, def: OESTSettings.get().profile.language }));
  const homeText = p => p.locator('#v-home').innerText();
  let passed = 0; const ok = (c, m) => { assert.ok(c, m); passed++; };
  try {
    // 1. Pierwsze uruchomienie: domyślnie PL. W profilu ustawiam PL i zapisuję.
    let app = await launch(), p = app.p;
    await p.goto(url + '/#settings/profile'); await p.locator('[data-path="profile.language"]').waitFor();
    ok((await lang(p)).def === 'pl', 'domyślny język profilu = PL');
    await p.locator('[data-path="profile.language"]').selectOption('pl');
    await p.getByRole('button', { name: 'Zapisz ustawienia', exact: true }).click();
    ok(/Zapisano/.test(await p.locator('#settingsMessage').textContent()), 'profil zapisany');

    // 2. Na ekranie głównym przełączam u góry na EN.
    await p.goto(url + '/#home'); await p.locator('#hmLang').waitFor();
    await p.locator('#hmLang').click(); await p.waitForTimeout(150);
    let l = await lang(p); ok(l.ui === 'en' && l.cur === 'en', 'przełącznik u góry: EN'); ok(l.def === 'pl', 'przełącznik nie zmienia języka w profilu');
    ok(/Settings/.test(await homeText(p)), 'ekran główny po angielsku');

    // 3. Wejście do inspekcji i powrót (przeładowanie strony w tej samej sesji): zostaje EN.
    await p.goto(url + '/inspekcje/index.html'); await p.waitForLoadState('load');
    await p.goto(url + '/#home'); await p.locator('#hmLang').waitFor(); await p.waitForTimeout(150);
    ok((await lang(p)).ui === 'en', 'po powrocie z inspekcji nadal EN (bez restartu)');

    // 4. Ustawienia w EN: przełącznik nie rusza wyboru w profilu, klocki się nie przesuwają przy zmianie PL/EN.
    await p.goto(url + '/#settings/profile'); await p.locator('[data-path="profile.language"]').waitFor();
    ok(await p.locator('[data-path="profile.language"]').inputValue() === 'pl', 'w profilu nadal Polski, choć apka w EN');
    await p.goto(url + '/#settings'); await p.locator('.settings-card').first().waitFor();
    const boxes = () => p.evaluate(() => [...document.querySelectorAll('#v-settings .settings-card')].map(e => { let x = 0, y = 0; for (let n = e; n; n = n.offsetParent) { x += n.offsetLeft; y += n.offsetTop; } return [x, y, e.offsetWidth, e.offsetHeight, getComputedStyle(e).height].join(','); }) /* układ (bez chwilowej animacji dotyku) */);
    const enBoxes = await boxes();
    await p.locator('#v-settings [data-action=language]').click(); await p.waitForTimeout(200);
    ok((await lang(p)).ui === 'pl', 'przełącznik w Ustawieniach: PL');
    const plBoxes = await boxes(); ok(JSON.stringify(plBoxes) === JSON.stringify(enBoxes), 'PL/EN: klocki Ustawień w tych samych miejscach i rozmiarach');
    await p.locator('#v-settings [data-action=language]').click(); await p.waitForTimeout(200);
    ok((await lang(p)).ui === 'en', 'z powrotem EN przed zamknięciem');
    await close(app);

    // 5. Restart apki: wraca język z profilu (PL).
    app = await launch(); p = app.p;
    await p.goto(url + '/#home'); await p.locator('#hmLang').waitFor();
    l = await lang(p); ok(l.ui === 'pl' && l.cur === 'pl', 'po restarcie: PL z profilu');
    ok(/Ustawienia/.test(await homeText(p)), 'ekran główny po polsku po restarcie');

    // 6. Profil na EN + zapis: od razu cała apka EN; restart dalej EN; przełącznik na PL działa do zamknięcia.
    await p.goto(url + '/#settings/profile'); await p.locator('[data-path="profile.language"]').waitFor();
    await p.locator('[data-path="profile.language"]').selectOption('en');
    await p.getByRole('button', { name: 'Zapisz ustawienia', exact: true }).click(); await p.waitForTimeout(150);
    l = await lang(p); ok(l.def === 'en' && l.ui === 'en', 'zapis profilu z EN: apka od razu EN');
    ok(/My Profile/.test(await p.locator('#v-settings h1').textContent()), 'nagłówek profilu po angielsku');
    await p.goto(url + '/#home'); await p.locator('#hmLang').waitFor(); await p.locator('#hmLang').click(); await p.waitForTimeout(150);
    ok((await lang(p)).ui === 'pl', 'w trakcie pracy przełączone na PL');
    await close(app);
    app = await launch(); p = app.p;
    await p.goto(url + '/#home'); await p.locator('#hmLang').waitFor();
    ok((await lang(p)).ui === 'en', 'po restarcie: EN z profilu');

    // 7. Zapis profilu bez zmiany języka (np. stanowisko) nie przestawia bieżącego języka.
    await p.locator('#hmLang').click(); await p.waitForTimeout(150);
    await p.goto(url + '/#settings/profile'); await p.locator('[data-path="profile.position"]').waitFor();
    await p.locator('[data-path="profile.position"]').fill('Shift Engineer');
    await p.getByRole('button', { name: 'Zapisz ustawienia', exact: true }).click(); await p.waitForTimeout(150);
    l = await lang(p); ok(l.ui === 'pl' && l.def === 'en', 'zapis innego pola: bieżący PL zostaje, domyślny EN');
    await close(app);

    // 8. Stare ustawienia (sprzed zmiany): brak profile.language, apka była w EN → domyślny EN, bez błędu.
    const ctx = await browser.newContext();
    await ctx.addInitScript(a => {
      if (localStorage.getItem('oest.account')) return;
      localStorage.setItem('oest.account', a);
      localStorage.setItem('oest.settings.legacyOwner', JSON.stringify('test'));
      localStorage.setItem('oest.lang', 'en');
    }, JSON.stringify(ACCOUNT));
    const p8 = await ctx.newPage(); p8.on('pageerror', e => errors.push(e.message));
    await p8.goto(url + '/#settings'); await p8.locator('.settings-card').first().waitFor();
    await p8.evaluate(() => { const k = 'oest.settings.v1.test', s = JSON.parse(localStorage.getItem(k)); delete s.profile.language; s.appearance.language = 'en'; s.appearance.density = 'compact'; s.appearance.reduceMotion = true; localStorage.setItem(k, JSON.stringify(s)); sessionStorage.clear(); });
    await p8.reload(); await p8.locator('.settings-card').first().waitFor();
    l = await lang(p8); ok(l.def === 'en' && l.ui === 'en', 'migracja: domyślny = dotychczasowy język (EN)');
    const look = await p8.evaluate(() => ({ d: document.documentElement.dataset.settingsDensity, m: document.documentElement.dataset.settingsMotion }));
    ok(look.d === 'comfortable' && look.m === 'normal', 'bez klocka Wygląd: gęstość Wygodna, animacje normalne');
    await ctx.close();

    assert.deepEqual(errors, [], 'błędy strony');
    console.log('JĘZYK PROFIL PASS: ' + passed + ' sprawdzeń (profil PL → EN u góry → inspekcja i powrót → restart → PL; profil EN; migracja; PL/EN bez przesunięć)');
  } finally { await browser.close(); server.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
