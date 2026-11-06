#!/usr/bin/env node
// Zbiera wyniki części bramki (quality-results/*.json + stany jobów) w jeden raport PASS/FAIL/SKIPPED/NOT RUN.
// Wynik: Markdown na standardowe wyjście (w CI trafia do podsumowania joba) i kod wyjścia 1, jeśli cokolwiek nie jest PASS.
// Brak pliku wyników danej części = NOT RUN (np. job anulowany lub przerwany przed zapisem).
// Użycie: NEEDS='${{ toJSON(needs) }}' node quality/summarize.cjs quality-results
'use strict';
const fs = require('node:fs'), path = require('node:path');
const dir = path.resolve(process.argv[2] || 'quality-results');
const read = f => { const p = path.join(dir, f); try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } };
let needs = {}; try { needs = JSON.parse(process.env.NEEDS || '{}'); } catch {}
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'required-tests.json'), 'utf8'));
const esc = s => String(s || '').replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');
const rows = [], md = [];

const node = read('node.json'), browser = read('browser.json'), g1 = read('architecture.json'), ratchet = read('ratchet.json'), lang = read('lang.json');
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
const text = md.join('\n');
console.log(text);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, text + '\n');
process.exitCode = ok ? 0 : 1;
