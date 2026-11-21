// Zasady architektury (docs/ZASADY.md) – część G1, wołana przez quality/check-architecture.cjs (jeden sprawdzacz, R25).
// Sprawdza zbudowaną paczkę strony (app/www po `npm run copy-web`), czyli to, co trafia do APK. Reguły:
//   EKRANY  – mapa ekranów moduly/ekrany/ekrany.json (R1): poprawny JSON, każdy ekran raz, rodzic istnieje, z każdego ekranu
//             droga do ekranu głównego bez pętli, „up” zarezerwowane, każda sekcja .view w index.html ma wpis i odwrotnie,
//             strzałka ‹ (data-go) w sekcji prowadzi dokładnie do rodzica z mapy.
//   JM      – jedna rzecz = jedno miejsce (R25, rejestr quality/jedno-miejsce.json): każde trafienie wzoru poza właścicielem;
//             klucz „oest.*” lub baza IndexedDB w więcej niż jednym pliku; Wstecz Androida tylko w szkielecie Ionic (moduly/szkielet);
//             właściciel z rejestru musi istnieć (JM-4).
//   KOPIA   – ta sama funkcja (min. 40 tokenów, R25/JM-2) w dwóch plikach; dwa identyczne pliki (JM-3).
//   ZNACZNIK – klikalny element (button, a, role=button) bez dokładnie jednego znacznika data-nav / data-okno / data-akcja,
//             stare znaczniki data-go, data-href, data-open, data-hnews, data-rx, data-key-action, data-pt-action, data-qq (R26).
//   LOGIKA  – nazwane funkcje w <script> stron index.html i inspekcje/index.html (R27): logika tylko w modułach; liczba może tylko maleć.
//   IONIC   – apka stoi na Ionic + Vue (decyzja Grzegorza 21/11/2026, moduly/szkielet): każdy ekran z ekrany.json bez komponentu Vue
//             i strona inspekcji to „Poza Ionic/Vue” (lista zastanych quality/baselines/ionic.json, tylko maleje – licznik do zera);
//             tak samo wspólne moduły rysujące własny interfejs (moduly/*: innerHTML, createElement);
//             w ekranach Vue i ramie: tylko komponenty Ionic (bez własnych przycisków, pól, list, nawigacji, style=, <style>, klas
//             spoza Ionic), w CSS szkieletu tylko reguły ustawiające zmienne motywu; wszystko inne tylko z pliku quality/wyjatki-ionic.json,
//             gdzie każdy wpis ma powód i id pisemnego „tak” Grzegorza (cmsg_…). Przewijanie (overscroll-behavior, overflow auto/scroll)
//             ustawia tylko rama – w pozostałych plikach liczba trafień może tylko maleć.
// Identyfikator naruszenia nie ma numerów linii ani liczby trafień (np. JM|historia|keys.js); liczba trafień jest w polu „liczba”.
// Na liście zastanych wpis ma „maks” = dzisiejsza liczba: więcej trafień → FAIL, mniej → FAIL z prośbą o obniżenie „maks”
// (lista może tylko maleć; check-ratchet.cjs blokuje podniesienie „maks”).
'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { kodWykonywalny } = require('./kod.cjs');

// Skrypty, które apka wstrzykuje do stron Vantify (działają na vantify.com, nie w apce) i pliki danych (wzory raportów, biblioteki).
const OBCA_STRONA = new Set(['vantify-sync.js', 'vantify-rejestr.js', 'vantify-akcje.js']);
const DANE = f => /(^|\/)lib\//.test(f) || /\.min\.js$/.test(f) || /(^|\/)tpl-[^/]*\.js$/.test(f) || f === 'teksty.js' || f === 'wersja.js';
const STRONY = ['index.html', 'inspekcje/index.html'];
const ZNACZNIKI = ['data-nav', 'data-okno', 'data-akcja'];
const STARE = ['data-go', 'data-href', 'data-open', 'data-hnews', 'data-rx', 'data-key-action', 'data-pt-action', 'data-qq'];
const MIN_TOKENOW = 40; // JM-2: próg ustalony w P0-1 (19/11/2026); wolno go tylko obniżyć (ostrzej)

