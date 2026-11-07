#!/usr/bin/env node
// Ochrona kryteriów (QUALITY.md QG-014, REL-012): PR nie może po cichu osłabić bramki.
// Porównuje stan PR z gałęzią bazową (domyślnie origin/main) i daje FAIL, gdy:
//   - z quality/required-tests.json zniknął obowiązkowy test, jego passMarker/scenarios albo wydłużono timeoutSec,
//   - dodano wyjątek do allowedSkips,
//   - przybyło wpisów w quality/baselines/*.json (baseline może tylko maleć),
//   - usunięto lub przeniesiono plik testu w app/tests/,
//   - mapa wpływu (quality/wplyw.json) zawęża zakres testów albo zmienia tryb „tylko-raport”.
// Zmiany w plikach testów, workflow, quality/ i dokumentach kontraktu są wypisywane jako ostrzeżenie do przeglądu właściciela
// (skrypt nie umie ocenić, czy zmiana asercji osłabia test – to luka opisana w raporcie).
// Zwiększenie listy wyjątków jest możliwe tylko świadomą decyzją właściciela (scalenie z pominięciem ochrony gałęzi).
// Użycie: node quality/check-ratchet.cjs [--base origin/main] [--json out.json]
'use strict';
const fs = require('node:fs'), path = require('node:path'), { execFileSync } = require('node:child_process');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = path.resolve(arg('--root', path.resolve(__dirname, '..'))); // --root: tylko do testów samej bramki
const BASE = arg('--base', 'origin/main'), JSON_OUT = arg('--json', '');
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const atBase = f => { try { return git('show', `${BASE}:${f}`); } catch { return null; } };
const errors = [], warnings = [], notes = [];

try { git('rev-parse', '--verify', BASE + '^{commit}'); } catch { console.error(`Ratchet NOT RUN: brak gałęzi bazowej ${BASE} (pobierz ją: git fetch origin main).`); process.exit(2); }

// 1. lista obowiązkowych testów
const baseManifestTxt = atBase('quality/required-tests.json');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'quality', 'required-tests.json'), 'utf8'));
if (!baseManifestTxt) notes.push('Na gałęzi bazowej nie ma jeszcze quality/required-tests.json – pierwsze wprowadzenie bramki, brak porównania listy.');
else {
  const base = JSON.parse(baseManifestTxt);
  for (const kind of ['node', 'browser']) {
    const now = new Map((manifest[kind] || []).map(t => [t.file, t]));
    for (const b of base[kind] || []) {
      const n = now.get(b.file);
      if (!n) { errors.push(`Usunięto obowiązkowy test z listy: ${b.file}`); continue; }
      if (b.passMarker && n.passMarker !== b.passMarker) errors.push(`Zmieniono potwierdzenie PASS testu ${b.file}: „${b.passMarker}” → „${n.passMarker || ''}”`);
      if (b.scenarios && n.scenarios !== b.scenarios) errors.push(`Usunięto kontrolę scenariuszy testu ${b.file} (${b.scenarios})`);
      if ((n.timeoutSec || 0) > (b.timeoutSec || 0)) errors.push(`Wydłużono limit czasu ${b.file}: ${b.timeoutSec}s → ${n.timeoutSec}s`);
    }
  }
  const baseSkips = new Set((base.allowedSkips || []).map(s => s.id));
  for (const s of manifest.allowedSkips || []) if (!baseSkips.has(s.id)) errors.push(`Dodano wyjątek allowedSkips: ${s.id}`);
}

// 2. baseline – tylko maleje
const baseDir = path.join(ROOT, 'quality', 'baselines');
for (const f of fs.existsSync(baseDir) ? fs.readdirSync(baseDir).filter(f => f.endsWith('.json')) : []) {
  const rel = 'quality/baselines/' + f, b = atBase(rel);
  const now = JSON.parse(fs.readFileSync(path.join(baseDir, f), 'utf8')).entries.map(e => e.id);
  if (!b) { notes.push(`${rel}: nowy plik baseline (${now.length} wpisów) – pierwsze wprowadzenie, wymaga akceptacji właściciela w tym PR.`); continue; }
  const was = new Set(JSON.parse(b).entries.map(e => e.id));
  const added = now.filter(id => !was.has(id)), removed = [...was].filter(id => !now.includes(id));
  for (const id of added) errors.push(`${rel}: nowy wyjątek ${id} (baseline może tylko maleć)`);
  if (removed.length) notes.push(`${rel}: usunięto ${removed.length} wpisów – baseline maleje (dobrze).`);
}

