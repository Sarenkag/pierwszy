// Przejście między ekranami „Poświata” (Grzegorz 09/11/2026: „drżenie przy przejściu, największe przy Wstecz” → wybrany wariant A).
// Test przeglądarkowy (Quality Gate G2). Liczy KLATKI (requestAnimationFrame), nie czas – wynik nie zależy od szybkości maszyny.
// Uruchomienie: OEST_PLAYWRIGHT_PATH=… OEST_BROWSER_PATH=… node app/tests/przejscie-ekranu-ui-check.cjs  (po npm run copy-web)
// Ekran 412×915 jak Pixel 8 Pro. Wynik z przeglądarki NIE zastępuje sprawdzenia na telefonie.
// Zasady:
//  Z1 nowy ekran w apce nie mignie: w pierwszej klatce, w której jest widoczny, jest jeszcze przezroczysty (dawniej 2 klatki w pełni, potem znikał i wjeżdżał),
//  Z2 jedna animacja na przejście, jasność tylko rośnie (bez drugiego startu), efekt z tabeli ruchu (--ruch-ekran-efekt),
//  Z3 Wstecz w odwrotnym kierunku (html.wy-wstecz w pierwszej klatce), do przodu – bez,
//  Z4 nowa strona (lista → inspekcja, Wstecz z inspekcji): żaden „cudzy” ekran (logowanie, lista inspekcji) nie prześwituje przed właściwym,
//  Z5 ekran przebudowany w miejscu (schowany i pokazany w jednym kroku) nie animuje się od nowa,
//  Z6 tabela ruchu: podmiana efektu ekranu działa bez zmian na ekranach; „mniej ruchu” = zero animacji ekranu,
//  Z7 rezerwacja miejsca pod drugi język (moduly/bledy, moduly/podmien) liczy rozmiar bez chwilowego pomniejszenia ekranu.
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const { chromium } = require(process.env.OEST_PLAYWRIGHT_PATH || 'playwright');
const root = path.resolve(__dirname, '../www');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const p = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(root + path.sep) && p !== root) { res.writeHead(403).end(); return; }
  const file = p === root ? path.join(root, 'index.html') : p;
  fs.readFile(file, (e, b) => { if (e) { res.writeHead(404).end(); return; } res.setHeader('Content-Type', TYPES[path.extname(file)] || 'application/octet-stream'); res.end(b); });
});
const R = {}, fails = [];
function check(ok, msg) { if (!ok) fails.push(msg); }

