// Klocek inspekcji (Grzegorz 07/11/2026, zgoda na budowę 22:10): moduly/klocek → OESTKlocek.inspekcja + przytrzymaj + info.
// Zasada: wszystkie klocki identyczne, każdy element w STAŁYM miejscu i stałej wielkości, także gdy jest pusty; PL i EN bez skoków.
// Sprawdza w Chrome (412×915 jak Pixel 8 Pro) na prawdziwej liście Inspekcji i w Kalendarzu:
//  1) linia 1: nazwa + pigułka statusu (OESTZnacznik.status), linia 2: lokalizacja · słupki · częstotliwość · formularz,
//     linia 3: termin │ zdjęcia │ OK/pytania │ miejsce na usterki – te same x/szerokości w każdym klocku i w PL/EN,
//  2) teksty mieszczą się w swoich polach (najdłuższe: „28/12 tomorrow”, „TB/L13”, „11M”, „99/99”),
//  3) termin: „DD/MM za 4D”, „jutro” pomarańczowy, „dziś” i zaległe „−3D” czerwone, od 31 dni miesiące,
//  4) przytrzymanie ~0,4 s → okno informacji (pełna nazwa z Vantify), zostaje po puszczeniu palca, stuknięcie gdziekolwiek zamyka,
//     inspekcja się nie otwiera; krótkie stuknięcie dalej otwiera inspekcję.
// Ionic + Vue (23/11/2026): klocek = czesci/Klocek.vue (ion-card.oest-klocek), pigułka statusu w linii 2 (ion-badge.oest-pigulka), bez strzałki z prawej,
//  numer zlecenia Vantify w linii 3, stuknięcie w dowolne miejsce otwiera, okno informacji = ion-modal (czesci/InfoInspekcji.vue, krzyżyk w pasku okna,
//  bez przycisków na dole). Pola: nazwa h2, pigułka, .oest-klok, .oest-kcz, .oest-kdt, liczniki strong[data-rodzaj=zdjecia|pytania], miejsce na usterki .oest-kus (jak .kus na main); numer zlecenia w linii 1 (Grzegorz 23/11).
// Uruchomienie: OEST_PLAYWRIGHT_PATH=… OEST_BROWSER_PATH=… node app/tests/klocek-inspekcji-ui-check.cjs  (po npm run copy-web)
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const { chromium } = require('./przegladarka.cjs');
const root = path.resolve(__dirname, '../www');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const p = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(root + path.sep) && p !== root) { res.writeHead(403).end(); return; }
  const file = p === root ? path.join(root, 'index.html') : p;
  fs.readFile(file, (e, b) => { if (e) { res.writeHead(404).end(); return; } res.setHeader('Content-Type', TYPES[path.extname(file)] || 'application/octet-stream'); res.end(b); });
});
const fails = [], R = {};
function check(ok, msg) { if (!ok) fails.push(msg); }
// stan jak w telefonie Grzegorza: kilka inspekcji w różnych etapach (Gotowa, W trakcie z usterkami, Wstrzymana)
const STAGE = now => ({
  'EFA-INS-014': { s: 'done', at: now, period: '2026-11-30', day: '2099-01-01', photos: 4, sheet: 1, used: 12, ok: 12, total: 12 },
  'EFA-INS-024': { s: 'prog', at: now, photos: 7, used: 20, ok: 8, total: 20, issues: 2 },
  'EFA-INS-019': { s: 'hold', at: now, photos: 2 }
});
const POLA = ['knm', 'oest-st', 'klok', 'kcz', 'kdt', 'kn2', 'kn5', 'kus'];
// pola starego klocka → elementy klocka Ionic (te same nazwy w komunikatach)
const SEL = { knm: 'h2', 'oest-st': 'ion-badge.oest-pigulka', klok: '.oest-klok', kcz: '.oest-kcz', kdt: '.oest-kdt', kn2: 'strong[data-rodzaj="zdjecia"]', kn5: 'strong[data-rodzaj="pytania"]', kus: '.oest-kus' };
const KLOCEK = '#oest-szkielet ion-content ion-card.oest-klocek[data-id]', OKNO = 'ion-modal.show-modal';
const OKNO_INFO = () => { const m = document.querySelector('ion-modal.show-modal'); return m && m.querySelector('ion-list') ? m : null; };

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const url = 'http://127.0.0.1:' + server.address().port;
  let browser; const errors = [];
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.OEST_BROWSER_PATH ? { executablePath: process.env.OEST_BROWSER_PATH } : {}) });
    const c = await browser.newContext({ viewport: { width: 412, height: 915 } });
    await c.addInitScript(s => {
      localStorage.setItem('oest.account', JSON.stringify({ provider: 'local', id: 'test', email: '', name: 'Test', t: 1 }));
      if (!sessionStorage.getItem('ki-seed')) { sessionStorage.setItem('ki-seed', '1'); localStorage.setItem('oest.ppm.stage', s); }
    }, JSON.stringify(STAGE(Date.now())));
    await c.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
    const p = await c.newPage(); p.on('pageerror', e => errors.push(e.message));
    await p.goto(url + '/index.html#ppm'); await p.locator(KLOCEK).first().waitFor(); await p.waitForTimeout(500);
    const setLang = l => p.evaluate(l => { window.OESTSettings.update(s => { s.appearance.language = l; }); window.OESTSettingsUI.applyTheme(); }, l);
    const geo = () => p.evaluate(([POLA, SEL, KLOCEK]) => {
      const out = [...document.querySelectorAll(KLOCEK)].map(k => {
        const kr = k.getBoundingClientRect(), o = { id: k.dataset.id || k.dataset.fam, h: Math.round(kr.height), linie: k.querySelectorAll(':scope > .oest-kr').length };
        for (const c of POLA) {
          const e = k.querySelector(SEL[c]); if (!e) { o[c] = null; continue; }
          const r = e.getBoundingClientRect();
          o[c] = { x: Math.round(r.left - kr.left), y: Math.round(r.top - kr.top), w: Math.round(r.width), miesci: c === 'knm' || e.scrollWidth <= e.clientWidth + 1 };
        }
        o.ikony = [...k.querySelectorAll('.oest-kr > ion-icon')].map(i => { const r = i.getBoundingClientRect(); return Math.round(r.width) + 'x' + Math.round(r.height); });
        return o;
      });
      return out;
    }, [POLA, SEL, KLOCEK]);
    await setLang('pl'); await p.waitForTimeout(300);
    R.pl = await geo();
    await setLang('en'); await p.waitForTimeout(300);
    R.en = await geo();
    check(R.pl.length > 20, `za mało klocków na liście: ${R.pl.length}`);
    check(R.pl.length === R.en.length, 'PL i EN: różna liczba klocków');
    const wzor = R.pl[0];
    for (const lang of ['pl', 'en']) R[lang].forEach((k, i) => {
      const gdzie = `${lang}/${k.id}`;
      check(k.linie === 3, `${gdzie}: ${k.linie} linie zamiast 3`);
      check(k.h === wzor.h, `${gdzie}: wysokość ${k.h} px, a pierwszy klocek ${wzor.h} px`);
      check((k.ikony.length === 5 || k.ikony.length === 6) && k.ikony.every(x => x === '21x21'), `${gdzie}: ikony ${k.ikony.join(',')} (ma być 5 × 21x21, usterki tylko gdy są)`);
      for (const c of POLA) {
        check(!!k[c], `${gdzie}: brak pola .${c}`); if (!k[c] || !wzor[c]) continue;
        check(k[c].miesci, `${gdzie}: tekst nie mieści się w .${c}`);
        if (c === 'knm') { check(k[c].x === wzor[c].x && k[c].y === wzor[c].y, `${gdzie}: nazwa zaczyna się w innym miejscu`); continue; }
        check(k[c].x === wzor[c].x && k[c].y === wzor[c].y && k[c].w === wzor[c].w, `${gdzie}: pole .${c} ${JSON.stringify(k[c])} zamiast ${JSON.stringify(wzor[c])}`);
      }
      const pl = R.pl[i];
      if (lang === 'en') for (const c of POLA) if (pl[c] && k[c]) check(pl[c].x === k[c].x && pl[c].w === k[c].w && pl[c].y === k[c].y, `${k.id}: pole .${c} skacze przy zmianie języka`);
    });
    // treść: Gotowa, W trakcie (8/20, usterki 2), Wstrzymana, ATS TB/L13
    R.tresc = await p.evaluate(([SEL, KLOCEK]) => {
      const q = id => document.querySelector(KLOCEK.replace('[data-id]', '[data-id="' + id + '"]')), t = (k, s) => { const e = k && k.querySelector(s); return e ? e.textContent : null; };
      const st = k => { const e = k && k.querySelector(SEL['oest-st']); return e ? e.dataset.tryb || '' : null; };
      // zielony znak formularza: ikona dokumentu w linii 2 (data-ton="ok") w kolorze rgb(33, 196, 90) = #21c45a
      const form = k => { const e = k && k.querySelector('.oest-kr > ion-icon[data-ton]:not([aria-hidden])'); return !!(e && e.dataset.ton === 'ok' && getComputedStyle(e).color === 'rgb(33, 196, 90)'); };
      const a = q('EFA-INS-014'), b = q('EFA-INS-024'), h = q('EFA-INS-019');
      return { ats: { st: st(a), lok: t(a, SEL.klok), cz: t(a, SEL.kcz), qa: t(a, SEL.kn5), foto: t(a, SEL.kn2), formOk: form(a) },
        wt: { st: st(b), qa: t(b, SEL.kn5), us: t(b, SEL.kus), lok: t(b, SEL.klok) }, hold: st(h) };
    }, [SEL, KLOCEK]);
    check(/gotowa/.test(R.tresc.ats.st) && R.tresc.ats.lok === 'TB/L13' && R.tresc.ats.cz === '1M' && R.tresc.ats.qa === '12/12' && R.tresc.ats.foto === '4' && R.tresc.ats.formOk, 'ATS L13 (Gotowa): ' + JSON.stringify(R.tresc.ats));
    check(/wtrakcie/.test(R.tresc.wt.st) && R.tresc.wt.qa === '8/20' && R.tresc.wt.us === '2' && R.tresc.wt.lok === 'TB', 'Water Temperature TB (W trakcie): ' + JSON.stringify(R.tresc.wt));
    check(/wstrzymana/.test(R.tresc.hold || ''), 'AOV TB (Wstrzymana): ' + R.tresc.hold);
    // termin i najdłuższe teksty w polach (PL/EN)
    // termin: jedna reguła OESTKlocek.termin (lista Ionic bierze ją przez OESTPpmUI.termin); najdłuższe teksty: trzy klocki dopisane na początek prawdziwej listy
    // (dane w formacie czesci/Klocek.vue, jak OESTKlocek.inspekcja na main), pomiar w ekranie, potem lista wraca do swoich danych
    R.termin = {};
    for (const l of ['pl', 'en']) {
      Object.assign(R.termin, await p.evaluate(l => {
        const K = window.OESTKlocek, U = window.OESTPpmUI, d = new Date(2026, 11, 28), out = {};
        window.OESTSettings.update(s => { s.appearance.language = l; }); window.OESTSettingsUI.applyTheme();
        out[l] = [-3, -45, 0, 1, 4, 30, 31, 40].map(n => { const x = K.termin(d, n); return x.text + '|' + x.tone; }).concat([K.termin(d, 9, true).text, K.termin(null, null).text]);
        const kl = (id, status, loc, freq, form, left, photos, qa, issues) => ({ id, nazwa: id.toUpperCase(), znak: loc, czestotliwosc: U.czest(freq), formularz: form, status: { tryb: status }, termin: U.termin(d, left),
          ikony: [{ rodzaj: 'zdjecia', n: photos }, { rodzaj: 'pytania', n: qa }, { rodzaj: 'usterki', n: issues || '', ton: 'warning' }], numer: '' });
        const extra = [kl('ki-x', 'wstrzymana', 'TB/L13', '11M', 'blad', 1, 99, '99/99', 99), kl('ki-y', 'zalegla', 'TA/GL', '12M', 'brak', -45, 0, '–', 0), kl('ki-z', 'gotowa', '', '', 'brak', 30, 5, '–', 0)];
        const o = U.ppmDane; window.__kiPpm = o; U.ppmDane = function () { const r = o.apply(this, arguments); return Object.assign({}, r, { klocki: extra.concat(r.klocki) }); };
        window.dispatchEvent(new Event('oest:ppm-ui'));
        return out;
      }, l));
      await p.locator('ion-card.oest-klocek[data-id="ki-z"]').waitFor(); await p.waitForTimeout(300);
      Object.assign(R.termin, await p.evaluate(([l, SEL]) => {
        const box = ['ki-x', 'ki-y', 'ki-z'].map(id => document.querySelector('ion-card.oest-klocek[data-id="' + id + '"]')), out = {}, all = s => box.flatMap(k => [...k.querySelectorAll(s)]);
        out[l + 'Miesci'] = all([SEL.klok, SEL.kcz, SEL.kdt, '.oest-kr strong', SEL['oest-st']].join(',')).filter(e => e.scrollWidth > e.clientWidth + 1).map(e => e.className + ':' + e.textContent);
        out[l + 'Kolor'] = all(SEL.kdt).map(e => getComputedStyle(e).color);
        out[l + 'Y'] = box[1].querySelector(SEL.kcz).textContent;
        window.OESTPpmUI.ppmDane = window.__kiPpm; window.dispatchEvent(new Event('oest:ppm-ui'));
        return out;
      }, [l, SEL]));
      await p.locator('ion-card.oest-klocek[data-id="ki-x"]').waitFor({ state: 'detached' });
    }
    check(JSON.stringify(R.termin.pl) === JSON.stringify(['28/12 −3D|red', '28/12 −1M|red', '28/12 dziś|red', '28/12 jutro|jutro', '28/12 za 4D|', '28/12 za 30D|', '28/12 za 1M|', '28/12 za 1M|', '28/12', '–']), 'termin PL: ' + JSON.stringify(R.termin.pl));
    check(JSON.stringify(R.termin.en) === JSON.stringify(['28/12 −3D|red', '28/12 −1M|red', '28/12 today|red', '28/12 tomorrow|jutro', '28/12 in 4D|', '28/12 in 30D|', '28/12 in 1M|', '28/12 in 1M|', '28/12', '–']), 'termin EN: ' + JSON.stringify(R.termin.en));
    for (const l of ['pl', 'en']) {
      check(R.termin[l + 'Miesci'].length === 0, `${l}: najdłuższe teksty nie mieszczą się: ${R.termin[l + 'Miesci'].join(', ')}`);
      check(R.termin[l + 'Kolor'][0] === 'rgb(255, 138, 61)' && R.termin[l + 'Kolor'][1] === 'rgb(239, 59, 54)', `${l}: kolory terminu jutro/zaległy ${R.termin[l + 'Kolor']}`);
      check(R.termin[l + 'Y'] === 'Y', `${l}: 12M ma być „Y”, jest „${R.termin[l + 'Y']}”`);
    }
    // przytrzymanie → okno informacji; puszczenie palca → zostaje; stuknięcie gdziekolwiek → zamyka; inspekcja się nie otwiera
    await setLang('pl'); await p.waitForTimeout(200);
    const el = p.locator(KLOCEK.replace('[data-id]', '[data-id="EFA-INS-024"]')); await el.scrollIntoViewIfNeeded();
    const bb = await el.boundingBox();
    await p.mouse.move(bb.x + 150, bb.y + 40); await p.mouse.down(); await p.waitForTimeout(650);
    // okno informacji (ion-modal): pierwszy wiersz = pełna nazwa, wiersze z ikoną; przyciski = pasek na dole (ion-footer) i przyciski w treści – krzyżyk w pasku okna jest zawsze
    R.info = { poPrzytrzymaniu: await p.evaluate(() => { const b = document.querySelector('ion-modal.show-modal'); if (!b || !b.querySelector('ion-list')) return null; const c = b.querySelector('ion-content'); return { tytul: c.querySelector('ion-item h2').textContent.trim(), wiersze: c.querySelectorAll('ion-item ion-icon[slot="start"]').length, przyciski: b.querySelectorAll('ion-footer').length + c.querySelectorAll('ion-button, button').length, tekst: c.textContent }; }) };
    // palec dalej trzyma po otwarciu okna: Android nie może zaznaczyć tekstu ani pokazać paska Kopiuj/Udostępnij (Pixel, Grzegorz 08/11/2026)
    // Ionic: zaznaczenie blokuje okno (selectstart odrzucony – tak zaczyna się zaznaczanie przytrzymaniem palca), a nie styl user-select; zaznaczenie po puszczeniu palca
    // sprawdzane niżej jak na main (getSelection pusty)
    R.info.zaznaczanie = await p.evaluate(() => {
      const b = document.querySelector('ion-modal.show-modal'); if (!b || !b.querySelector('ion-list')) return null;
      const s = b.querySelector('ion-content ion-item:nth-child(2) ion-label');
      const ev = new MouseEvent('contextmenu', { bubbles: true, cancelable: true }); s.dispatchEvent(ev);
      const ss = new Event('selectstart', { bubbles: true, cancelable: true }); s.dispatchEvent(ss);
      return { userSelect: ss.defaultPrevented ? 'none' : 'zaznaczanie dozwolone', menuZablokowane: ev.defaultPrevented };
    });
    await p.mouse.up(); await p.waitForTimeout(400);
    R.info.zaznaczenie = await p.evaluate(() => getSelection().toString());
    R.info.poPuszczeniu = await p.evaluate(`!!(${OKNO_INFO})()`);
    R.info.url = p.url();
    await p.mouse.click(30, 120); await p.waitForTimeout(600);
    await p.locator(OKNO).waitFor({ state: 'detached', timeout: 3000 }).catch(() => {});
    R.info.poStuknieciu = await p.evaluate(`!!(${OKNO_INFO})()`);
    R.info.urlPo = p.url();
    const inf = R.info.poPrzytrzymaniu || {};
    check(inf.tytul === 'Water Temperature Checks (Tower B)', 'okno informacji: tytuł (pełna nazwa z Vantify) = ' + inf.tytul);
    check(inf.przyciski === 0 && inf.wiersze === 7, `okno informacji: ${inf.wiersze} wierszy, ${inf.przyciski} przycisków (ma być 7 wierszy z usterkami, bez przycisków poza krzyżykiem okna)`);
    check(/TB – Tower B/.test(inf.tekst || '') && /Vantify 959234/.test(inf.tekst || '') && /30\/11\/2026/.test(inf.tekst || '') && /OK 8 \/ 20/.test(inf.tekst || ''), 'okno informacji: treść ' + inf.tekst);
    const zz = R.info.zaznaczanie || {};
    check(zz.userSelect === 'none' && zz.menuZablokowane, 'okno informacji pozwala zaznaczyć tekst / otworzyć pasek Kopiuj: ' + JSON.stringify(zz));
    check(R.info.zaznaczenie === '', 'po przytrzymaniu zostało zaznaczenie tekstu: „' + R.info.zaznaczenie + '”');
    check(R.info.poPuszczeniu, 'okno informacji znika po puszczeniu palca (ma zostać)');
    check(!R.info.poStuknieciu, 'okno informacji nie zamyka się po stuknięciu');
    check(/#ppm$/.test(R.info.url) && /#ppm$/.test(R.info.urlPo), 'przytrzymanie otworzyło inspekcję: ' + R.info.urlPo);
    // przesunięcie palca (przewijanie) – bez okna
    await p.mouse.move(bb.x + 150, bb.y + 40); await p.mouse.down(); await p.mouse.move(bb.x + 150, bb.y + 90, { steps: 4 }); await p.waitForTimeout(600);
    R.info.przewijanie = await p.evaluate(`!!(${OKNO_INFO})()`);
    await p.mouse.move(30, 120); await p.mouse.up(); await p.waitForTimeout(300); // palec zjeżdża z klocka (przewijanie) – bez stuknięcia
    check(!R.info.przewijanie, 'ruch palca (przewijanie) otwiera okno informacji');
    // bardzo długie przytrzymanie (2,5 s): po puszczeniu palca okno zostaje, inspekcja się nie otwiera (uwaga Codex w PR #87)
    await p.mouse.move(bb.x + 150, bb.y + 40); await p.mouse.down(); await p.waitForTimeout(2500); await p.mouse.up(); await p.waitForTimeout(500);
    R.info.dlugie = { okno: await p.evaluate(`!!(${OKNO_INFO})()`), url: p.url() };
    check(R.info.dlugie.okno && /index\.html#ppm$/.test(R.info.dlugie.url), 'przytrzymanie 2,5 s: ' + JSON.stringify(R.info.dlugie));
    await p.mouse.click(30, 120); await p.locator(OKNO).waitFor({ state: 'detached', timeout: 3000 }).catch(() => {}); await p.waitForTimeout(300);
    // Gotowa: okno pokazuje termin i zlecenie z klocka (zakończony okres 30/11), nie następne zlecenie (uwaga Codex w PR #87)
    const g = p.locator(KLOCEK.replace('[data-id]', '[data-id="EFA-INS-014"]')); await g.scrollIntoViewIfNeeded(); const gb = await g.boundingBox();
    await p.mouse.move(gb.x + 150, gb.y + 40); await p.mouse.down(); await p.waitForTimeout(650); await p.mouse.up(); await p.waitForTimeout(300);
    R.info.gotowa = await p.evaluate(() => { const b = document.querySelector('ion-modal.show-modal'); return b && b.querySelector('ion-list') ? b.querySelector('ion-content').textContent : null; });
    check(/30\/11\/2026/.test(R.info.gotowa || '') && /OK 12 \/ 12/.test(R.info.gotowa || ''), 'okno informacji Gotowej: ' + R.info.gotowa);
    await p.mouse.click(30, 120); await p.locator(OKNO).waitFor({ state: 'detached', timeout: 3000 }).catch(() => {}); await p.waitForTimeout(300);
    // krótkie stuknięcie dalej otwiera inspekcję
    await p.locator(KLOCEK.replace('[data-id]', '[data-id="EFA-INS-024"]')).click(); await p.waitForTimeout(800);
    R.info.stukniecie = p.url();
    check(/inspekcje\/index\.html#ppm=EFA-INS-024/.test(R.info.stukniecie), 'krótkie stuknięcie nie otwiera inspekcji: ' + R.info.stukniecie);
    // Kalendarz: ten sam klocek
    await p.goto(url + '/index.html#cal'); await p.locator('ion-button.oest-cd[data-cd]').first().waitFor(); await p.waitForTimeout(500);
    // dzień z inspekcjami: kratka miesiąca z licznikiem (ion-badge); klocki dnia pod siatką
    await p.locator('.oest-cdk:has(> ion-badge) > ion-button.oest-cd[data-cd]').first().click(); await p.locator(KLOCEK).first().waitFor({ timeout: 3000 }).catch(() => {});
    R.kalendarz = await p.evaluate(KLOCEK => { const k = document.querySelector(KLOCEK); return k ? { linie: k.querySelectorAll(':scope > .oest-kr').length, st: !!k.querySelector('ion-badge.oest-pigulka'), dzien: k.dataset.day } : null; }, KLOCEK);
    // przyszły termin w Kalendarzu: okno bez postępu bieżącej inspekcji (uwaga Codex w PR #87)
    // klocek Kalendarza na przyszły termin (data-day) → okno informacji: przytrzymanie klocka dnia przekazuje { id, day } do OESTPpmUI.info (czesci/listaInspekcji.js),
    // a okno pokazuje jego wiersze – tu ten sam klocek z dniem 2026-12-30 (na main: sztuczny .ki w #calDay)
    R.kalendarzInfo = await p.evaluate(st => { localStorage.setItem('oest.ppm.stage', st); const d = window.OESTPpmUI.info({ id: 'EFA-INS-024', day: '2026-12-30' }); return d ? d.tytul + ' ' + d.wiersze.map(r => r.czesci.map(c => c.t).join('')).join(' ') : null; }, JSON.stringify(STAGE(Date.now())));
    check(/zrobiono 0/.test(R.kalendarzInfo) && !/OK 8/.test(R.kalendarzInfo) && !/Usterki/.test(R.kalendarzInfo), 'okno dla przyszłego terminu pokazuje postęp bieżącej inspekcji: ' + R.kalendarzInfo);
    check(R.kalendarz && R.kalendarz.linie === 3 && R.kalendarz.st && /^\d{4}-\d\d-\d\d$/.test(R.kalendarz.dzien), 'Kalendarz: klocek ' + JSON.stringify(R.kalendarz));
    await c.close();
    // wąskie i szerokie ekrany: każdy element klocka w całości wewnątrz klocka (uwaga Codex w PR #87: 360 px ucinało usterki)
    R.ekrany = {};
    for (const W of [360, 412, 448]) {
      const c2 = await browser.newContext({ viewport: { width: W, height: 800 } });
      await c2.addInitScript(s => { localStorage.setItem('oest.account', JSON.stringify({ provider: 'local', id: 'test', email: '', name: 'Test', t: 1 })); localStorage.setItem('oest.ppm.stage', s); }, JSON.stringify(STAGE(Date.now())));
      await c2.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
      const p2 = await c2.newPage(); p2.on('pageerror', e => errors.push(e.message));
      await p2.goto(url + '/index.html#ppm'); await p2.locator(KLOCEK).first().waitFor(); await p2.waitForTimeout(500);
      R.ekrany[W] = {};
      for (const lang of ['pl', 'en']) {
        await p2.evaluate(l => { window.OESTSettings.update(s => { s.appearance.language = l; }); window.OESTSettingsUI.applyTheme(); }, lang); await p2.waitForTimeout(250);
        // klocek Ionic nie ma strzałki z prawej (stuknięcie w dowolne miejsce otwiera – Grzegorz 23/11): każdy element linii w całości wewnątrz klocka
        R.ekrany[W][lang] = await p2.evaluate(KLOCEK => {
          const zle = [];
          document.querySelectorAll(KLOCEK).forEach(k => {
            const kr = k.getBoundingClientRect();
            k.querySelectorAll('.oest-kr > *').forEach(e => { const r = e.getBoundingClientRect(); if (r.width && (r.right > kr.right - 6 || r.left < kr.left)) zle.push((k.dataset.id || k.dataset.fam) + ' .' + (e.getAttribute('class') || e.tagName)); });
            k.querySelectorAll('.oest-kdt,.oest-kr strong,.oest-klok,.oest-kcz').forEach(e => { if (e.scrollWidth > e.clientWidth + 1) zle.push((k.dataset.id || k.dataset.fam) + ' nie mieści się: ' + e.textContent); });
          });
          return zle;
        }, KLOCEK);
        check(R.ekrany[W][lang].length === 0, `${W} px ${lang}: ` + R.ekrany[W][lang].slice(0, 6).join(', '));
      }
      await c2.close();
    }
    check(errors.length === 0, 'błędy strony: ' + errors.join(' | '));
  } catch (e) { fails.push('wyjątek: ' + (e && e.stack || e)); }
  finally { if (browser) await browser.close(); server.close(); }
  console.log(JSON.stringify({ klocki: R.pl && R.pl.length, wzor: R.pl && R.pl[0], tresc: R.tresc, termin: R.termin, info: R.info, kalendarz: R.kalendarz, kalendarzInfo: R.kalendarzInfo, ekrany: R.ekrany }, null, 1));
  if (fails.length) { console.error('KLOCEK INSPEKCJI UI FAIL\n- ' + fails.slice(0, 40).join('\n- ')); process.exit(1); }
  console.log('KLOCEK INSPEKCJI UI PASS (' + R.pl.length + ' klocków × PL/EN, stałe miejsca, okno informacji)');
})();
