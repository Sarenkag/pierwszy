#!/usr/bin/env node
// Zbiera wyniki części bramki (quality-results/*.json + stany jobów) w jeden raport PASS/FAIL/SKIPPED/NOT RUN.
// Wynik: Markdown na standardowe wyjście (w CI trafia do podsumowania joba) i kod wyjścia 1, jeśli cokolwiek nie jest PASS.
// Brak pliku wyników danej części = NOT RUN (np. job anulowany lub przerwany przed zapisem).
// Użycie: NEEDS='${{ toJSON(needs) }}' node quality/summarize.cjs quality-results [lista-testów.json]
'use strict';
const fs = require('node:fs'), path = require('node:path');
const dir = path.resolve(process.argv[2] || 'quality-results');
const read = f => { const p = path.join(dir, f); try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } };
let needs = {}; try { needs = JSON.parse(process.env.NEEDS || '{}'); } catch {}
const manifest = JSON.parse(fs.readFileSync(process.argv[3] ? path.resolve(process.argv[3]) : path.join(__dirname, 'required-tests.json'), 'utf8')); // 2. argument: tylko testy samej bramki
const esc = s => String(s || '').replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');
const rows = [], md = [];

// G2 może przyjść w kilku częściach (browser.json albo browser-<grupa>.json z osobnych jobów) – łączę je w jedną;
// test z listy obowiązkowej, którego nie ma w żadnej części, dostaje NOT RUN (żaden nie znika po cichu).
const browserParts = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => /^browser(-.+)?\.json$/.test(f)).sort().map(read).filter(Boolean) : [];
const browser = browserParts.length ? (() => {
  const results = browserParts.flatMap(b => b.results), have = new Set(results.map(r => r.id));
  for (const t of manifest.browser) if (!have.has(t.file)) results.push({ id: t.file, kind: 'browser', status: 'NOT RUN', seconds: 0, detail: 'Brak wyniku tego testu w żadnej części G2 (job nie doszedł do testów albo test nie jest przypisany do żadnej grupy w workflow).' });
  return { results };
})() : null;
const node = read('node.json'), g1 = read('architecture.json'), ratchet = read('ratchet.json'), lang = read('lang.json');
const part = (data, kind) => {
  if (data) for (const r of data.results) rows.push({ gate: kind === 'node' ? 'G0' : 'G2', id: r.id, status: r.status, detail: r.detail || '', seconds: r.seconds, counts: r.counts });
  else for (const t of manifest[kind]) rows.push({ gate: kind === 'node' ? 'G0' : 'G2', id: t.file, status: 'NOT RUN', detail: 'Brak wyników tej części (job nie doszedł do testów).' });
};
rows.push({ gate: 'G0', id: 'PL/EN (scripts/check-lang.js)', status: lang ? lang.status : 'NOT RUN', detail: lang ? lang.detail : 'Brak wyniku kontroli języka.' });
part(node, 'node');
rows.push({ gate: 'G1', id: 'Zależności modułów i kolejność skryptów', status: g1 ? g1.status : 'NOT RUN', detail: g1 ? `naruszeń ${g1.total} (baseline ${g1.baseline}), nowe ${g1.fresh.length}, nieaktualne wpisy ${g1.stale.length}` + (g1.fresh.length ? ': ' + g1.fresh.map(v => v.detail).join('; ') : '') + (g1.stale.length ? ' | do usunięcia z baseline: ' + g1.stale.join('; ') : '') : 'Brak wyniku G1.' });
rows.push({ gate: 'G1', id: 'Ochrona kryteriów (lista testów, baseline)', status: ratchet ? ratchet.status : 'NOT RUN', detail: ratchet ? [...ratchet.errors, ...ratchet.warnings.map(w => 'Ostrzeżenie: ' + w), ...ratchet.notes].join(' | ') : 'Brak wyniku kontroli.' });
part(browser, 'browser');

const count = s => rows.filter(r => r.status === s).length;
const jobsBad = Object.entries(needs).filter(([, v]) => v.result !== 'success');
const ok = rows.every(r => r.status === 'PASS') && !jobsBad.length;
md.push(`## Quality Gate OEST: ${ok ? '✅ PASS' : '❌ FAIL'}`);
md.push(`PASS ${count('PASS')} · FAIL ${count('FAIL')} · SKIPPED ${count('SKIPPED')} · NOT RUN ${count('NOT RUN')} · SHA \`${(process.env.GITHUB_SHA || '').slice(0, 7)}\``);
if (jobsBad.length) md.push('Joby bez sukcesu: ' + jobsBad.map(([k, v]) => `${k} = ${v.result}`).join(', '));
md.push('', '| Bramka | Kontrola | Wynik | Szczegóły |', '|---|---|---|---|');
const order = { FAIL: 0, 'NOT RUN': 1, SKIPPED: 2, PASS: 3 };
for (const r of [...rows].sort((a, b) => order[a.status] - order[b.status] || a.gate.localeCompare(b.gate)))
  md.push(`| ${r.gate} | ${esc(r.id)} | ${r.status === 'PASS' ? '✅' : r.status === 'FAIL' ? '❌' : '⚠️'} ${r.status} | ${esc((r.counts ? `${r.counts.pass}/${r.counts.tests} przypadków. ` : '') + r.detail).slice(0, 900)} |`);
