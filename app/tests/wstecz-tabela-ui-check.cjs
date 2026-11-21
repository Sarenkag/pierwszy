// Plan audytu 19/11/2026, punkt 1.3 (ustalenie nr 108): tabelaryczny test klawisza Wstecz telefonu.
// Tabela = moduly/ekrany/ekrany.json (jedna mapa ekranów apki, ZASADY.md R1). Dla KAŻDEGO ekranu z mapy:
//   1. ekran otwiera się pod swoim adresem (ekrany z „:id” dostają prawdziwy rekord: klucz, tablicę, zmianę, zlecenie, szkic, węzeł drzewa),
//   2. okienko apki (pytanie OESTPrzycisk) i każdy <dialog> na tym ekranie: Wstecz zamyka okienko, ekran zostaje,
//   3. Wstecz na ekranie: idzie do rodzica z mapy (ten sam numer w „:id”), a na ekranie bez rodzica pyta „Chcesz wyjść z aplikacji?”,
//      Wstecz w tym pytaniu = Nie (pytanie znika, apka zostaje).
// Wstecz = zdarzenie „backbutton” na document, które Ionic (szkielet moduly/szkielet) odbiera od telefonu (ionBackButton) – nie wywołanie funkcji modułu.
// Rozbieżności, które już są w apce, są na liście quality/baselines/wstecz-tabela.json (lista może tylko maleć):
// nowa rozbieżność = FAIL, rozbieżność z listy, której już nie ma = FAIL (usuń wpis). Ekran, którego nie da się otworzyć = FAIL.
// Wynik NIE zastępuje sprawdzenia na Pixelu 8 Pro (gest Wstecz).
const fs = require('node:fs'), path = require('node:path');
const { chromium } = require('./przegladarka.cjs');
const { REPO, MAPA, serwer, KONTO, zasiej, szkic, ID, DOKLEJ, adres: adresEkranu } = require('./ekrany-dane.cjs');
const root = path.resolve(__dirname, '../www');
const BASELINE = path.join(REPO, 'quality/baselines/wstecz-tabela.json');
(async () => {
  const server = await serwer(root);
  const B = server.url, fails = [], roz = [], tabela = [];
  // Nawigacja do ekranu apki: gdy strona już jest apką (index.html, szkielet wystartował) – OESTEkrany.go (adres zmienia tylko replaceState,
  // hash w adresie nie jest nawigacją); w przeciwnym razie (pusta karta, strona inspekcji) – prawdziwe wczytanie strony.
  const idz = async (pg, r) => { const u = new URL(pg.url()); if (!/inspekcje/.test(u.pathname) && /(index\.html|\/)$/.test(u.pathname) && await pg.evaluate(() => !!(window.OESTEkrany && OESTEkrany.trasa())).catch(() => false)) await pg.evaluate(x => OESTEkrany.go(x), r); else await pg.goto(B + '/index.html#' + r); };
  let browser, sprawdzen = 0;
  const check = (ok, msg) => { sprawdzen++; if (!ok) fails.push(msg); return ok; };
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.OEST_BROWSER_PATH ? { executablePath: process.env.OEST_BROWSER_PATH } : {}) });
    // rekordy raz, w jednym profilu przeglądarki (IndexedDB zostaje między stronami tego kontekstu)
    const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, serviceWorkers: 'block' });
    await ctx.addInitScript(k => {
      if (!sessionStorage.getItem('bez.konta')) localStorage.setItem('oest.account', k); else localStorage.removeItem('oest.account');
      // telefon: wtyczka App przyjmuje słuchacza „backButton”; test wysyła to zdarzenie jak Android
      window.__wstecz = []; window.__wyjscie = 0; window.__bb = 0;
      const dodaj = document.addEventListener.bind(document); // nasłuchy „backbutton” na document (Ionic): ma być dokładnie jeden
      document.addEventListener = function (typ, ...r) { if (typ === 'backbutton') window.__bb++; return dodaj(typ, ...r); };
      window.Capacitor = { isNativePlatform: () => true, isPluginAvailable: n => n === 'App', Plugins: { App: { addListener: (n, cb) => { if (n === 'backButton') window.__wstecz.push(cb); return Promise.resolve({ remove() {} }); }, exitApp: () => { window.__wyjscie++; } } } };
    }, JSON.stringify(KONTO));
    const pg = await ctx.newPage(), errs = []; pg.on('pageerror', e => errs.push(e.message));
    await idz(pg, 'home'); await pg.waitForLoadState('networkidle');
    const ids = await zasiej(pg);
    ids.draft = await szkic(pg, B, ids.leaf);
    for (const k of new Set([...Object.values(ID), ...Object.values(DOKLEJ)])) check(!!ids[k], 'nie udało się utworzyć rekordu „' + k + '” dla ekranów z :id');
    // ekran na Vue (hub Ustawień) nie ma widoku v-…: jego id = v-<trasa>
    const stan = () => pg.evaluate(() => ({ hash: location.hash.slice(1), widok: (v => v || (document.querySelector('ion-content > .ion-padding') ? 'v-' + OESTEkrany.trasa().split('/')[0] : ''))([...document.querySelectorAll('.view')].filter(s => !s.hidden).map(s => s.id).join(',')), pytanie: !!document.querySelector('.oest-ask'), sluchaczy: window.__bb, wyjscie: window.__wyjscie }));
    // po Wstecz: czekamy na stan (okienko pytania zniknęło z DOM albo ma zostać), nie na czas
    const wstecz = async (okienkoZnika = true) => { await pg.evaluate(() => document.dispatchEvent(new Event('backbutton'))); if (okienkoZnika) await pg.locator('.oest-ask').waitFor({ state: 'detached', timeout: 3000 }).catch(() => {}); await pg.waitForLoadState('networkidle'); await pg.waitForTimeout(150); };
    const pudelko = id => (MAPA.find(e => e.id === id) || {}).pudelko;
    for (const e of MAPA) {
      const id = e.id, adres = adresEkranu(id, ids), rodzic = e.rodzic && (ID[e.rodzic] ? e.rodzic.replace(':id', ids[ID[e.rodzic]]) : e.rodzic);
      await pg.evaluate(bez => bez ? sessionStorage.setItem('bez.konta', '1') : sessionStorage.removeItem('bez.konta'), id === 'start');
      await idz(pg, '' + adres); await pg.waitForLoadState('networkidle');
      // ekran wczytujący dane (np. Edytor pytań: najpierw „Wczytywanie…”, potem pasek ze strzałką) – czekamy na stan, nie na czas;
      // po 3 s ocena idzie dalej tym samym warunkiem co niżej (nic nie jest luzowane, tylko nie oceniamy ekranu w trakcie wczytywania)
      await pg.waitForFunction(([a, p, r]) => { const s = document.getElementById(p), b = [document.querySelector('#' + p + ' .top .back'), document.querySelector('ion-back-button[data-nav="up"]')].find(x => x && x.getClientRects().length > 0), vue = !!document.querySelector('ion-content > .ion-padding') && window.OESTEkrany && ('v-' + OESTEkrany.trasa().split('/')[0]) === p; return location.hash.slice(1) === a && ((s && !s.hidden) || vue) && (!r || (!!b && b.getClientRects().length > 0)); }, [adres, e.pudelko, !!e.rodzic], { timeout: 3000 }).catch(() => {});
      await pg.waitForTimeout(150);
      const s0 = await stan();
      if (!check(s0.sluchaczy === 1, id + ': strona zarejestrowała ' + s0.sluchaczy + ' słuchaczy „backButton” (ma być dokładnie 1)')) continue;
      // ekran jest otwarty, gdy adres i sekcja się zgadzają, a ekran z rodzicem ma widoczną strzałkę ‹ w górnym pasku
      // (panel błędu modułu, np. „Ta zmiana jest już zarchiwizowana”, nie ma strzałki – to nie jest ten ekran)
      const strzalka = await pg.evaluate(p => { const b = [document.querySelector('#' + p + ' .top .back'), document.querySelector('ion-back-button[data-nav="up"]')].find(x => x && x.getClientRects().length > 0); return !!b; }, e.pudelko); // strzałka ‹ w starym nagłówku .top albo w pasku Ionic
      const otwarty = s0.hash === adres && s0.widok === e.pudelko && (!e.rodzic || strzalka);
      const wiersz = { id, adres, rodzic: rodzic || null, otwarty, przed: s0.hash + ' ' + s0.widok };
      tabela.push(wiersz);
      if (DOKLEJ[id]) roz.push({ id: 'mapa-bez-id:' + id, opis: id + ': mapa ekrany.json nie ma części zmiennej, apka otwiera ten ekran tylko jako ' + id + '/<id>' });
      if (!otwarty) { roz.push({ id: 'nie-otwiera:' + id, opis: id + ': pod adresem #' + adres + ' widać #' + s0.hash + ' ' + s0.widok + (strzalka ? '' : ' bez strzałki ‹') + ' zamiast ekranu w ' + e.pudelko }); continue; }
      // 2a. okienko apki (pytanie): Wstecz zamyka, ekran zostaje
      await pg.evaluate(() => { window.OESTPrzycisk.confirm('Test okienka', { ok: 'OK', cancel: 'Anuluj' }); });
      await pg.locator('.oest-ask').waitFor({ timeout: 3000 }).catch(() => {});
      check(await pg.locator('.oest-ask').count() > 0, id + ': okienko pytania nie otworzyło się');
      await wstecz();
      const s1 = await stan();
      if (!(s1.pytanie === false && s1.hash === adres && s1.widok === e.pudelko)) roz.push({ id: 'okienko:' + id, opis: id + ': Wstecz przy otwartym okienku → okienko ' + (s1.pytanie ? 'zostało' : 'zamknięte') + ', ekran #' + s1.hash + ' ' + s1.widok });
      else check(true, '');
      // 2b. każdy <dialog> obecny na ekranie: Wstecz zamyka najwyższy, ekran zostaje
      const dialogi = await pg.evaluate(() => [...document.querySelectorAll('dialog[id]')].map(d => d.id));
      for (const d of dialogi) {
        await pg.evaluate(d => document.getElementById(d).showModal(), d);
        await wstecz();
        const s2 = await stan(), zamk = await pg.evaluate(d => !document.getElementById(d).open, d);
        if (!(zamk && s2.hash === adres && s2.widok === e.pudelko)) roz.push({ id: 'dialog:' + id + ':' + d, opis: id + ': Wstecz przy <dialog id=' + d + '> → ' + (zamk ? 'zamknięty' : 'otwarty') + ', ekran #' + s2.hash });
        else check(true, '');
      }
      // 3. Wstecz na ekranie (na ekranie bez rodzica ma się pojawić pytanie – nie czekamy na jego zniknięcie)
      await wstecz(!!e.rodzic);
      if (!e.rodzic) await pg.locator('.oest-ask').waitFor({ timeout: 3000 }).catch(() => {});
      const s3 = await stan();
      if (!e.rodzic) {
        const ok = s3.pytanie && s3.hash === adres && s3.wyjscie === 0;
        wiersz.po = s3.pytanie ? 'pytanie o wyjście' : '#' + s3.hash;
        if (!ok) roz.push({ id: 'wstecz:' + id, opis: id + ': Wstecz na ekranie bez rodzica → ' + wiersz.po + ' (ma być pytanie „Chcesz wyjść z aplikacji?”)' });
        else {
          check(true, '');
          await wstecz(); const s4 = await stan(); // Wstecz w pytaniu = Nie
          check(!s4.pytanie && s4.hash === adres && s4.wyjscie === 0, id + ': Wstecz w pytaniu o wyjście nie zadziałał jak „Nie” (pytanie ' + s4.pytanie + ', #' + s4.hash + ', wyjście ' + s4.wyjscie + ')');
        }
      } else {
        wiersz.po = '#' + s3.hash + ' ' + s3.widok;
        const ok = !s3.pytanie && s3.hash === rodzic && s3.widok === pudelko(e.rodzic);
        if (!ok) roz.push({ id: 'wstecz:' + id + '>' + s3.hash.replace(Object.values(ids).find(v => v && s3.hash.endsWith('/' + v)) || '\u0000', ':id'), opis: id + ': Wstecz → ' + wiersz.po + (s3.pytanie ? ' + pytanie' : '') + ' zamiast #' + rodzic });
        else check(true, '');
      }
    }
    check(!errs.length, 'błędy strony: ' + errs.join(' | '));
    await ctx.close();
  } finally { if (browser) await browser.close(); server.close(); }
  const base = JSON.parse(fs.readFileSync(BASELINE, 'utf8')), known = new Set(base.entries.map(x => x.id)), now = new Set(roz.map(x => x.id));
  for (const r of roz) if (!known.has(r.id)) fails.push('nowa rozbieżność spoza listy ' + path.basename(BASELINE) + ': ' + r.id + ' – ' + r.opis);
  for (const k of known) if (!now.has(k)) fails.push('wpis ' + k + ' z listy ' + path.basename(BASELINE) + ' już nie występuje – usuń go (lista maleje)');
  check(tabela.length === MAPA.length, 'sprawdzono ' + tabela.length + ' z ' + MAPA.length + ' ekranów mapy');
  if (process.env.OEST_DEBUG) { console.log(JSON.stringify(tabela, null, 1)); console.log(JSON.stringify(roz, null, 1)); }
  if (fails.length) { console.error('WSTECZ TABELA UI FAIL:\n - ' + fails.join('\n - ')); process.exit(1); }
  console.log('WSTECZ TABELA UI PASS: ' + tabela.length + ' ekranów z mapy (ekrany.json), okienko i <dialog> na każdym, zdarzenie backButton; znane rozbieżności z listy: ' + roz.length + '; ' + sprawdzen + ' sprawdzeń');
})().catch(e => { console.error('WSTECZ TABELA UI FAIL:', e && e.stack || e); process.exit(1); });
