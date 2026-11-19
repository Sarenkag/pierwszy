// Zasady architektury (docs/ZASADY.md) – część G1, wołana przez quality/check-architecture.cjs (jeden sprawdzacz, R25).
// Sprawdza zbudowaną paczkę strony (app/www po `npm run copy-web`), czyli to, co trafia do APK. Reguły:
//   EKRANY  – mapa ekranów moduly/ekrany/ekrany.json (R1): poprawny JSON, każdy ekran raz, rodzic istnieje, z każdego ekranu
//             droga do ekranu głównego bez pętli, „up” zarezerwowane, każda sekcja .view w index.html ma wpis i odwrotnie,
//             strzałka ‹ (data-go) w sekcji prowadzi dokładnie do rodzica z mapy.
//   JM      – jedna rzecz = jedno miejsce (R25, rejestr quality/jedno-miejsce.json): każde trafienie wzoru poza właścicielem;
//             klucz „oest.*” lub baza IndexedDB w więcej niż jednym pliku; Wstecz Androida (backButton) zarejestrowany dokładnie raz
//             i tylko w moduly/wstecz; właściciel z rejestru musi istnieć (JM-4).
//   KOPIA   – ta sama funkcja (min. 40 tokenów, R25/JM-2) w dwóch plikach; dwa identyczne pliki (JM-3).
//   ZNACZNIK – klikalny element (button, a, role=button) bez dokładnie jednego znacznika data-nav / data-okno / data-akcja,
//             stare znaczniki data-go, data-href, data-open, data-hnews, data-rx, data-key-action, data-pt-action, data-qq (R26).
// Identyfikator naruszenia nie ma numerów linii ani liczby trafień (np. JM|historia|keys.js); liczba trafień jest w polu „liczba”.
// Na liście zastanych wpis ma „maks” = dzisiejsza liczba: więcej trafień → FAIL, mniej → FAIL z prośbą o obniżenie „maks”
// (lista może tylko maleć; check-ratchet.cjs blokuje podniesienie „maks”).
'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');

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
// komentarze HTML i skrypty: z HTML bierzemy znaczniki (bez <!-- -->) i treść skryptów wpisanych w stronę
function zHtml(html) {
  const bez = html.replace(/<!--[\s\S]*?-->/g, ' ');
  const skrypty = [...bez.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]).join('\n;\n');
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
    const sekcje = [...index.replace(/<!--[\s\S]*?-->/g, ' ').matchAll(/<section\b[^>]*\bid="(v-[\w-]+)"[^>]*>/g)].map(m => m[1]);
    const pudelka = new Set([...ids.values()].map(e => e.pudelko));
    for (const s of sekcje) if (!pudelka.has(s)) add('EKRANY|sekcja-bez-wpisu|' + s, 'EKRANY', `index.html: sekcja #${s} nie ma wpisu w ekrany.json.`);
    for (const p of pudelka) if (!sekcje.includes(p)) add('EKRANY|wpis-bez-sekcji|' + p, 'EKRANY', `ekrany.json: pudełko #${p} nie istnieje w index.html.`);
    // strzałka ‹ wpisana w sekcję index.html: data-go = rodzic ekranu tej sekcji (ekran z id równym nazwie sekcji)
    const bez = index.replace(/<!--[\s\S]*?-->/g, ' ');
    const starty = [...bez.matchAll(/<section\b[^>]*\bid="(v-[\w-]+)"/g)];
    starty.forEach((m, i) => {
      const kawalek = bez.slice(m.index, i + 1 < starty.length ? starty[i + 1].index : bez.length);
      const e = [...ids.values()].find(x => x.pudelko === m[1] && !x.id.includes('/'));
      for (const b of kawalek.matchAll(/<button\b[^>]*\bclass="[^"]*\bback\b[^"]*"[^>]*>/g)) {
        const go = (b[0].match(/\bdata-go="([^"]*)"/) || [])[1];
        if (e && go !== undefined && go !== e.rodzic) add(`EKRANY|strzalka|${m[1]}|${go}`, 'EKRANY', `index.html #${m[1]}: strzałka ‹ prowadzi do „${go}”, a rodzic ${e.id} w ekrany.json to „${e.rodzic}”.`);
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
  // Wstecz Androida: dokładnie jedna rejestracja, w moduly/wstecz/wstecz.js, wołająca wstecz()
  // ciało całego callbacka (od „{” do pasującej „}”), nie do pierwszego średnika
  const bb = [...kod].flatMap(([f, c]) => [...c.matchAll(/addListener\(\s*["']backButton["']\s*,/g)].map(m => {
    const i = c.indexOf('{', m.index), j = i < 0 ? -1 : klamra(c, i);
    return { f, cb: j < 0 ? c.slice(m.index, m.index + 200) : c.slice(i, j + 1) };
  }));
  const ok = bb.length === 1 && bb[0].f === 'moduly/wstecz/wstecz.js' && /\bwstecz\(\)/.test(bb[0].cb);
  if (!ok) add('JM|backButton|' + (bb.map(x => x.f).join('+') || 'brak'), 'JM', `Wstecz Androida (backButton) ma być zarejestrowany dokładnie raz, w moduly/wstecz/wstecz.js, i wołać wstecz(); jest: ${bb.length ? bb.map(x => x.f).join(', ') : 'brak'}.`);

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
    add(`KOPIA|funkcja|${h.slice(0, 10)}|${plikiF.sort().join('+')}`, 'KOPIA', `Ta sama funkcja w ${plikiF.length} plikach: ${opis.join(', ')}.`, { punkt: 'R25', usuwa: 'P7/P8' });
  }
  const tresci = new Map();
  for (const f of all) { const h = crypto.createHash('sha1').update(src.get(f)).digest('hex'); if (!tresci.has(h)) tresci.set(h, []); tresci.get(h).push(f); }
  for (const lista of tresci.values()) if (lista.length > 1) add(`KOPIA|plik|${lista.join('+')}`, 'KOPIA', `Identyczne pliki: ${lista.join(', ')}.`, { punkt: 'R25', usuwa: 'P8' });

  // ---------- ZNACZNIK: klikalne elementy (R26) ----------
  for (const [f, c] of kod) {
    let brak = 0;
    for (const m of c.matchAll(/<(button|a)\b[^>]*>|<[a-z]+\b[^>]*\brole=\\?["']button\\?["'][^>]*>/gi)) {
      const tag = m[0];
      if (/^<a\b/i.test(tag) && !/\bhref\s*=/.test(tag)) continue; // <a> bez href to nie link
      const n = ZNACZNIKI.filter(z => new RegExp('\\b' + z + '\\s*=').test(tag)).length;
      if (n !== 1) brak++;
    }
    if (brak) add(`ZNACZNIK|brak|${f}`, 'ZNACZNIK', `${f}: ${brak} klikalnych elementów bez dokładnie jednego znacznika ${ZNACZNIKI.join('/')}.`, { punkt: 'R26/D12', usuwa: 'N1–N3', liczba: brak });
    for (const s of STARE) { const n = (c.match(new RegExp('\\b' + s + '\\b(?!-)', 'g')) || []).length; if (n) add(`ZNACZNIK|stary|${f}|${s}`, 'ZNACZNIK', `${f}: stary znacznik ${s} ${n}×.`, { punkt: 'R26/D12', usuwa: 'N1–N3', liczba: n }); }
  }
  return [...v.values()].sort((a, b) => a.id.localeCompare(b.id));
}

// funkcje z kodu: „function nazwa(…) {…}” i „nazwa = function(…) {…}” oraz „nazwa(…) {…}” w obiektach;
// treść porównywana po tokenach (bez spacji i komentarzy), nazwa funkcji nie wchodzi do porównania
function funkcjeZ(c) {
  const out = [];
  const re = /\bfunction\b\s*([\w$]*)\s*\(/g;
  let m;
  while ((m = re.exec(c))) {
    const start = c.indexOf('{', m.index); if (start < 0) break;
    const end = klamra(c, start); if (end < 0) continue;
    let nazwa = m[1];
    if (!nazwa) { const przed = c.slice(Math.max(0, m.index - 60), m.index).match(/([\w$]+)\s*[:=]\s*$/); nazwa = przed ? przed[1] : '(anonimowa)'; }
    const ciało = c.slice(c.indexOf('(', m.index), end + 1);
    const tokeny = ciało.match(/[\w$]+|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|[^\s\w$]/g) || [];
    out.push({ nazwa, tokeny: tokeny.length, hash: crypto.createHash('sha1').update(tokeny.join(' ')).digest('hex') });
  }
  return out;
}
function klamra(c, i) {
  let d = 0;
  for (let k = i; k < c.length; k++) {
    const ch = c[k];
    if (ch === '"' || ch === "'" || ch === '`') { k++; while (k < c.length && c[k] !== ch) k += c[k] === '\\' ? 2 : 1; continue; }
    if (ch === '{') d++; else if (ch === '}' && --d === 0) return k;
  }
  return -1;
}

module.exports = { analyse, bezKomentarzy, MIN_TOKENOW };