// zapis klatek: który ekran widać, jego jasność, kierunek Wstecz; startuje przy wczytaniu strony i na żądanie (__start)
function rejestrator() {
  window.__klatki = []; window.__anim = [];
  document.addEventListener('animationstart', e => { if (e.target.classList && e.target.classList.contains('view')) window.__anim.push(e.animationName + '@' + e.target.id); }, true);
  let n = 0;
  const krok = () => {
    const de = document.documentElement;
    const v = de && [...document.querySelectorAll('.view')].find(x => !x.hidden && x.getClientRects().length);
    window.__klatki.push(v ? { id: v.id, op: +getComputedStyle(v).opacity, wstecz: de.classList.contains('wy-wstecz') } : null);
    if (++n < 90) requestAnimationFrame(krok);
  };
  window.__start = () => { window.__klatki = []; window.__anim = []; n = 0; requestAnimationFrame(krok); };
  requestAnimationFrame(krok);
}
// ocena jednego przejścia: ekran docelowy, czy Wstecz
function ocen(nazwa, k, anim, cel, wstecz, efekt) {
  const i = k.findIndex(f => f && f.id === cel);
  const r = { klatkiDoEkranu: i, pierwsza: i >= 0 ? k[i] : null, animacje: anim };
  R[nazwa] = r;
  if (i < 0) { check(false, `${nazwa}: ekran ${cel} się nie pokazał`); return; }
  const dalej = k.slice(i).filter(Boolean);
  check(k[i].op <= 0.05, `Z1 ${nazwa}: nowy ekran w pierwszej klatce ma jasność ${k[i].op} (mignięcie przed animacją)`);
  let spadek = null; for (let j = 1; j < dalej.length; j++) if (dalej[j].id === cel && dalej[j].op < dalej[j - 1].op - 0.001) { spadek = `${dalej[j - 1].op} → ${dalej[j].op}`; break; }
  check(!spadek, `Z2 ${nazwa}: jasność ekranu spadła w trakcie (${spadek}) – animacja ruszyła drugi raz`);
  check(dalej[dalej.length - 1].op === 1, `Z2 ${nazwa}: ekran nie doszedł do pełnej jasności (${dalej[dalej.length - 1].op})`);
  const naCel = anim.filter(a => a.endsWith('@' + cel));
  check(naCel.length === 1 && naCel[0].startsWith(efekt + '@'), `Z2 ${nazwa}: animacje ekranu ${JSON.stringify(anim)} (oczekiwana jedna: ${efekt})`);
  if (wstecz !== null) check(k[i].wstecz === wstecz, `Z3 ${nazwa}: kierunek ${k[i].wstecz ? 'Wstecz' : 'do przodu'} zamiast ${wstecz ? 'Wstecz' : 'do przodu'}`);
}

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const url = 'http://127.0.0.1:' + server.address().port;
  let browser;
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.OEST_BROWSER_PATH ? { executablePath: process.env.OEST_BROWSER_PATH } : {}) });
    const ctx = async opts => {
      const c = await browser.newContext({ viewport: { width: 412, height: 915 }, serviceWorkers: 'block', ...(opts || {}) });
      await c.addInitScript(() => { if (!localStorage.getItem('oest.account')) localStorage.setItem('oest.account', JSON.stringify({ provider: 'local', id: 'test', email: '', name: 'Test', t: 1 })); });
      await c.addInitScript(rejestrator);
      await c.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
      return c;
    };
    const c = await ctx(), p = await c.newPage(), bledy = [];
    p.on('pageerror', e => bledy.push(e.message));
    const klatki = () => p.waitForFunction(() => window.__klatki.length >= 90 || (window.__klatki.length > 30 && window.__klatki.slice(-20).every(f => f && f.op === 1)));
    const efekt = await (async () => { await p.goto(url + '/index.html#home'); await klatki(); return p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--ruch-ekran-efekt').trim()); })();
    R.efekt = efekt;
    check(efekt === 'wyPoswiataIn', `tabela ruchu: domyślny efekt ekranu ${efekt} zamiast wyPoswiataIn (Poświata, wybór Grzegorza)`);

    // ---------- Z1–Z3: przejścia w apce (kafelek → ekran, Wstecz telefonu, strzałka ‹) ----------
    const krokApki = async (nazwa, akcja, cel, wstecz) => {
      await p.evaluate(() => window.__start()); await akcja(); await klatki();
      const [k, a] = await p.evaluate(() => [window.__klatki, window.__anim]);
      ocen(nazwa, k, a, cel, wstecz, efekt);
    };
    for (const [go, cel] of [['ppm', 'v-ppm'], ['settings', 'v-settings'], ['cal', 'v-cal']]) {
      await krokApki(`ekran główny → ${go}`, () => p.click(`#hmTiles [data-go="${go}"]`), cel, false);
      await krokApki(`${go} → Wstecz telefonu`, () => p.goBack(), 'v-home', true);
    }
    await p.click('#hmTiles [data-go="ppm"]'); await klatki();
    await krokApki('ppm → strzałka ‹', () => p.click('#v-ppm .top .back'), 'v-home', true);

    // ---------- Z4: nowa strona – lista PPM → inspekcja i Wstecz z inspekcji ----------
    await p.click('#hmTiles [data-go="ppm"]'); await klatki();
    const nowaStrona = async (nazwa, akcja, wzor, cel) => {
      await Promise.all([p.waitForURL(wzor), akcja()]); await klatki();
      const [k, a] = await p.evaluate(() => [window.__klatki, window.__anim]);
      const cudze = k.filter(f => f && f.id !== cel && f.op > 0.05).map(f => f.id + ':' + f.op);
      R[nazwa] = { cudzeEkrany: [...new Set(cudze)].slice(0, 4), animacje: a };
      check(!cudze.length, `Z4 ${nazwa}: przed właściwym ekranem prześwituje ${[...new Set(cudze)].join(', ')}`);
      const i = k.findIndex(f => f && f.id === cel);
      check(i >= 0 && k[i].op <= 0.05, `Z4 ${nazwa}: ekran ${cel} w pierwszej klatce ma jasność ${i >= 0 ? k[i].op : 'brak'}`);
      let spadek = false; const d = k.slice(i).filter(f => f && f.id === cel); for (let j = 1; j < d.length; j++) if (d[j].op < d[j - 1].op - 0.001) spadek = true;
      check(!spadek && d.length && d[d.length - 1].op === 1, `Z4 ${nazwa}: jasność ekranu ${cel} nie rośnie równo do 1`);
    };
    try {
      await nowaStrona('lista → inspekcja', () => p.click('#ppmList [data-id]'), /inspekcje\//, 'v-form');
      await nowaStrona('inspekcja → Wstecz', () => p.evaluate(() => [...document.querySelectorAll('.view:not([hidden]) .back')].find(b => b.offsetParent).click()), /\/index\.html/, 'v-ppm');
    } catch (e) { check(false, 'Z4: przejście między stronami się nie udało: ' + e.message.split('\n')[0]); await p.goto(url + '/index.html#ppm'); await klatki(); }

    // ---------- Z5: przebudowa ekranu w miejscu (schowany i pokazany w jednym kroku) ----------
    R.przebudowa = await p.evaluate(async () => {
      const v = [...document.querySelectorAll('.view')].find(x => !x.hidden); window.__anim = [];
      v.hidden = true; v.hidden = false; // jak render() tego samego ekranu
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      return { ekran: v.id, animacje: window.__anim.slice() };
    });
    check(!R.przebudowa.animacje.length, `Z5: przebudowa ${R.przebudowa.ekran} w miejscu uruchomiła animację: ${R.przebudowa.animacje}`);

    // ---------- Z6: tabela ruchu – podmiana efektu ekranu ----------
    R.tabela = await p.evaluate(async () => {
      const W = OESTWyglad.ruch, out = { warianty: W.warianty('ekran'), pola: Object.keys(W.pobierz('ekran')) };
      W.ustaw('ekran', 'zanikanie'); history.back(); await new Promise(r => setTimeout(r, 50));
      const v = [...document.querySelectorAll('.view')].find(x => !x.hidden); out.poPodmianie = getComputedStyle(v).animationName;
      W.domyslne(); out.poPowrocie = getComputedStyle(document.documentElement).getPropertyValue('--ruch-ekran-efekt').trim();
      return out;
    });
    check(['poswiata', 'zanikanie', 'wjazd'].every(w => R.tabela.warianty.includes(w)), 'Z6: brak wariantów ekranu w tabeli ruchu: ' + R.tabela.warianty);
    check(R.tabela.poPodmianie === 'wyFade', 'Z6: podmiana efektu ekranu nie działa (' + R.tabela.poPodmianie + ')');
    check(R.tabela.poPowrocie === 'wyPoswiataIn', 'Z6: domyślne() nie przywraca Poświaty (' + R.tabela.poPowrocie + ')');

    // ---------- Z7: miejsce pod drugi język liczone bez transformacji ----------
    R.prostokat = await p.evaluate(() => {
      const box = document.createElement('div'); box.style.cssText = 'transform:scale(.5);transform-origin:0 0;width:300px';
      box.innerHTML = '<span style="display:inline-block;width:120px;height:20px"></span>'; document.body.appendChild(box);
      if (!window.OESTBledy || !OESTBledy.prostokat) { box.remove(); return { brak: 'OESTBledy.prostokat' }; }
      const s = box.firstChild, r = OESTBledy.prostokat(s), out = { szer: Math.round(r.width * 10) / 10, wys: Math.round(r.height * 10) / 10, rect: s.getBoundingClientRect().width };
      box.remove(); return out;
    });
    check(R.prostokat.szer === 120 && R.prostokat.wys === 20, `Z7: OESTBledy.prostokat liczy z pomniejszeniem: ${JSON.stringify(R.prostokat)}`);
    check(!bledy.length, 'błędy JS na stronie: ' + bledy.slice(0, 3).join(' | '));
    await c.close();

    // ---------- Z6: mniej ruchu (systemowe i „Ogranicz animacje”) = zero animacji ekranu ----------
    for (const [nazwa, opts, init] of [['systemowe', { reducedMotion: 'reduce' }, null], ['Ustawienia', {}, () => document.documentElement.dataset.settingsMotion = 'reduce']]) {
      const q = await (await ctx(opts)).newPage();
      await q.goto(url + '/index.html#home'); await q.waitForLoadState('load'); await q.waitForFunction(() => window.OESTWyglad && window.__klatki.length >= 30);
      if (init) await q.evaluate(init);
      await q.evaluate(() => window.__start()); await q.click('#hmTiles [data-go="ppm"]'); await q.waitForFunction(() => window.__klatki.length >= 20);
      await q.goBack(); await q.waitForFunction(() => window.__klatki.length >= 40);
      const a = await q.evaluate(() => window.__anim);
      R['mniejRuchu-' + nazwa] = a;
      check(!a.length, `Z6 mniej ruchu (${nazwa}): animacje ekranu ${a}`);
      await q.context().close();
    }
  } finally {
    if (browser) await browser.close();
    server.close();
  }
  console.log('POMIARY ' + JSON.stringify(R));
  if (fails.length) { console.log(`PRZEJSCIE EKRANU UI FAIL (${fails.length}):\n- ` + fails.join('\n- ')); process.exit(1); }
  console.log('PRZEJSCIE EKRANU UI PASS: ekrany bez mignięcia, jedna Poświata na przejście, Wstecz odwrotnie, inspekcja ↔ lista bez prześwitu, przebudowa w miejscu bez ruchu, tabela ruchu, mniej ruchu = 0, miejsce pod drugi język bez pomniejszenia.');
})().catch(e => { console.error(e); process.exit(1); });
