#!/usr/bin/env node
/* Sprawdzenie języka (Grzegorz 03/11/2026): każdy tekst widoczny w apce ma parę PL + EN.
 * Szuka polskich tekstów (litery ąćęłńóśźż) bez angielskiej pary:
 *  - JS: napis z polskimi literami jest OK tylko jako pierwszy argument L(…)/T(…)/OESTT(…) z drugim argumentem
 *    albo jako pierwszy element pary ['pl', 'en'].
 *  - HTML: tekst / placeholder / title / aria-label z polskimi literami wymaga data-en / data-en-placeholder / …
 *  - Wyjątek: komentarz „i18n-ok” w tej samej linii (np. wzorce rozpoznawania mowy, nie tekst na ekranie).
 * Uruchamiane przy budowie (npm run copy-web) – nowy tekst bez tłumaczenia zatrzymuje budowę.
 * Użycie: node scripts/check-lang.js [--list]  */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const PLD = /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/;
// polskie słowa bez ogonków (np. „W kolejce: ”, „Brak sieci”) – też muszą mieć parę
const PLW = /(^|[\s>(„"])(nie|Nie|brak|Brak|jest|oraz|lub|przez|dla|czy|Czy|Dane|kolejce|Zapisz|Anuluj|Zamknij|Dalej|Wstecz|Tak|Ponów|sieci|zdjecie|Wyczysc|Otworz|Dodaj|Pokaz|Ustawienia|Wersja|wersja|Gotowe|Sprawdz|teraz|albo|Wybierz|Zmien|Zaloguj|Wyloguj|Kolejka|Kopia|Pobierz|Szukaj|Wpisz|Inne|inne|Dzien|Godzina|Opis|Notatka|Notatki|Uwagi|Typ|Nowy|Nowa|Nowe|Nazwa|Lista|Klucze|Klucz|Budynek|Pomin|Raport|raport|Zadanie|Usterka|Lokalizacja|Pietro|Urzadzenie|Stan|Data|Zrob|Zrobione|Gotowy|Odrzuc|Wstaw|Popraw|Nagraj|Edytuj|Powtorz|Zapisano|Zapisane|Otwórz|Szablon|szablon|pusta|pusty|puste|kolejka|Online|Lokalizacja|Podpis|Checklista|Komentarz|Usterki|Temperatury|Formularz|Tydzien|Zdjecia|Zdjec)(?=[\s.,:;!?…)<”"]|$)|(^|\s)(w|z|i|na|ze|od|po|ze)\s/;
const PL = { test: v => PLD.test(v) || (/[a-z]/.test(v) && (!/^[\w.-]+$/.test(v) || /^[A-Z]/.test(v)) && PLW.test(v)) };
const FN = new Set(['L', 'T', 'OESTT', 'hint', 'notice', 'setStatus', 'setBanner']);
const DIRS = ['app/www', 'moduly', 'inspekcje'];
// app/www/teksty.js jest generowany z app/teksty/*.json; parę PL/EN każdego tekstu sprawdza app/scripts/teksty.js przy budowie (09/11/2026)
const SKIP = /^app\/www\/inspekcje\/|(^|\/)(lib|templates|node_modules)\/|\.min\.js$|questions-proposals\.json$|^app\/www\/teksty\.js$|Code\.gs|sw\.js$/;

function files() {
  const out = [];
  function walk(d) {
    for (const f of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) {
      const p = d + '/' + f.name;
      if (SKIP.test(p)) continue;
      if (f.isDirectory()) walk(p); else if (/\.(js|html)$/.test(f.name)) out.push(p);
    }
  }
  DIRS.forEach(walk);
  return out;
}

// prosty lekser JS: zwraca tokeny {t:'str'|'id'|'p', v, line, start, end}
function lex(src, base) {
  const toks = [];
  let i = 0, line = base || 1;
  const n = src.length;
  const regexOk = () => { const p = toks[toks.length - 1]; return !p || (p.t === 'p' && !/[)\]}]/.test(p.v)) || (p.t === 'id' && /^(return|typeof|case|in|of|new|delete|void|throw|else)$/.test(p.v)); };
  function str(q) {
    const s = i, l = line; let v = ''; i++;
    while (i < n && src[i] !== q) {
      if (src[i] === '\\') { v += src[i] + src[i + 1]; i += 2; continue; }
      if (q === '`' && src[i] === '$' && src[i + 1] === '{') { // ${…} – pomijamy wyrażenie, ale liczymy linie
        let d = 1; i += 2; v += '${';
        while (i < n && d) { const c = src[i]; if (c === '{') d++; else if (c === '}') d--; else if (c === '\n') line++; if (c === "'" || c === '"' || c === '`') { const inner = str(c); v += inner.v; continue; } if (d) v += c; i++; }
        v += '}'; continue;
      }
      if (src[i] === '\n') line++;
      v += src[i++];
    }
    i++;
    return { t: 'str', v, line: l, start: s, end: i };
  }
  while (i < n) {
    const c = src[i];
    if (c === '\n') { line++; i++; continue; }
    if (/\s/.test(c)) { i++; continue; }
    if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') { const e = src.indexOf('*/', i + 2); const chunk = src.slice(i, e < 0 ? n : e + 2); line += (chunk.match(/\n/g) || []).length; i = e < 0 ? n : e + 2; continue; }
    if (c === "'" || c === '"' || c === '`') { toks.push(str(c)); continue; }
    if (c === '/' && regexOk()) { // wyrażenie regularne
      const s = i; i++; let cls = false;
      while (i < n && src[i] !== '\n') { const d = src[i]; if (d === '\\') { i += 2; continue; } if (d === '[') cls = true; else if (d === ']') cls = false; else if (d === '/' && !cls) break; i++; }
      i++; while (/[a-z]/.test(src[i] || '')) i++;
      toks.push({ t: 're', v: src.slice(s, i), line, start: s, end: i }); continue;
    }
    if (/[A-Za-z_$]/.test(c)) { const s = i; while (/[\w$]/.test(src[i] || '')) i++; toks.push({ t: 'id', v: src.slice(s, i), line, start: s, end: i }); continue; }
    if (/\d/.test(c)) { while (/[\w.]/.test(src[i] || '')) i++; toks.push({ t: 'num', v: '', line }); continue; }
    toks.push({ t: 'p', v: c, line, start: i, end: i + 1 }); i++;
  }
  return toks;
}

