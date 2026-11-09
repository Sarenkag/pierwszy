// Zasady modułów w prawdziwej przeglądarce (Grzegorz 05/11/2026: „zasady modułu = testy automatyczne blokujące build”).
// Logika wysyłki i połączenia Google: moduly-zasady.test.cjs. Tu to, co widać i czego się dotyka. Chrome 412×915 jak Pixel 8 Pro, PL i EN.
//
//  P  moduly/przycisk (jeden przycisk akcji):
//     P1 w trakcie pracy: zablokowany, kręciołek, aria-busy; drugie stuknięcie nie uruchamia akcji drugi raz;
//     P2 sukces: „✓ Gotowe”/„✓ Done”, potem wraca zwykły napis i przycisk działa;
//     P3 błąd: od razu zwykły napis, NIGDY „✓ Gotowe” (nie udaje), błąd idzie dalej do ekranu;
//     P4 przyciski w grupie: ten sam rozmiar i to samo miejsce przez cały czas pracy (bez drgań, PL i EN);
//     P5 okienko „Na pewno?” (OESTPrzycisk.confirm): dwa przyciski równe, w tym samym miejscu po PL i EN; Anuluj/Esc/Wstecz = „nie”.
//  C  moduly/checkbox (jeden checkbox): każdy checkbox – też dorysowany później – ma wygląd modułu (kwadrat 1,25 em), po zaznaczeniu kolor apki
//     (--accent) i ✓; ekran, który ustawia własny rozmiar, wygrywa (reguły modułu mają zerową wagę).
//  W  „Wyślij” w prawdziwej inspekcji (EFA-INS-014, PROD-025): raport trafia do kolejki, a odpowiedzi, zdjęcie i etap inspekcji
//     zostają – także po ponownym otwarciu (pole komentarza w PPM jest schowane); przycisk Wyślij i sąsiedni ⚙ nie skaczą w trakcie (pomiar w każdej klatce).
// Znane skoki (moduł przycisku rośnie w trakcie pracy) są w quality/baselines/moduly-zasady.json: test daje FAIL przy nowym skoku
// i przy skoku, który zniknął, a dalej jest na liście. Pozostałe zasady bez wyjątków.
// Nie mierzy czasu (zasada 08/11/2026): czeka na stan (kolejka, napis przycisku), klatki tylko zlicza.
// Uruchomienie: OEST_PLAYWRIGHT_PATH=… OEST_BROWSER_PATH=… node app/tests/moduly-zasady-ui-check.cjs  (po npm run copy-web)
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const { chromium } = require(process.env.OEST_PLAYWRIGHT_PATH || 'playwright');
const root = path.resolve(__dirname, '../www');
const JPG = fs.readFileSync(path.join(__dirname, 'dane/zdjecie-1.jpg'));
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.docx': 'application/octet-stream' };
const server = http.createServer((req, res) => {
  const p = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(p, (e, b) => { if (e) { res.writeHead(404).end(); return; } res.setHeader('Content-Type', TYPES[path.extname(p)] || 'application/octet-stream'); res.end(b); });
});
const fails = [], R = {};
const check = (ok, msg) => { if (!ok) fails.push(msg); };
// skoki rozmiaru/miejsca: porównanie z listą znanych odstępstw (quality/baselines/moduly-zasady.json) – lista może tylko maleć
const BASELINE = path.resolve(__dirname, '../../quality/baselines/moduly-zasady.json');
const znalezione = new Map(); // id → opisy
const skok = (ok, id, msg) => { if (!ok) { if (!znalezione.has(id)) znalezione.set(id, []); znalezione.get(id).push(msg); } };
const ID = 'EFA-INS-014';