// 2b. mapa wpływu (quality/wplyw.json, krok 2) – może tylko poszerzać zakres testów
const baseWplywTxt = atBase('quality/wplyw.json'), wplywPath = path.join(ROOT, 'quality', 'wplyw.json');
if (baseWplywTxt && !fs.existsSync(wplywPath)) errors.push('Usunięto mapę wpływu quality/wplyw.json');
else if (baseWplywTxt) {
  const b = JSON.parse(baseWplywTxt), n = JSON.parse(fs.readFileSync(wplywPath, 'utf8'));
  if (n.tryb !== b.tryb) errors.push(`Zmieniono tryb wyboru testów: „${b.tryb}” → „${n.tryb}” (włączenie pomijania wymaga zgody właściciela)`);
  for (const [t, pages] of Object.entries(b.testy || {})) for (const pg of pages) if (!((n.testy || {})[t] || []).includes(pg)) errors.push(`Mapa wpływu: test ${t} nie sprawdza już strony ${pg}`);
  for (const [r, pages] of Object.entries(b.zasobyDynamiczne || {})) for (const pg of pages) if (!((n.zasobyDynamiczne || {})[r] || []).includes(pg)) errors.push(`Mapa wpływu: usunięto zależność ${pg} → ${r}`);
  for (const pg of b.strony || []) if (!(n.strony || []).includes(pg)) errors.push(`Mapa wpływu: usunięto stronę ${pg}`);
  for (const g of b.pelnaRegresja || []) if (!(n.pelnaRegresja || []).includes(g)) errors.push(`Mapa wpływu: usunięto regułę pełnej regresji ${g}`);
  for (const k of ['dokumentacja', 'android']) for (const g of n[k] || []) if (!(b[k] || []).includes(g)) errors.push(`Mapa wpływu: nowy wzorzec bez testów G2 (${k}): ${g}`);
}

// 3. pliki testów i pliki chronione
let changes = [];
try { changes = git('diff', '--name-status', '-M', `${BASE}...HEAD`).trim().split('\n').filter(Boolean).map(l => l.split('\t')); } catch (e) { warnings.push('Nie udało się porównać zmian z bazą: ' + e.message.split('\n')[0]); }
for (const [st, a, b] of changes) {
  if (/^app\/tests\//.test(a) && (st === 'D' || st.startsWith('R'))) errors.push(`Usunięto/przeniesiono plik testu: ${a}${b ? ' → ' + b : ''}`);
}
const protectedRe = /^(app\/tests\/|\.github\/workflows\/|quality\/|docs\/QUALITY\.md$|AGENTS\.md$|CLAUDE\.md$)/;
const touched = changes.map(c => c[c.length - 1]).filter(f => protectedRe.test(f));
if (touched.length) warnings.push('PR zmienia pliki bramki jakości – wymagany przegląd właściciela: ' + touched.join(', '));

for (const n of notes) console.log('Informacja: ' + n);
for (const w of warnings) console.log('::warning title=Ratchet::' + w);
for (const e of errors) console.log('::error title=Ratchet – osłabienie bramki::' + e);
const status = errors.length ? 'FAIL' : 'PASS';
if (JSON_OUT) { fs.mkdirSync(path.dirname(path.resolve(JSON_OUT)), { recursive: true }); } if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify({ status, base: BASE, errors, warnings, notes }, null, 2));
console.log('Ratchet ' + status + ` (baza ${BASE}; błędy ${errors.length}, ostrzeżenia ${warnings.length})`);
process.exitCode = status === 'PASS' ? 0 : 1;