// czy token k (napis PL) jest w parze PL/EN
function paired(T, k) {
  const a = T[k - 1], b = T[k - 2], nx = T[k + 1], nx2 = T[k + 2];
  // L('pl', 'en') / T(…) / OESTT(…) – pierwszy argument, potem przecinek
  if (a && a.v === '(' && b && b.t === 'id' && FN.has(b.v) && nx && nx.v === ',') return true;
  // drugi argument L('pl', 'en') – to tekst angielski (np. „Data” = dane)
  if (a && a.v === ',' && b && b.t === 'str' && T[k - 3] && T[k - 3].v === '(' && T[k - 4] && FN.has(T[k - 4].v)) return true;
  // { pl: 'pl', en: 'en' } – pole pl obok angielskiego
  if (a && a.v === ':' && b && b.v === 'pl') return true;
  // { q: 'pytanie', qen: 'question' }
  if (a && a.v === ':' && b && b.v === 'q' && nx && nx.v === ',' && nx2 && nx2.v === 'qen') return true;
  // ['pl', 'en'] – para w tablicy
  if (a && a.v === '[' && nx && nx.v === ',' && nx2 && nx2.t === 'str' && !PL.test(nx2.v)) return true;
  // 'pl' + x + '…' wewnątrz L(…): sprawdzamy, czy jesteśmy w pierwszym argumencie L/T
  let d = 0, crossed = 0;
  for (let j = k - 1; j >= 0 && j > k - 60; j--) {
    const t = T[j];
    if (t.v === ')' || t.v === ']' || t.v === '}') d++;
    else if (t.v === '(' || t.v === '[' || t.v === '{') {
      if (d) { d--; continue; }
      if (t.v === '(' && T[j - 1] && T[j - 1].t === 'id' && FN.has(T[j - 1].v)) {
        // musi dojść do przecinka na poziomie 0 po k (czyli jest drugi argument)
        let e = crossed;
        for (let m = k + 1; m < T.length && m < k + 80; m++) { const u = T[m]; if (u.v === '(' || u.v === '[' || u.v === '{') e++; else if (u.v === ')' || u.v === ']' || u.v === '}') { if (!e) return false; e--; } else if (u.v === ',' && !e) return true; }
        return false;
      }
      // nawias grupujący ( … ? 'pl' : … ) – idziemy dalej na zewnątrz
      if (t.v === '(' && !(T[j - 1] && (T[j - 1].t === 'id' || T[j - 1].v === ')' || T[j - 1].v === ']'))) { crossed++; continue; }
      if (t.v === '[') { // [ 'pl' + x , 'en' ]
        let e = crossed;
        for (let m = k + 1; m < T.length && m < k + 80; m++) { const u = T[m]; if (u.v === '(' || u.v === '[' || u.v === '{') e++; else if (u.v === ')' || u.v === ']' || u.v === '}') { if (!e) return false; e--; } else if (u.v === ',' && !e) return true; }
        return false;
      }
      return false;
    }
    else if (t.v === ',' && !d) return false;
    else if (t.v === ';' && !d) return false;
  }
  return false;
}

// HTML w napisie JS (np. menu.innerHTML = '<button data-en="…">Tekst</button>'):
// zwraca polskie kawałki BEZ data-en / data-en-attr (reszta jest przetłumaczona przez applyDom)
function htmlUnpaired(v) {
  const bad = [];
  let m;
  const endRe = /<\/[a-zA-Z][\w-]*>([^<]*)/g;
  while ((m = endRe.exec(v))) if (PL.test(m[1])) bad.push(m[1].trim());
  const tagRe = /<([a-zA-Z][\w-]*)([^>]*)>([^<]*)/g;
  while ((m = tagRe.exec(v))) {
    const attrs = m[2], text = m[3];
    if (PL.test(text) && !/\bdata-en=/.test(attrs)) bad.push(text.trim());
    for (const a of ['placeholder', 'title', 'aria-label', 'alt']) {
      const q = (attrs.match(new RegExp('\\s' + a + '=\\\\?"([^"]*)')) || [])[1];
      if (q && PL.test(q) && !new RegExp('data-en-' + a + '=').test(attrs)) bad.push(a + '="' + q + '"');
    }
  }
  return bad;
}