// Usuwa komentarze, zostawia napisy (reguły szukają też w tekstach, np. selektor „.top .back”, znacznik w HTML z JS).
function bezKomentarzy(src) {
  let out = '', i = 0, prev = '';
  const regexOk = () => !prev || /[(,=:[!&|?{};+\-*%<>~^]/.test(prev);
  while (i < src.length) {
    const c = src[i], n = src[i + 1];
    if (c === '/' && n === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '/' && n === '*') { const e = src.indexOf('*/', i + 2); i = e < 0 ? src.length : e + 2; out += ' '; continue; }
    if (c === '"' || c === "'" || c === '`') {
      const s = i; i++;
      while (i < src.length && src[i] !== c && (c === '`' || src[i] !== '\n')) i += src[i] === '\\' ? 2 : 1;
      i++; out += src.slice(s, i); prev = c; continue;
    }
    if (c === '/' && regexOk()) { const s = i; i++; let cls = false; while (i < src.length && src[i] !== '\n' && (src[i] !== '/' || cls)) { if (src[i] === '\\') i++; else if (src[i] === '[') cls = true; else if (src[i] === ']') cls = false; i++; } i++; while (/[a-z]/.test(src[i] || '')) i++; out += src.slice(s, i); prev = '/'; continue; }
    out += c; if (!/\s/.test(c)) prev = c; i++;
  }
  return out;
}
// treść skryptów wpisanych w stronę (bez <script src>)
function skryptyStrony(html) {
  return [...html.replace(/<!--[\s\S]*?-->/g, ' ').matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]).join('\n;\n');
}
// komentarze HTML i skrypty: z HTML bierzemy znaczniki (bez <!-- -->) i treść skryptów wpisanych w stronę
function zHtml(html) {
  const bez = html.replace(/<!--[\s\S]*?-->/g, ' ');
  const skrypty = skryptyStrony(bez);
  const znaczniki = bez.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ');
  return { kod: bezKomentarzy(skrypty), znaczniki };
}

function pliki(www) {
  const out = [];
  const walk = d => { for (const e of fs.readdirSync(path.join(www, d), { withFileTypes: true })) { const r = d ? d + '/' + e.name : e.name; if (e.isDirectory()) { if (e.name !== 'node_modules') walk(r); } else if (/\.(js|html)$/.test(e.name)) out.push(r); } };
  walk('');
  return out.sort();
}

function analyse(www, opts) {
  const v = new Map(), add = (id, rule, detail, extra) => { if (!v.has(id)) v.set(id, { id, rule, detail, ...extra }); };
  const all = pliki(www);
  const src = new Map(), kod = new Map();
  for (const f of all) {
    const raw = fs.readFileSync(path.join(www, f), 'utf8'); src.set(f, raw);
    if (OBCA_STRONA.has(f) || DANE(f)) continue;
    if (f.endsWith('.html')) { const h = zHtml(raw); kod.set(f, h.kod + '\n' + h.znaczniki); } else kod.set(f, bezKomentarzy(raw));
  }

  // ---------- EKRANY (R1) ----------
  const mapaPlik = path.join(www, 'moduly/ekrany/ekrany.json');
  let mapa = null;
  if (!fs.existsSync(mapaPlik)) add('EKRANY|brak-pliku', 'EKRANY', 'Brak moduly/ekrany/ekrany.json (jedna mapa ekranów, R1).');
  else { try { mapa = JSON.parse(fs.readFileSync(mapaPlik, 'utf8')); } catch (e) { add('EKRANY|zly-json', 'EKRANY', 'moduly/ekrany/ekrany.json to nie poprawny JSON: ' + e.message); } }
  if (fs.existsSync(mapaPlik) && mapa !== null && (typeof mapa !== 'object' || Array.isArray(mapa) || !Array.isArray(mapa.ekrany)))
    { add('EKRANY|zly-ksztalt', 'EKRANY', 'ekrany.json: oczekiwany obiekt z listą „ekrany”.'); mapa = null; }
  else if (fs.existsSync(mapaPlik) && mapa === null && !v.has('EKRANY|zly-json')) add('EKRANY|zly-ksztalt', 'EKRANY', 'ekrany.json: oczekiwany obiekt z listą „ekrany”, jest null.');
  if (mapa) {
    const ekr = mapa.ekrany;
    if (!ekr.length) add('EKRANY|pusta-mapa', 'EKRANY', 'ekrany.json: brak listy „ekrany”.');
    const ids = new Map(), nazwy = new Set();
    for (const e of ekr) {
      if (!e || typeof e.id !== 'string' || !e.id) { add('EKRANY|wpis-bez-id', 'EKRANY', 'ekrany.json: wpis bez id: ' + JSON.stringify(e)); continue; }
      for (const n of [e.id, ...(e.aliasy || [])]) {
        if (n === 'up' || n.split('/').includes('up')) add('EKRANY|up|' + n, 'EKRANY', `ekrany.json: „up” jest zarezerwowane dla strzałki ‹ (${n}).`);
        if (nazwy.has(n)) add('EKRANY|dwa-razy|' + n, 'EKRANY', `ekrany.json: ${n} zapisany więcej niż raz.`);
        nazwy.add(n);
      }
      ids.set(e.id, e);
      for (const k of ['rodzic', 'pudelko', 'pl', 'en']) if (!(k in e)) add(`EKRANY|brak-pola|${e.id}|${k}`, 'EKRANY', `ekrany.json: ${e.id} bez pola „${k}”.`);
    }
    for (const e of ids.values()) {
      if (e.rodzic !== null && !ids.has(e.rodzic)) add(`EKRANY|zly-rodzic|${e.id}|${e.rodzic}`, 'EKRANY', `ekrany.json: rodzic „${e.rodzic}” ekranu ${e.id} nie istnieje.`);
      const byl = new Set([e.id]); let x = e;
      while (x && x.rodzic !== null && ids.has(x.rodzic)) { if (byl.has(x.rodzic)) { add('EKRANY|petla|' + e.id, 'EKRANY', `ekrany.json: z ${e.id} Wstecz krąży w pętli (${[...byl].join(' → ')}).`); break; } byl.add(x.rodzic); x = ids.get(x.rodzic); }
      if (x && x.rodzic === null && !['home', 'start'].includes(x.id)) add('EKRANY|bez-domu|' + e.id, 'EKRANY', `ekrany.json: z ${e.id} Wstecz nie dochodzi do ekranu głównego (kończy na ${x.id}).`);
    }
    if (!ids.has('home')) add('EKRANY|brak-home', 'EKRANY', 'ekrany.json: brak ekranu głównego „home”.');
    const index = src.get('index.html') || '';
    const sekcje = [...index.replace(/<!--[\s\S]*?-->/g, ' ').matchAll(/<section\b[^>]*\bid=["'](v-[\w-]+)["'][^>]*>/g)].map(m => m[1]);
    const pudelka = new Set([...ids.values()].map(e => e.pudelko));
    for (const s of new Set(sekcje.filter((x, i) => sekcje.indexOf(x) !== i))) add('EKRANY|sekcja-podwojna|' + s, 'EKRANY', `index.html: sekcja #${s} występuje ${sekcje.filter(x => x === s).length}× (apka pokazałaby je naraz).`);
    for (const s of sekcje) if (!pudelka.has(s)) add('EKRANY|sekcja-bez-wpisu|' + s, 'EKRANY', `index.html: sekcja #${s} nie ma wpisu w ekrany.json.`);
    for (const p of pudelka) if (!sekcje.includes(p)) add('EKRANY|wpis-bez-sekcji|' + p, 'EKRANY', `ekrany.json: pudełko #${p} nie istnieje w index.html.`);
    // strzałka ‹ wpisana w sekcję index.html: data-go = rodzic ekranu tej sekcji (ekran z id równym nazwie sekcji)
    const bez = index.replace(/<!--[\s\S]*?-->/g, ' ');
    const starty = [...bez.matchAll(/<section\b[^>]*\bid=["'](v-[\w-]+)["']/g)];
    starty.forEach((m, i) => {
      const kawalek = bez.slice(m.index, i + 1 < starty.length ? starty[i + 1].index : bez.length);
      const e = [...ids.values()].find(x => x.pudelko === m[1] && !x.id.includes('/'));
      for (const b of znaczniki(kawalek)) {
        if (b.nazwa !== 'button' || !/\bclass=["'][^"']*\bback\b/.test(b.tag)) continue;
        const go = (b.tag.match(/\bdata-go=["']([^"']*)["']/) || [])[1];
        const nav = (b.tag.match(/\bdata-nav=["']([^"']*)["']/) || [])[1];
        if (e && go !== undefined && go !== e.rodzic) add(`EKRANY|strzalka|${m[1]}|${go}`, 'EKRANY', `index.html #${m[1]}: strzałka ‹ prowadzi do „${go}”, a rodzic ${e.id} w ekrany.json to „${e.rodzic}”.`);
        // nowy znacznik (R26): strzałka zawsze data-nav="up" – cel bierze się z rodzica w mapie
        if (nav !== undefined && nav !== 'up') add(`EKRANY|strzalka|${m[1]}|${nav}`, 'EKRANY', `index.html #${m[1]}: strzałka ‹ ma data-nav="${nav}", a ma być data-nav="up" (cel = rodzic z ekrany.json).`);
      }
    });
  }

  // ---------- JM: jedna rzecz = jedno miejsce (R25) ----------
  const rejestr = opts.rejestr;
  for (const r of rejestr.rzeczy) {
    for (const w of r.wlasciciele || []) if (!src.has(w)) add(`JM|brak-wlasciciela|${r.rzecz}|${w}`, 'JM', `Rejestr: właściciel „${w}” rzeczy ${r.rzecz} nie istnieje (JM-4).`);
    const wzory = r.wzory.map(s => new RegExp(s, 'g'));
    for (const [f, c] of kod) {
      if ((r.wlasciciele || []).includes(f)) continue;
      const n = wzory.reduce((a, re) => a + (c.match(re) || []).length, 0);
      if (n) add(`JM|${r.rzecz}|${f}`, 'JM', `${f}: ${r.opis} – ${n}× poza właścicielem (${(r.wlasciciele || []).join(', ') || 'zakazane'}).`, { punkt: r.punkt, usuwa: r.usuwa, liczba: n });
    }
  }
  // wzory Word: plik .docx tylko w moduly/wzory (R25, moduł Wzory 21/11/2026) – druga kopia wzoru gdziekolwiek indziej to naruszenie
  const docx = [], szukaj = d => { for (const e of fs.readdirSync(path.join(www, d), { withFileTypes: true })) { const r = d ? d + '/' + e.name : e.name; if (e.isDirectory()) { if (e.name !== 'node_modules') szukaj(r); } else if (/\.docx$/i.test(e.name)) docx.push(r); } };
  szukaj('');
  for (const f of docx) if (!f.startsWith('moduly/wzory/')) add(`JM|wzor-plik|${f}`, 'JM', `${f}: plik wzoru Word poza moduly/wzory (jedno miejsce na wzory).`, { punkt: 'R25', usuwa: 'wzory' });
  // klucze „oest.*” i bazy IndexedDB: każdy w jednym pliku (R8, R9)
  const klucze = new Map(), bazy = new Map();
  for (const [f, c] of kod) {
    for (const m of c.matchAll(/["'`](oest\.[a-z][\w.-]*)["'`]/g)) { const k = m[1].replace(/\.$/, ''); if (!klucze.has(k)) klucze.set(k, new Set()); klucze.get(k).add(f); }
    for (const m of c.matchAll(/indexedDB\.open\(\s*(?:[\w$.]+\s*\|\|\s*)?["'`]([^"'`]+)["'`]/g)) { if (!bazy.has(m[1])) bazy.set(m[1], new Set()); bazy.get(m[1]).add(f); }
  }
  const wlKlucza = rejestr.kluczeWlasciciele || {};
  for (const [k, fs_] of klucze) {
    const w = wlKlucza[k];
    const poza = [...fs_].filter(f => w ? f !== w : true);
    if (w ? poza.length : fs_.size > 1) for (const f of poza) add(`JM|klucz|${k}|${f}`, 'JM', `${f}: klucz ${k} używany także w ${[...fs_].filter(x => x !== f).join(', ') || '—'}${w ? ' (właściciel: ' + w + ')' : ''}.`, { punkt: '#23/#24/D22', usuwa: 'D-1/D-2/D-4' });
  }
  for (const [b, fs_] of bazy) if (fs_.size > 1) for (const f of fs_) add(`JM|baza|${b}|${f}`, 'JM', `${f}: baza ${b} otwierana w ${fs_.size} plikach (${[...fs_].join(', ')}).`, { punkt: 'D4/D21', usuwa: 'D-3/F3' });
  // Wstecz Androida: obsługuje tylko szkielet Ionic (moduly/szkielet, ionBackButton) – nigdzie indziej nasłuchu klawisza Wstecz
  for (const [f, c] of kod) {
    const n = (c.match(/addListener\(\s*["']backButton["']|["'](?:backbutton|ionBackButton)["']/g) || []).length;
    if (n) add('JM|backButton|' + f, 'JM', `${f}: własna obsługa klawisza Wstecz ${n}× – Wstecz Androida obsługuje tylko szkielet Ionic (moduly/szkielet).`);
  }
  if (fs.existsSync(path.join(www, 'moduly/wstecz'))) add('JM|backButton|moduly/wstecz', 'JM', 'moduly/wstecz wróciło – Wstecz Androida obsługuje tylko szkielet Ionic (moduly/szkielet).');
  if (!fs.existsSync(path.join(www, 'moduly/szkielet/lib/szkielet.js'))) add('JM|backButton|brak-szkieletu', 'JM', 'Brak paczki szkieletu moduly/szkielet/lib/szkielet.js (Wstecz, nawigacja, rama).');

  // ---------- KOPIA: ta sama funkcja (JM-2), ten sam plik (JM-3) ----------
  const funkcje = new Map();
  for (const [f, c] of kod) {
    if (f.endsWith('.html')) continue; // skrypty z HTML: tylko przez JM-1 (do P9 zostają w HTML)
    for (const fn of funkcjeZ(c)) { if (fn.tokeny < MIN_TOKENOW) continue; if (!funkcje.has(fn.hash)) funkcje.set(fn.hash, []); funkcje.get(fn.hash).push({ f, nazwa: fn.nazwa }); }
  }
  for (const [h, lista] of funkcje) {
    const plikiF = [...new Set(lista.map(x => x.f))];
    if (plikiF.length < 2) continue;
    const opis = lista.map(x => x.nazwa + '@' + x.f).sort();
    // id = treść (hash bez nazwy) + pliki; nazwy tylko w opisie, więc zmiana nazwy nie tworzy nowego wyjątku
    add(`KOPIA|funkcja|${h.slice(0, 10)}|${plikiF.sort().join('+')}`, 'KOPIA', `Ta sama funkcja w ${plikiF.length} plikach: ${opis.join(', ')}.`, { punkt: 'R25', usuwa: 'P7/P8', liczba: lista.length });
  }
  const tresci = new Map();
  for (const f of all) { const h = crypto.createHash('sha1').update(src.get(f)).digest('hex'); if (!tresci.has(h)) tresci.set(h, []); tresci.get(h).push(f); }
  for (const lista of tresci.values()) if (lista.length > 1) add(`KOPIA|plik|${lista.join('+')}`, 'KOPIA', `Identyczne pliki: ${lista.join(', ')}.`, { punkt: 'R25', usuwa: 'P8' });

  // ---------- ZNACZNIK: klikalne elementy (R26) ----------
  for (const [f, c] of kod) {
    let brak = 0;
    for (const { nazwa, tag } of znaczniki(c)) {
      if (nazwa !== 'button' && nazwa !== 'a' && !ROLA_PRZYCISK.test(tag)) continue;
      if (/^<a\b/i.test(tag) && !/\bhref\s*=/.test(tag)) continue; // <a> bez href to nie link
      const n = ZNACZNIKI.filter(z => new RegExp('\\b' + z + '\\s*=').test(tag)).length;
      if (n !== 1) brak++;
    }
    if (brak) add(`ZNACZNIK|brak|${f}`, 'ZNACZNIK', `${f}: ${brak} klikalnych elementów bez dokładnie jednego znacznika ${ZNACZNIKI.join('/')}.`, { punkt: 'R26/D12', usuwa: 'N1–N3', liczba: brak });
    for (const s of STARE) { const n = (c.match(new RegExp('\\b' + s + '\\b(?!-)', 'g')) || []).length; if (n) add(`ZNACZNIK|stary|${f}|${s}`, 'ZNACZNIK', `${f}: stary znacznik ${s} ${n}×.`, { punkt: 'R26/D12', usuwa: 'N1–N3', liczba: n }); }
  }

  // ---------- LOGIKA (R27): logika tylko w modułach, strona tylko łączy moduły ----------
  // liczy nazwane funkcje w <script> bez src strony; to NIE jest limit długości pliku – nowa funkcja w stronie = FAIL
  for (const f of STRONY) {
    if (!src.has(f)) continue;
    const n = funkcjeStrony(src.get(f));
    if (n) add(`LOGIKA|${f}`, 'LOGIKA', `${f}: ${n} funkcji zapisanych w <script> strony zamiast w module (moduly/ albo plik obok strony).`, { punkt: 'R27', usuwa: 'K01–K16', liczba: n });
  }
  ionic(www, src, add);
  return [...v.values()].sort((a, b) => a.id.localeCompare(b.id));
}

// ---------- IONIC (21/11/2026): ekrany na Ionic + Vue, nic własnego obok ----------
const POLA = new Set(['ion-input', 'ion-select', 'ion-textarea', 'ion-datetime-button', 'ion-toggle', 'ion-checkbox']);
const POLE_INNE = new Set(['ion-radio-group', 'ion-radio', 'ion-picker', 'ion-picker-column', 'ion-picker-column-option', 'ion-segment', 'ion-segment-button', 'ion-range', 'ion-input-otp']);
const IONIC_TAGI = new Set(['template', 'component', 'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'img', 'slot', 'strong', 'b', 'small', 'br']);
function ionic(www, src, add) {
  // repo: www = app/www, źródła szkieletu dwa poziomy wyżej; próbka testowa bramki: wszystko w jednym katalogu
  const ROOT = fs.existsSync(path.resolve(www, '../../moduly/szkielet/src')) ? path.resolve(www, '../..') : www, SZK = path.join(ROOT, 'moduly/szkielet/src');
  const czytaj = f => { try { return fs.readFileSync(f, 'utf8'); } catch (e) { return null; } };
  const plikW = path.join(ROOT, 'quality/wyjatki-ionic.json'), txtW = czytaj(plikW);
  let wyj = [];
  if (txtW) { try { wyj = JSON.parse(txtW).wyjatki || []; } catch (e) { add('IONIC|wyjatki-zly-json', 'IONIC', 'quality/wyjatki-ionic.json to nie poprawny JSON: ' + e.message); } }
  for (const x of wyj) if (!x || !x.co || !(Array.isArray(x.co) ? x.co : [x.co]).length || !String(x.powod || '').trim() || !/^cmsg_[A-Za-z0-9]{20,}$/.test(String(x.zgoda || '')))
    add('IONIC|wyjatek-bez-zgody|' + (x && x.co), 'IONIC', `quality/wyjatki-ionic.json: wyjątek „${x && x.co}” bez powodu albo bez id pisemnego „tak” Grzegorza (cmsg_…).`);
  const wolno = co => wyj.some(x => x && [].concat(x.co).includes(co) && /^cmsg_/.test(String(x.zgoda || '')) && String(x.powod || '').trim());
  // 1. ekrany poza Ionic/Vue (licznik do zera)
  const idx = czytaj(path.join(SZK, 'ekrany/index.js')) || '';
  const m = idx.match(/EKRANY_VUE\s*=\s*\{([^}]*)\}/), vue = new Set(m ? [...m[1].matchAll(/['"]?([\w/:-]+)['"]?\s*:/g)].map(x => x[1]) : []);
  let mapa = null; try { mapa = JSON.parse(fs.readFileSync(path.join(www, 'moduly/ekrany/ekrany.json'), 'utf8')); } catch (e) {}
  const lista = mapa && Array.isArray(mapa.ekrany) ? mapa.ekrany : []; // zły kształt mapy zgłasza reguła EKRANY
  for (const e of lista) if (e && e.id && !vue.has(e.id))
    add('IONIC|ekran|' + e.id, 'IONIC', `Ekran ${e.id} (${e.pl}) jest jeszcze poza Ionic/Vue – przenieść według moduly/szkielet/PRZEPIS.md.`, { punkt: 'Ionic', usuwa: 'przeniesienie ekranu' });
  for (const k of vue) if (!lista.some(e => e && e.id === k)) add('IONIC|vue-bez-ekranu|' + k, 'IONIC', `moduly/szkielet/src/ekrany/index.js: ${k} nie ma wpisu w ekrany.json.`);
  if ((src.get('inspekcje/index.html') || '').includes('OESTEkrany.strona('))
    add('IONIC|strona|inspekcje/index.html', 'IONIC', 'Strona inspekcji jest jeszcze poza ramą Ionic/Vue (tylko Wstecz i okienka ze szkieletu).', { punkt: 'Ionic', usuwa: 'przeniesienie inspekcji' });
  // 2. ekrany Vue i rama: tylko komponenty Ionic
  const vuePliki = [];
  const walk = d => { for (const e of fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }) : []) { const f = path.join(d, e.name); if (e.isDirectory()) walk(f); else vuePliki.push(f); } };
  walk(SZK);
  for (const f of vuePliki) {
    const rel = path.relative(ROOT, f).split(path.sep).join('/'), c = czytaj(f) || '';
    if (f.endsWith('.vue')) {
      const t = (c.match(/<template>([\s\S]*)<\/template>/) || [])[1] || '';
      const bez = t.replace(/<!--[\s\S]*?-->/g, '');
      for (const g of bez.matchAll(/<([a-z][\w-]*)\b([^>]*)>/g)) {
        const tag = g[1], atr = g[2];
        if (!tag.startsWith('ion-') && !IONIC_TAGI.has(tag) && !wolno('element:' + tag)) add(`IONIC|wlasny-element|${rel}|${tag}`, 'IONIC', `${rel}: własny element <${tag}> zamiast komponentu Ionic.`);
        if (/(^|\s):?style\s*=/.test(atr)) add(`IONIC|style|${rel}`, 'IONIC', `${rel}: atrybut style= (wygląd tylko z Ionic i zmiennych motywu).`);
        const kl = (atr.match(/(?:^|\s)class\s*=\s*"([^"]*)"/) || [])[1];
        for (const k of (kl || '').split(/\s+/).filter(Boolean)) if (!k.startsWith('ion-') && !wolno('klasa:' + k)) add(`IONIC|wlasna-klasa|${rel}|${k}`, 'IONIC', `${rel}: własna klasa „${k}” (dozwolone klasy Ionic ion-* albo wyjątek z „tak” Grzegorza).`);
      }
      // pola formularza (Grzegorz 21/11: „4 listy, każda inna”): jeden sposób na każdy rodzaj pola, zawsze w ion-item (ten sam wygląd).
      // Wybór z listy = ion-select (bez dodatkowego przycisku „Wybierz z listy”), data/godzina = ion-datetime-button + ion-datetime w ion-modal.
      const stos = [];
      for (const g of bez.matchAll(/<(\/?)([a-z][\w-]*)\b([^>]*?)(\/?)>/g)) {
        const zamk = g[1] === '/', tag = g[2], sam = g[4] === '/' || /^(img|br|input)$/.test(tag);
        if (zamk) { const i = stos.lastIndexOf(tag); if (i >= 0) stos.length = i; continue; }
        if (POLE_INNE.has(tag) && !wolno('element:' + tag)) add(`IONIC|pole-inne|${rel}|${tag}`, 'IONIC', `${rel}: <${tag}> – wybór z listy tylko przez ion-select, data przez ion-datetime-button (jeden sposób w całej apce).`);
        if (POLA.has(tag) && !stos.includes('ion-item')) add(`IONIC|pole-poza-item|${rel}|${tag}`, 'IONIC', `${rel}: <${tag}> poza ion-item – każde pole w ion-item, żeby wszystkie wyglądały tak samo.`);
        if (tag === 'ion-datetime' && !stos.includes('ion-modal')) add(`IONIC|data-poza-modal|${rel}`, 'IONIC', `${rel}: <ion-datetime> poza ion-modal – data tylko przez ion-datetime-button (ten sam wygląd co inne pola).`);
        if (!sam) stos.push(tag);
      }
      if (/<style\b/.test(c)) add(`IONIC|style|${rel}`, 'IONIC', `${rel}: blok <style> w ekranie (wygląd tylko z Ionic i zmiennych motywu).`);
    }
    if (f.endsWith('.css')) {
      const css = c.replace(/\/\*[\s\S]*?\*\//g, '');
      for (const r of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        const sel = r[1].trim().replace(/\s+/g, ' '), cialo = r[2];
        const tylkoZmienne = cialo.split(';').map(x => x.trim()).filter(Boolean).every(x => x.startsWith('--')); // zmienne motywu (Ionic: --ion-*, --background…)
        if (!tylkoZmienne && !wolno('css:' + sel)) add(`IONIC|css|${rel}|${sel}`, 'IONIC', `${rel}: własna reguła CSS „${sel}” (w szkielecie tylko zmienne motywu w :root; reszta tylko z wyjątkiem z „tak” Grzegorza).`);
      }
    }
  }
  // 2b. wspólne moduły, które same rysują interfejs (HTML z kodu) – do zastąpienia komponentami Ionic (licznik do zera)
  for (const d of fs.existsSync(path.join(ROOT, 'moduly')) ? fs.readdirSync(path.join(ROOT, 'moduly'), { withFileTypes: true }) : []) {
    if (!d.isDirectory() || d.name === 'szkielet') continue;
    const js = fs.readdirSync(path.join(ROOT, 'moduly', d.name)).filter(f => f.endsWith('.js'));
    if (js.some(f => /\binnerHTML\s*[+]?=|insertAdjacentHTML\s*\(|createElement\s*\(/.test(czytaj(path.join(ROOT, 'moduly', d.name, f)) || '')))
      add('IONIC|modul-ui|' + d.name, 'IONIC', `moduly/${d.name} rysuje własny interfejs (HTML z kodu) – do zastąpienia komponentami Ionic.`, { punkt: 'Ionic', usuwa: 'przeniesienie ekranów' });
  }
  // 3. przewijanie ustawia tylko rama (jedno ustawienie dla całej apki – Grzegorz 21/11/2026)
  const css = [];
  const walkW = d => { for (const e of fs.readdirSync(path.join(www, d), { withFileTypes: true })) { const r = d ? d + '/' + e.name : e.name; if (e.isDirectory()) { if (e.name !== 'node_modules') walkW(r); } else if (/\.(css|js|html)$/.test(e.name)) css.push(r); } };
  walkW('');
  for (const f of css) {
    if (OBCA_STRONA.has(f) || DANE(f)) continue;
    const c = fs.readFileSync(path.join(www, f), 'utf8');
    const n = (c.match(/overscroll-behavior|overflow(?:-[xy])?\s*:\s*(?:auto|scroll)/g) || []).length;
    if (n) add('IONIC|przewijanie|' + f, 'IONIC', `${f}: własne ustawienie przewijania (overscroll-behavior / overflow auto|scroll) ${n}× – przewijanie ustawia tylko rama (moduly/szkielet).`, { punkt: 'Ionic', usuwa: 'przeniesienie ekranu', liczba: n });
  }
}

// R27: nazwane funkcje w skryptach wpisanych w stronę – „function nazwa(”, „nazwa = function”, „nazwa = (…) =>”, „nazwa = x =>”;
// komentarze i treść napisów się nie liczą
function funkcjeStrony(html) {
  const kod = kodWykonywalny(skryptyStrony(html)); // bez komentarzy, treści napisów i RegExp; z szablonów zostaje kod ${…}
  // jedna funkcja = jedna pozycja: „var p = function p()” liczy się raz (pozycja słowa function)
  const poz = new Set();
  for (const m of kod.matchAll(/\bfunction\s*\*?\s*[A-Za-z_$][\w$]*\s*\(/g)) poz.add(m.index);
  const fn = /function\b/y, krotka = /[A-Za-z_$][\w$]*\s*=>/y, strzalka = /\s*=>/y;
  for (const m of kod.matchAll(/\b[A-Za-z_$][\w$]*\s*=(?![=>])\s*(?:async\s+)?/g)) {
    const i = m.index + m[0].length;
    fn.lastIndex = krotka.lastIndex = i;
    if (fn.test(kod) || krotka.test(kod)) { poz.add(i); continue; }
    if (kod[i] !== '(') continue;
    let g = 0, j = i;                       // parametry z zagnieżdżonymi nawiasami: „(x = Number(1)) =>”
    for (; j < kod.length; j++) { if (kod[j] === '(') g++; else if (kod[j] === ')' && --g === 0) break; }
    strzalka.lastIndex = j + 1;
    if (j < kod.length && strzalka.test(kod)) poz.add(i);
  }
  return poz.size;
}

// funkcje z kodu: „function nazwa(…) {…}”, „nazwa = function(…) {…}”, strzałkowe „(…) => {…}” / „x => {…}”
// i metody „nazwa(…) {…}” w obiektach i klasach; treść porównywana po tokenach (bez spacji i komentarzy),
// nazwa funkcji nie wchodzi do porównania
const NIE_METODA = new Set(['if', 'for', 'while', 'switch', 'catch', 'function', 'return', 'with', 'do', 'else', 'try', 'new', 'typeof', 'await', 'yield', 'super']);
function funkcjeZ(c) {
  const out = [], start0 = new Set();
  const dodaj = (od, nazwa) => {
    const start = c.indexOf('{', od); if (start < 0) return;
    if (start0.has(start)) return; start0.add(start);
    const end = klamra(c, start); if (end < 0) return;
    const ciało = c.slice(od, end + 1);
    const tokeny = ciało.match(/[\w$]+|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|[^\s\w$]/g) || [];
    out.push({ nazwa, tokeny: tokeny.length, hash: crypto.createHash('sha1').update(tokeny.join(' ')).digest('hex') });
  };
  const przedNazwa = i => { const p = c.slice(Math.max(0, i - 60), i).match(/([\w$]+)\s*[:=]\s*(?:async\s*)?$/); return p ? p[1] : '(anonimowa)'; };
  let m;
  // function / function nazwa – od nawiasu z parametrami
  const re = /\bfunction\b\s*\*?\s*([\w$]*)\s*\(/g;
  while ((m = re.exec(c))) dodaj(c.indexOf('(', m.index), m[1] || przedNazwa(m.index));
  // strzałkowe z klamrą: (a, b) => { … }  albo  a => { … }
  const ra = /(\([^()]*\)|[\w$]+)\s*=>\s*\{/g;
  while ((m = ra.exec(c))) dodaj(m.index, przedNazwa(m.index));
  // metody: nazwa(…) { … } (obiekt, klasa); słowa kluczowe pomijane
  const rm = /(^|[,{;}\s])(?:async\s+|static\s+|get\s+|set\s+)*([\w$]+)\s*\(([^()]*)\)\s*\{/g;
  while ((m = rm.exec(c))) {
    const nazwa = m[2]; if (NIE_METODA.has(nazwa)) continue;
    const at = m.index + m[1].length, przed = c.slice(Math.max(0, at - 12), at);
    if (/\bfunction\s*\*?\s*$/.test(przed) || /[\w$.]\s*$/.test(c.slice(Math.max(0, at - 1), at))) continue; // wywołanie albo już policzona function
    dodaj(c.indexOf('(', at), nazwa);
  }
  return out;
}
// znaczniki HTML (także w napisach JS): od „<nazwa” do zamykającego „>”, z pominięciem „>” w wartości atrybutu
// (="…", ='…', bez „<” w środku) i w ${…} szablonu JS; jeden przebieg w przód, bez cofania
// role=button w każdej poprawnej postaci: spacje wokół „=”, w cudzysłowach, apostrofach (także \" w napisach JS) albo bez nich
const ROLA_PRZYCISK = /\brole\s*=\s*\\?["']?button(?![\w-])/i;
function znaczniki(c) {
  const out = [], re = /<([a-z][\w-]*)\b/gi;
  let m;
  while ((m = re.exec(c))) {
    let k = re.lastIndex;
    while (k < c.length && c[k] !== '>') {
      if (c[k] === '=') {
        let j = k + 1; while (c[j] === ' ' || c[j] === '\t' || c[j] === '\n' || c[j] === '\r') j++;
        const q = c[j];
        if (q === '"' || q === "'") { const e = c.indexOf(q, j + 1), lt = c.indexOf('<', j + 1); if (e > 0 && (lt < 0 || lt > e)) { k = e + 1; continue; } }
      } else if (c[k] === '$' && c[k + 1] === '{') { const e = c.indexOf('}', k); if (e > 0) { k = e + 1; continue; } }
      k++;
    }
    const nazwa = m[1].toLowerCase(), tag = c.slice(m.index, k + 1);
    out.push({ nazwa, tag });
    if (nazwa === 'button' || nazwa === 'a' || ROLA_PRZYCISK.test(tag)) re.lastIndex = k + 1;
  }
  return out;
}
// pasująca „}” do „{” na pozycji i; pomija napisy, komentarze i literały RegExp (z klasami znaków i ucieczkami)
function klamra(c, i) {
  let d = 0;
  for (let k = i; k < c.length; k++) {
    const ch = c[k];
    if (ch === '"' || ch === "'" || ch === '`') { k++; while (k < c.length && c[k] !== ch) k += c[k] === '\\' ? 2 : 1; continue; }
    if (ch === '/' && c[k + 1] === '/') { const e = c.indexOf('\n', k); if (e < 0) return -1; k = e; continue; }
    if (ch === '/' && c[k + 1] === '*') { const e = c.indexOf('*/', k + 2); if (e < 0) return -1; k = e + 1; continue; }
    if (ch === '/' && poczatekRegExp(c, k)) {
      let w = false; k++;
      while (k < c.length && c[k] !== '\n' && (w || c[k] !== '/')) { if (c[k] === '\\') k++; else if (c[k] === '[') w = true; else if (c[k] === ']') w = false; k++; }
      continue;
    }
    if (ch === '{') d++; else if (ch === '}' && --d === 0) return k;
  }
  return -1;
}
// „/” zaczyna RegExp, gdy przed nim (pomijając spacje) jest operator, nawias otwierający, przecinek albo słowo return/typeof/case
function poczatekRegExp(c, k) {
  let j = k - 1; while (j >= 0 && /\s/.test(c[j])) j--;
  if (j < 0) return true;
  if ('(,=:[!&|?{};+-*%<>~^'.includes(c[j])) return true;
  const slowo = c.slice(Math.max(0, j - 10), j + 1).match(/([\w$]+)$/);
  return !!slowo && ['return', 'typeof', 'case', 'in', 'of', 'void', 'delete', 'throw'].includes(slowo[1]);
}

module.exports = { analyse, bezKomentarzy, funkcjeStrony, MIN_TOKENOW };