md.push('', 'Tylko PASS jest sukcesem. SKIPPED i NOT RUN blokują (QUALITY.md QG-011).');

// Analiza wpływu zmian (quality/wplyw.cjs). Tryb „tylko-raport”: informacja, NIE wpływa na wynik bramki – wszystkie testy i tak się wykonują.
const wplyw = read('wplyw.json');
md.push('', `### Wybór testów według wpływu zmian – tryb „${wplyw ? wplyw.tryb : 'tylko-raport'}” (nic nie pominięto, nie zmienia wyniku)`);
if (!wplyw) md.push('Brak wyniku analizy wpływu (job G1 nie doszedł do tego kroku).');
else if (wplyw.status !== 'OK') md.push('Analiza wpływu nie powiodła się: ' + esc(wplyw.blad) + ' – przy włączonym wyborze byłaby pełna regresja.');
else {
  md.push(wplyw.pelna ? '**Pełna regresja** – ' + wplyw.powodyPelnej.map(esc).join('; ') : `Baza \`${esc(String(wplyw.base).slice(0, 12))}\`, zmienionych plików: ${wplyw.zmiany.length}.`);
  if (wplyw.zmiany.length) {
    md.push('', '| Zmieniony plik | Klasa | Powód |', '|---|---|---|');
    for (const z of wplyw.zmiany.slice(0, 40)) md.push(`| \`${esc(z.plik)}\` | ${esc(z.klasa)} | ${esc(z.powod)} |`);
    if (wplyw.zmiany.length > 40) md.push(`| … | | jeszcze ${wplyw.zmiany.length - 40} plików |`);
  }
  const br = browser ? browser.results : [], sec = id => (br.find(r => r.id === id) || {}).seconds;
  md.push('', '| Test G2 | Wynik (wykonany) | Przy włączonym wyborze | Powód |', '|---|---|---|---|');
  for (const w of wplyw.wybrane) md.push(`| ${esc(w.test)} | ${(br.find(r => r.id === w.test) || {}).status || 'NOT RUN'} | uruchomiony | ${esc(w.powod).slice(0, 400)} |`);
  for (const w of wplyw.pominiete) md.push(`| ${esc(w.test)} | ${(br.find(r => r.id === w.test) || {}).status || 'NOT RUN'} | POMINIĘTY (wpływ) | ${esc(w.powod).slice(0, 400)} |`);
  const saved = wplyw.pominiete.reduce((a, w) => a + (sec(w.test) || 0), 0);
  md.push('', `Czas testów, które byłyby pominięte: ${Math.round(saved)} s (z ${Math.round(br.reduce((a, r) => a + (r.seconds || 0), 0))} s testów przeglądarkowych).`);
  if (wplyw.inspekcje !== undefined) md.push(`raport-ui-check – inspekcje, których dotyczy zmiana danych: ${wplyw.inspekcje ? wplyw.inspekcje.join(', ') || '(żadna)' : 'wszystkie'} (dziś test i tak sprawdza wszystkie).`);
  // kontrola mapy: pliki faktycznie wczytane przez test (ślad quality/wplyw-slad.cjs) muszą być znane mapie
  const bad = [];
  for (const r of br) if (r.wczytane && wplyw.zaleznosci) { const known = new Set(wplyw.zaleznosci[r.id] || []); const extra = r.wczytane.filter(f => !known.has(f)); if (extra.length) bad.push(`${r.id}: ${extra.join(', ')}`); }
  const traced = br.filter(r => r.wczytane).length;
  md.push(!traced ? 'Kontrola mapy: brak śladu wczytanych plików.' : bad.length ? '⚠️ **Rozbieżność mapy** – test wczytał pliki, których mapa wpływu mu nie przypisuje (przy włączonym wyborze zmiana tych plików mogłaby go pominąć; mapa do poprawki):<br>' + bad.map(esc).join('<br>') : `✅ Kontrola mapy: ${traced} testów – każdy wczytany plik jest w zależnościach testu.`);
  md.push('', 'Kontrola zachowania: każdy test powyżej został faktycznie uruchomiony. Kontrola kodu 1:1 (skrót plików) nie jest włączona – decyzja 4 planu.');
}
const text = md.join('\n');
console.log(text);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, text + '\n');
process.exitCode = ok ? 0 : 1;