function checkJs(src, file, base, out, lines) {
  const T = lex(src, base);
  T.forEach((t, k) => {
    if (t.t !== 'str' || !PL.test(t.v)) return;
    if (/i18n-ok/.test(lines[t.line - 1] || '')) return;
    if (paired(T, k)) return;
    if (/<[a-zA-Z][\w-]*[\s>]/.test(t.v)) {
      const bad = htmlUnpaired(t.v);
      if (!bad.length) return;
      bad.forEach(b => out.push(file + ':' + t.line + '  ' + b.replace(/\s+/g, ' ').slice(0, 110)));
      return;
    }
    out.push(file + ':' + t.line + '  ' + t.v.replace(/\s+/g, ' ').slice(0, 110));
  });
}

function checkHtml(src, file, out) {
  const lines = src.split('\n');
  // skrypty osobno
  const re = /<script\b[^>]*>([\s\S]*?)<\/script>/gi; let m; let html = src;
  while ((m = re.exec(src))) {
    const before = src.slice(0, m.index + m[0].indexOf('>') + 1);
    checkJs(m[1], file, (before.match(/\n/g) || []).length + 1, out, lines);
    html = html.slice(0, m.index) + m[0].replace(/[^\n]/g, ' ') + html.slice(m.index + m[0].length);
  }
  html = html.replace(/<style\b[\s\S]*?<\/style>/gi, s => s.replace(/[^\n]/g, ' ')).replace(/<!--[\s\S]*?-->/g, s => s.replace(/[^\n]/g, ' '));
  // tekst w elementach: <tag …>tekst  – tag musi mieć data-en
  const endRe = /<\/[a-zA-Z][\w-]*>([^<]*)/g;
  while ((m = endRe.exec(html))) {
    const ln = (html.slice(0, m.index).match(/\n/g) || []).length + 1;
    if (PL.test(m[1]) && !/i18n-ok/.test(lines[ln - 1] || '')) out.push(file + ':' + ln + '  (tekst po znaczniku – owiń w <span data-en>) ' + m[1].trim().slice(0, 90));
  }
  const tagRe = /<([a-zA-Z][\w-]*)([^>]*)>([^<]*)/g;
  while ((m = tagRe.exec(html))) {
    const ln = (html.slice(0, m.index).match(/\n/g) || []).length + 1;
    if (/i18n-ok/.test(lines[ln - 1] || '')) continue;
    const attrs = m[2], text = m[3];
    if (PL.test(text) && !/\bdata-en=/.test(attrs)) out.push(file + ':' + ln + '  <' + m[1] + '> ' + text.trim().slice(0, 100));
    for (const a of ['placeholder', 'title', 'aria-label', 'content']) {
      const v = (attrs.match(new RegExp('\\s' + a + '="([^"]*)"')) || [])[1];
      if (v && PL.test(v) && !new RegExp('data-en-' + a + '=').test(attrs) && !(a === 'content')) out.push(file + ':' + ln + '  ' + a + '="' + v.slice(0, 80) + '"');
    }
  }
}

if (require.main !== module) { module.exports = { lex, paired, PL }; return; }
const out = [];
for (const f of files()) {
  const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
  if (/i18n-ok-file:/.test(src)) continue; // plik bez ekranu – powód w komentarzu
  if (f.endsWith('.html')) checkHtml(src, f, out); else checkJs(src, f, 1, out, src.split('\n'));
}
// drzewko Reactive: każda etykieta (kategoria, akcja, gotowiec) ma angielską wersję
try {
  const RT = require(path.join(ROOT, 'app/www/reactive-tree.js'));
  (function walk(n) { if (!RT.EN[n.label] && (n.children || !n.sentence)) out.push('app/www/reactive-tree.js  brak EN: ' + n.label); (n.children || []).forEach(walk); })(RT.tree);
  RT.actions.concat(RT.presets).forEach(a => { if (!RT.EN[a.label]) out.push('app/www/reactive-tree.js  brak EN: ' + a.label); });
} catch (e) { out.push('app/www/reactive-tree.js  nie da się sprawdzić: ' + e.message); }
if (out.length) {
  if (process.argv.includes('--list')) console.log(out.join('\n'));
  else console.error(out.slice(0, 40).join('\n') + (out.length > 40 ? '\n…' : ''));
  console.error('\nBrak tłumaczenia EN: ' + out.length + ' miejsc. Każdy tekst na ekranie: L(\'pl\', \'en\') / OESTT(…) / [\'pl\', \'en\'] / data-en.');
  process.exit(1);
}
console.log('Język: wszystkie teksty mają parę PL/EN.');