// ---------- w przeglądarce: pomiar położenia elementów w każdej klatce ----------
function startKlatki(sels) {
  const out = sels.map(() => []); let on = true;
  // środek elementu w układzie strony (wciśnięcie scale .97 z modułu przycisku go nie przesuwa) + rozmiar bez transformacji
  const krok = () => { if (!on) return; sels.forEach((s, i) => { const e = document.querySelector(s); if (e && e.offsetParent) { const r = e.getBoundingClientRect(); out[i].push([r.x + r.width / 2, r.y + r.height / 2 + scrollY, e.offsetWidth, e.offsetHeight].map(v => Math.round(v * 10) / 10)); } }); requestAnimationFrame(krok); };
  krok();
  window.__klatki = { stop: () => { on = false; return out; } };
}
const zakres = l => l.length ? [0, 1, 2, 3].map(k => Math.max(...l.map(r => r[k])) - Math.min(...l.map(r => r[k]))) : null;
const queueLen = () => new Promise(res => { const rq = indexedDB.open('inspekcje', 1); rq.onsuccess = () => { try { const g = rq.result.transaction('queue').objectStore('queue').getAll(); g.onsuccess = () => res(g.result.length); g.onerror = () => res(-1); } catch (e) { res(-1); } }; rq.onerror = () => res(-1); });
const stanInspekcji = () => ({
  odp: [...document.querySelectorAll('#ck .ck-row')].map(r => (r.querySelector('.seg button.on') || {}).dataset ? r.querySelector('.seg button.on').dataset.s : '-').join(''),
  zdjecia: Number((document.getElementById('photoCount') || {}).textContent || 0),
  etap: (JSON.parse(localStorage.getItem('oest.ppm.stage') || '{}')['EFA-INS-014'] || {}).s || 'brak'
});

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const B = 'http://127.0.0.1:' + server.address().port; let browser;
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.OEST_BROWSER_PATH ? { executablePath: process.env.OEST_BROWSER_PATH } : {}) });
    for (const lang of ['pl', 'en']) {
      const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, serviceWorkers: 'block' }), errors = [];
      await ctx.addInitScript(l => {
        if (!localStorage.getItem('oest.account')) {
          localStorage.setItem('oest.account', JSON.stringify({ provider: 'local', id: 't', email: 'demo@example.com', first: 'Greg', last: 'Sarna' }));
          localStorage.setItem('insp.cfg', JSON.stringify({ insp: 'G. Sarna', email: 'demo@example.com' }));
          localStorage.setItem('oest.lang', l);
        }
      }, lang);
      await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
      const pg = await ctx.newPage(); pg.on('pageerror', e => errors.push(e.message));
      const otworz = async () => { await pg.goto(B + '/inspekcje/index.html#ppm=' + ID); await pg.waitForFunction(() => window.OESTPrzycisk && document.querySelector('#ck .ck-row') && document.getElementById('toQueue').offsetParent); await pg.waitForLoadState('networkidle'); };
      await otworz();
      const L = lang.toUpperCase();

      // ================= P: moduly/przycisk =================
      // dwa przyciski w grupie (siatka 1fr 1fr jak okienka i paski apki), style ekranu inspekcji; stuknięcia prawdziwą myszą Playwrighta
      await pg.evaluate(() => {
        const box = document.createElement('div'); box.id = 'zBox';
        box.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:10px;width:380px;margin:8px';
        box.innerHTML = '<button type="button" class="go" id="zA">' + OESTT('Wyślij', 'Send') + '</button><button type="button" class="btn" id="zB">' + OESTT('Podgląd', 'Preview') + '</button>';
        document.getElementById('sendHint').after(box); box.scrollIntoView({ block: 'center' });
        const a = document.getElementById('zA');
        window.__z = { calls: 0, done: null, seen: [], err: null };
        a.addEventListener('click', () => { window.__z.calls++; OESTPrzycisk.run(a, () => new Promise((ok, no) => { window.__z.done = ok; window.__z.fail = no; }), { busy: OESTT('Wysyłam', 'Sending') }).catch(e => { window.__z.err = e.message; }); });
        new MutationObserver(() => window.__z.seen.push(a.textContent)).observe(a, { childList: true, subtree: true, characterData: true });
      });
      await pg.waitForTimeout(0);
      // miejsce w układzie strony: środek (wciśnięcie scale .97 z modułu go nie przesuwa) + rozmiar bez transformacji
      const box2 = () => pg.evaluate(() => ['zA', 'zB'].map(id => { const e = document.getElementById(id), r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2 + scrollY, e.offsetWidth, e.offsetHeight].map(v => Math.round(v * 10) / 10); }));
      const stanA = () => pg.evaluate(() => { const a = document.getElementById('zA'); return { text: a.textContent.trim(), disabled: a.disabled, aria: a.getAttribute('aria-busy'), busy: a.classList.contains('oest-busy'), spin: !!a.querySelector('.oest-spin') }; });
      const P = { start: await box2(), klatki: [] };
      await pg.click('#zA'); await pg.waitForFunction(() => document.getElementById('zA').classList.contains('oest-busy'));
      P.busy = await stanA(); P.klatki.push(await box2());
      await pg.mouse.click(...(await pg.evaluate(() => { const r = document.getElementById('zA').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }))); // drugie stuknięcie w trakcie
      P.calls = await pg.evaluate(() => window.__z.calls); P.klatki.push(await box2());
      await pg.evaluate(() => window.__z.done());
      await pg.waitForFunction(() => /✓/.test(document.getElementById('zA').textContent));
      P.done = (await stanA()).text; P.klatki.push(await box2());
      await pg.waitForFunction(() => !document.getElementById('zA').classList.contains('oest-busy')); // koniec „✓ Gotowe” (stan, nie zegar)
      P.after = await stanA(); P.klatki.push(await box2());
      // P3: błąd – napis wraca od razu, bez „✓”, błąd dociera do ekranu
      await pg.evaluate(() => { window.__z.seen = []; window.__z.err = null; });
      await pg.click('#zA'); await pg.waitForFunction(() => document.getElementById('zA').classList.contains('oest-busy')); P.klatki.push(await box2());
      await pg.evaluate(() => window.__z.fail(Error('GMAIL_TEST')));
      await pg.waitForFunction(() => window.__z.err);
      P.fail = Object.assign(await stanA(), await pg.evaluate(() => ({ err: window.__z.err, seen: window.__z.seen }))); P.klatki.push(await box2());
      await pg.evaluate(() => document.getElementById('zBox').remove());
      R['przycisk-' + lang] = P;
      check(P.busy.disabled && P.busy.aria === 'true' && P.busy.spin, `${L} P1: przycisk w trakcie pracy nie jest zablokowany albo bez kręciołka (${JSON.stringify(P.busy)})`);
      check(P.calls === 1, `${L} P1: drugie stuknięcie w trakcie uruchomiło akcję ponownie (${P.calls}×)`);
      check(/^✓\s*(Gotowe|Done)$/.test(P.done.trim()), `${L} P2: po sukcesie nie ma „✓ Gotowe”: „${P.done}”`);
      check(P.after.text === (lang === 'pl' ? 'Wyślij' : 'Send') && !P.after.disabled && P.after.aria === null && !P.after.spin, `${L} P2: po „✓ Gotowe” przycisk nie wrócił (${JSON.stringify(P.after)})`);
      check(P.fail.err === 'GMAIL_TEST', `${L} P3: błąd akcji nie doszedł do ekranu (${P.fail.err})`);
      check(P.fail.text === (lang === 'pl' ? 'Wyślij' : 'Send') && !P.fail.disabled && !P.fail.busy, `${L} P3: po błędzie przycisk nie wrócił do zwykłego napisu (${JSON.stringify(P.fail)})`);
      check(!P.fail.seen.some(t => /✓/.test(t)), `${L} P3: przy błędzie przycisk pokazał „✓” (udaje sukces): ${JSON.stringify(P.fail.seen)}`);
      const ETAPY = ['w trakcie', 'drugie stuknięcie', '✓ Gotowe', 'po powrocie', 'w trakcie (2)', 'po błędzie'];
      P.klatki.forEach((kl, n) => kl.forEach((r, i) => {
        const d = r.map((v, j) => Math.abs(v - P.start[i][j]));
        skok(d.every(x => x <= 0.5), 'przycisk-w-grupie|zmiana-rozmiaru', `${L} P4: ${i ? 'sąsiedni przycisk' : 'przycisk akcji'} zmienił miejsce/rozmiar (${ETAPY[n]}): [środek x, środek y, szer., wys.] ${JSON.stringify(P.start[i])} → ${JSON.stringify(r)}`);
      }));
      check(Math.abs(P.start[0][2] - P.start[1][2]) <= 0.5 && Math.abs(P.start[0][3] - P.start[1][3]) <= 0.5, `${L} P4: przyciski w grupie różnej wielkości: ${JSON.stringify(P.start)}`);

      // P5: okienko „Na pewno?”
      const okno = async how => {
        const p = pg.evaluate(() => { window.__ans = 'czeka'; OESTPrzycisk.confirm(OESTT('Usunąć zdjęcie?', 'Delete photo?')).then(v => { window.__ans = v; }); });
        await p; await pg.waitForSelector('.oest-ask [data-a="ok"]');
        await pg.evaluate(() => Promise.all(document.getAnimations().filter(a => a.effect && a.effect.target && a.effect.target.closest && a.effect.target.closest('.oest-ask')).map(a => a.finished.catch(() => {})))); // okienko rośnie z miejsca stuknięcia – pomiar po końcu
        const m = await pg.$$eval('.oest-ask .row button', bs => bs.map(b => { const r = b.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2, b.offsetWidth, b.offsetHeight].map(v => Math.round(v * 10) / 10).concat(b.textContent); }));
        if (how === 'esc') await pg.keyboard.press('Escape');
        else if (how === 'wstecz') await pg.evaluate(() => history.back());
        else await pg.click('.oest-ask [data-a="' + how + '"]');
        await pg.waitForFunction(() => window.__ans !== 'czeka' && !document.querySelector('.oest-ask'));
        return { m, ans: await pg.evaluate(() => window.__ans) };
      };
      const o1 = await okno('no'), o2 = await okno('esc'), o3 = await okno('wstecz'), o4 = await okno('ok');
      R['okienko-' + lang] = { przyciski: o1.m, odp: [o1.ans, o2.ans, o3.ans, o4.ans] };
      check(o1.m.length === 2 && Math.abs(o1.m[0][2] - o1.m[1][2]) <= 0.5 && Math.abs(o1.m[0][3] - o1.m[1][3]) <= 0.5 && Math.abs(o1.m[0][1] - o1.m[1][1]) <= 0.5, `${L} P5: przyciski okienka [środek x, y, szer., wys.] „Na pewno?” nie są równe: ${JSON.stringify(o1.m)}`);
      check(o1.ans === false && o2.ans === false && o3.ans === false && o4.ans === true, `${L} P5: Anuluj/Esc/Wstecz/Usuń dały ${JSON.stringify([o1.ans, o2.ans, o3.ans, o4.ans])} zamiast [false,false,false,true]`);
      check(await pg.evaluate(id => location.hash === '#ppm=' + id, ID), `${L} P5: Wstecz przy okienku opuścił inspekcję (${await pg.evaluate(() => location.hash)})`);
      R['okienkoPozycja-' + lang] = o1.m.map(x => x.slice(0, 4));

      // ================= C: moduly/checkbox =================
      const C = await pg.evaluate(async () => {
        const tick = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        const box = document.createElement('div'); box.style.cssText = 'font-size:16px;margin:8px';
        box.innerHTML = '<style>.wlasny-cb{width:30px;height:30px}</style><label><input type="checkbox" id="zC1"> a</label> <label><input type="checkbox" id="zC2" class="wlasny-cb"> b</label>';
        document.getElementById('sendHint').after(box); await tick(); // dorysowany po wczytaniu strony
        const c1 = document.getElementById('zC1'), c2 = document.getElementById('zC2'), cs = e => getComputedStyle(e), before = e => getComputedStyle(e, '::before');
        const r = e => { const b = e.getBoundingClientRect(); return [Math.round(b.width * 10) / 10, Math.round(b.height * 10) / 10]; }, em = e => Math.round(parseFloat(getComputedStyle(e).fontSize) * 1.25 * 10) / 10;
        const acc = document.createElement('i'); acc.style.color = 'var(--accent,#7c84ff)'; document.body.appendChild(acc); const accent = cs(acc).color; acc.remove();
        const out = { em: em(c1), przed: { app: cs(c1).appearance, size: r(c1), tlo: cs(c1).backgroundColor, ptaszek: before(c1).clipPath } };
        c1.click(); await new Promise(res => c1.addEventListener('animationend', res, { once: true })); await tick();
        out.po = { checked: c1.checked, size: r(c1), tlo: cs(c1).backgroundColor, ptaszek: before(c1).clipPath, accent };
        out.wlasny = r(c2); box.remove(); return out;
      });
      R['checkbox-' + lang] = C;
      check(C.przed.app === 'none' && C.przed.size.every(v => Math.abs(v - C.em) <= 0.2), `${L} C: checkbox dorysowany później nie ma wyglądu modułu (${JSON.stringify(C.przed)})`);
      check(C.po.checked && C.po.tlo === C.po.accent && C.po.size.every(v => Math.abs(v - C.em) <= 0.2), `${L} C: zaznaczony checkbox bez koloru apki albo zmienił rozmiar (${JSON.stringify(C.po)})`);
      check(/inset\(0(px)? 100%/.test(C.przed.ptaszek) && /inset\(0(px)?\)|inset\(0(px)? 0(px)? 0(px)? 0(px)?\)/.test(C.po.ptaszek), `${L} C: ✓ nie chowa się / nie pokazuje (${C.przed.ptaszek} → ${C.po.ptaszek})`);
      check(C.wlasny.join() === '30,30', `${L} C: rozmiar ustawiony przez ekran nie wygrał z modułem (${C.wlasny})`);

      // ================= W: „Wyślij” w prawdziwej inspekcji =================
      await pg.click('#ck .ck-row:nth-child(2) [data-s="fail"]');
      await pg.setInputFiles('#galIn', { name: 'a.jpg', mimeType: 'image/jpeg', buffer: JPG });
      await pg.waitForFunction(() => Number(document.getElementById('photoCount').textContent) === 1 && !document.getElementById('toQueue').disabled);
      const przed = await pg.evaluate(stanInspekcji), q0 = await pg.evaluate(queueLen);
      await pg.locator('#toQueue').scrollIntoViewIfNeeded();
      const napis0 = await pg.locator('#toQueue').textContent();
      await pg.evaluate(startKlatki, ['#toQueue', '#sendCfg']);
      await pg.click('#toQueue');
      await pg.waitForFunction(n => new Promise(res => { const rq = indexedDB.open('inspekcje', 1); rq.onsuccess = () => { const g = rq.result.transaction('queue').objectStore('queue').getAll(); g.onsuccess = () => res(g.result.length > n); }; }), q0, { timeout: 60000, polling: 100 });
      await pg.waitForFunction(t => { const b = document.getElementById('toQueue'); return !b.classList.contains('oest-busy') && b.textContent === t; }, napis0, { timeout: 30000 }).catch(() => {});
      const klatki = await pg.evaluate(() => window.__klatki.stop());
      const po = await pg.evaluate(stanInspekcji), napis1 = await pg.locator('#toQueue').textContent();
      await otworz(); await pg.waitForFunction(() => Number(document.getElementById('photoCount').textContent) >= 1).catch(() => {});
      const poOtwarciu = await pg.evaluate(stanInspekcji), q1 = await pg.evaluate(queueLen);
      R['wyslij-' + lang] = { przed, po, poOtwarciu, kolejka: [q0, q1], napis: [napis0, napis1], klatki: klatki.map(l => l.length), zakres: klatki.map(zakres) };
      check(q1 === q0 + 1, `${L} W: Wyślij nie dodało raportu do kolejki (${q0} → ${q1})`);
      check(przed.odp.includes('fail') || /f/.test(przed.odp), `${L} W: test nie ustawił odpowiedzi NIE (${przed.odp})`);
      for (const [n, s] of [['po Wyślij', po], ['po ponownym otwarciu', poOtwarciu]]) {
        check(s.odp === przed.odp, `${L} W: ${n} zmieniły się odpowiedzi: ${przed.odp} → ${s.odp}`);
        check(s.zdjecia === przed.zdjecia, `${L} W: ${n} zniknęło zdjęcie: ${przed.zdjecia} → ${s.zdjecia}`);
        check(s.etap !== 'brak' && s.etap !== '', `${L} W: ${n} inspekcja straciła etap (${s.etap})`);
      }
      check(napis1 === napis0, `${L} W: po Wyślij przycisk ma inny napis: „${napis0}” → „${napis1}”`);
      ['Wyślij', '⚙ obok Wyślij'].forEach((nazwa, i) => {
        const z = zakres(klatki[i]);
        check(klatki[i].length > 2, `${L} W: brak pomiaru klatek dla ${nazwa}`);
        if (z) skok(z.every(v => v <= 0.5), 'wyslij-w-inspekcji|zmiana-rozmiaru', `${L} W: ${nazwa} skacze w trakcie wysyłki (zmiana środka x/y, szer., wys. o ${JSON.stringify(z)} px w ${klatki[i].length} klatkach)`);
      });
      check(!errors.length, `${L}: błędy JS: ` + errors.join(' | '));
      await ctx.close();
    }
    // P5: to samo miejsce przycisków okienka po PL i EN (zmiana języka nic nie przesuwa)
    const pl = R['okienkoPozycja-pl'], en = R['okienkoPozycja-en'];
    check(pl && en && pl.every((r, i) => r.every((v, j) => Math.abs(v - en[i][j]) <= 0.5)), `P5: przyciski okienka „Na pewno?” w innym miejscu po PL i EN: ${JSON.stringify(pl)} vs ${JSON.stringify(en)}`);
    // znane odstępstwa: dokładnie te – nic nowego i nic naprawionego bez usunięcia wpisu
    const known = new Set(JSON.parse(fs.readFileSync(BASELINE, 'utf8')).entries.map(e => e.id));
    for (const [id, opisy] of znalezione) if (!known.has(id)) fails.push(...opisy);
      else R['znane: ' + id] = opisy;
    for (const id of known) if (!znalezione.has(id)) fails.push(id + ': już nie występuje – usuń wpis z quality/baselines/moduly-zasady.json (lista może tylko maleć)');
  } catch (e) { fails.push('wyjątek: ' + (e && e.stack || e)); }
  finally { if (browser) await browser.close(); server.close(); }
  console.log('POMIARY ' + JSON.stringify(R));
  if (fails.length) { console.log('MODULY ZASADY UI FAIL (' + fails.length + '):\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log('MODULY ZASADY UI PASS (przycisk: blokada, ✓ tylko po sukcesie, skoki tylko znane z listy; okienko: równe przyciski, Wstecz = nie; checkbox: wygląd modułu, kolor apki, ekran wygrywa; Wyślij w EFA-INS-014: raport w kolejce, inspekcja bez zmian; PL i EN)');
})();
