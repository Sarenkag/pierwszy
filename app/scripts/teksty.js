#!/usr/bin/env node
/* Teksty ekranów w plikach danych (Grzegorz 09/11/2026): app/teksty/<ekran>.json → app/www/teksty.js.
 * Pliki JSON edytuje się bez dotykania kodu (później także z panelu w przeglądarce). Kod ekranu pyta o tekst
 * przez OESTTx('<ekran>.<id>', { n: 3 }) – moduł moduly/bledy wybiera PL albo EN i wstawia {n}.
 * Budowa (npm run copy-web) zatrzymuje się, gdy plik jest błędny: brak PL/EN, powtórzone id, różne {wstawki} w PL i EN,
 * znaczniki HTML albo spacje na brzegach. Sprawdza to też app/tests/teksty.test.cjs. */
'use strict';
const fs = require('fs');
const path = require('path');
const DIR = path.join(__dirname, '..', 'teksty');
const OUT = path.join(__dirname, '..', 'www', 'teksty.js');
const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const wstawki = s => (s.match(/\{\w+\}/g) || []).sort().join(',');

function wczytaj(dir = DIR) {
  const pliki = {}, bledy = [];
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort()) {
    const ekran = f.slice(0, -5), gdzie = 'app/teksty/' + f;
    if (!ID.test(ekran)) bledy.push(gdzie + ': nazwa pliku tylko małe litery, cyfry i myślniki');
    let d;
    try { d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch (e) { bledy.push(gdzie + ': to nie jest poprawny JSON (' + e.message + ')'); continue; }
    if (!d || !Array.isArray(d.teksty)) { bledy.push(gdzie + ': brak listy "teksty"'); continue; }
    const ids = new Set();
    d.teksty.forEach((e, i) => {
      const w = gdzie + ' #' + (i + 1) + (e && e.id ? ' (' + e.id + ')' : '');
      if (!e || typeof e.id !== 'string' || !ID.test(e.id)) return bledy.push(w + ': id tylko małe litery, cyfry i myślniki');
      if (ids.has(e.id)) bledy.push(w + ': id powtórzone');
      ids.add(e.id);
      for (const j of ['pl', 'en']) {
        const v = e[j];
        if (typeof v !== 'string' || !v.trim()) { bledy.push(w + ': brak tekstu ' + j.toUpperCase()); continue; }
        if (v !== v.trim()) bledy.push(w + ': spacja na początku lub końcu tekstu ' + j.toUpperCase());
        if (/[<>]/.test(v)) bledy.push(w + ': znaczniki HTML (< >) w tekście ' + j.toUpperCase());
      }
      if (typeof e.pl === 'string' && typeof e.en === 'string' && wstawki(e.pl) !== wstawki(e.en)) bledy.push(w + ': różne wstawki {…} w PL i EN');
    });
    pliki[ekran] = d.teksty;
  }
  return { pliki, bledy };
}

function slownik(pliki) {
  const out = {};
  for (const [ekran, lista] of Object.entries(pliki)) for (const e of lista) out[ekran + '.' + e.id] = { pl: e.pl, en: e.en };
  return out;
}

function zbuduj() {
  const { pliki, bledy } = wczytaj();
  if (bledy.length) throw new Error('Błędne pliki tekstów:\n' + bledy.join('\n'));
  fs.writeFileSync(OUT, '/* Wygenerowane z app/teksty/*.json przez app/scripts/teksty.js – nie edytuj ręcznie. */\n' +
    'OESTBledy.zaladujTeksty(' + JSON.stringify(slownik(pliki)) + ');\n');
  return Object.keys(slownik(pliki)).length;
}

module.exports = { wczytaj, slownik, zbuduj, wstawki, DIR };
if (require.main === module) console.log('teksty → www/teksty.js: ' + zbuduj());
