#!/usr/bin/env node
// G1 – kontrola zależności modułów i kolejności ładowania skryptów (Quality Gate OEST, etap 2).
// Sprawdza zbudowaną paczkę strony (app/www po `npm run copy-web`), czyli dokładnie to, co trafia do APK.
// Reguły (każde naruszenie ma stały identyfikator, bez numerów linii):
//   MISSING_SCRIPT       – <script src> wskazuje plik, którego nie ma w paczce
//   DUPLICATE_SCRIPT     – ten sam plik ładowany dwa razy na jednej stronie
//   UNDEFINED_GLOBAL     – plik używa globalnego API (OEST*, TPL_*, biblioteki raportu), którego żaden skrypt strony nie tworzy
//   LOAD_ORDER           – plik używa API, które na tej stronie powstaje dopiero w skrypcie ładowanym PÓŹNIEJ
//   DUPLICATE_DEFINITION – to samo globalne API tworzone w więcej niż jednym pliku
//   MODULE_DEPENDS_ON_APP – plik z moduly/ zależy od API zdefiniowanego w kodzie samej apki
//   CYCLE                – cykl zależności między plikami jednej strony
// Zastane naruszenia są w quality/baselines/architecture.json. Nowe naruszenie = FAIL.
// Wpis w baseline, który już nie występuje = FAIL (baseline może tylko maleć – usuń wpis w tym samym PR).
// Użycie: node quality/check-architecture.cjs [--www app/www] [--baseline quality/baselines/architecture.json] [--json out.json] [--write-baseline]
'use strict';
const fs = require('node:fs'), path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const WWW = path.resolve(ROOT, arg('--www', 'app/www'));
const BASELINE = path.resolve(ROOT, arg('--baseline', 'quality/baselines/architecture.json'));
const JSON_OUT = arg('--json', '');
const PAGES = ['index.html', 'inspekcje/index.html'];
// biblioteki raportu: nazwa pliku → tworzone API i wzorzec użycia
const LIBS = {
  'pizzip.min.js': { name: 'PizZip', use: /\bPizZip\b/ },
  'docxtemplater.min.js': { name: 'docxtemplater', use: /\bnew\s+(?:window\.)?docxtemplater\b|\bwindow\.docxtemplater\b/i },
  'jspdf.umd.min.js': { name: 'jspdf', use: /\bjspdf\.jsPDF\b|\bwindow\.jspdf\b/ }
};
const TRACKED = /^(OEST[A-Za-z0-9_]+|TPL_[A-Z0-9_]+)$/;
const USE_RE = /\b(OEST[A-Za-z0-9_]+|TPL_[A-Z0-9_]+)\b/g;
const DEF_RE = /\b(?:window|w|root|self|globalThis|global|g)\.([A-Za-z_$][\w$]*)\s*=(?!=)/g;
const TOP_DEF_RE = /^(?:var|let|const|function)\s+(OEST[A-Za-z0-9_]+|TPL_[A-Z0-9_]+)\b/gm;

// Usuwa komentarze i treść napisów (nazwy w tekstach typu „folder OEST” to nie użycie API).
// Wyrażenia ${…} w szablonach `…` zostają, bo to kod. Prosty, deterministyczny tokenizer.
function stripComments(src) {
  let out = '', i = 0, prev = '';
  const tpl = []; // stos głębokości nawiasów { wewnątrz ${…}
  const regexOk = () => !prev || /[(,=:[!&|?{};+\-*%<>~^]/.test(prev);
  while (i < src.length) {
    const c = src[i], n = src[i + 1];
    if (c === '/' && n === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '/' && n === '*') { const e = src.indexOf('*/', i + 2); i = e < 0 ? src.length : e + 2; out += ' '; continue; }
    if (c === '"' || c === "'") { i++; while (i < src.length && src[i] !== c && src[i] !== '\n') i += src[i] === '\\' ? 2 : 1; i++; out += '""'; prev = '"'; continue; }
    if (c === '`' || (c === '}' && tpl.length && tpl[tpl.length - 1] === 0)) {
      if (c === '}') tpl.pop();
      i++;
      while (i < src.length && src[i] !== '`' && !(src[i] === '$' && src[i + 1] === '{')) i += src[i] === '\\' ? 2 : 1;
      if (src[i] === '$') { tpl.push(0); i += 2; out += '(' ; prev = '('; continue; }
      i++; out += '""'; prev = '"'; continue;
    }
    if (c === '/' && regexOk()) { i++; let cls = false; while (i < src.length && src[i] !== '\n' && (src[i] !== '/' || cls)) { if (src[i] === '\\') i++; else if (src[i] === '[') cls = true; else if (src[i] === ']') cls = false; i++; } i++; while (/[a-z]/.test(src[i] || '')) i++; out += '/r/'; prev = '/'; continue; }
    if (tpl.length) { if (c === '{') tpl[tpl.length - 1]++; else if (c === '}') tpl[tpl.length - 1]--; }
    out += c; if (!/\s/.test(c)) prev = c; i++;
  }
  return out;
}
const rel = p => path.relative(WWW, p).split(path.sep).join('/');

function scan(code) {
  const c = stripComments(code), defs = new Set(), uses = new Set();
  for (const m of c.matchAll(DEF_RE)) if (TRACKED.test(m[1])) defs.add(m[1]);
  for (const m of c.matchAll(TOP_DEF_RE)) defs.add(m[1]);
  for (const m of c.matchAll(USE_RE)) if (TRACKED.test(m[1]) && !/Plugins\.$/.test(c.slice(Math.max(0, m.index - 8), m.index))) uses.add(m[1]); // Capacitor.Plugins.X = wtyczka natywna, nie skrypt
  for (const lib of Object.values(LIBS)) if (lib.use.test(c)) uses.add(lib.name);
  for (const d of defs) uses.delete(d);
  return { defs, uses };
}

function pageScripts(page) {
  const file = path.join(WWW, page), html = fs.readFileSync(file, 'utf8'), out = [];
  let inline = 0;
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const src = (m[1].match(/\bsrc\s*=\s*["']([^"']+)["']/i) || [])[1];
    if (src) {
      if (/^https?:/i.test(src)) { out.push({ id: src, external: true, ...libScan(src) }); continue; }
      const abs = path.resolve(path.dirname(file), src.split('?')[0]);
      const id = rel(abs);
      if (!fs.existsSync(abs)) { out.push({ id, missing: true, defs: new Set(), uses: new Set() }); continue; }
      const lib = LIBS[path.basename(abs)];
      out.push(lib ? { id, lib: true, defs: new Set([lib.name]), uses: new Set() } : { id, ...scan(fs.readFileSync(abs, 'utf8')) });
    } else if (m[2].trim()) {
      inline++; out.push({ id: page + '#inline-' + inline, ...scan(m[2]) });
    }
  }
  return out;
}
function libScan(url) { const lib = LIBS[path.basename(url.split('?')[0])]; return { defs: new Set(lib ? [lib.name] : []), uses: new Set() }; }

function analyse() {
  const violations = new Map(), add = (id, rule, detail) => { if (!violations.has(id)) violations.set(id, { id, rule, detail }); };
  const definers = new Map(), loaded = new Set(), pages = {};
  for (const page of PAGES) {
    const scripts = pageScripts(page), seen = new Set();
    pages[page] = scripts.map(s => s.id);
    scripts.forEach((s, i) => {
      if (s.missing) add(`MISSING_SCRIPT|${page}|${s.id}`, 'MISSING_SCRIPT', `${page}: brak pliku ${s.id}`);
      if (seen.has(s.id)) add(`DUPLICATE_SCRIPT|${page}|${s.id}`, 'DUPLICATE_SCRIPT', `${page}: ${s.id} ładowany więcej niż raz`);
      seen.add(s.id);
      if (!s.external && !s.id.includes('#inline')) loaded.add(s.id);
      if (!s.id.includes('#inline')) for (const d of s.defs) { if (!definers.has(d)) definers.set(d, new Set()); definers.get(d).add(s.external ? path.basename(s.id) : s.id); }
    });
    // kolejność i brakujące API w obrębie strony
    const firstDef = new Map(); scripts.forEach((s, i) => s.defs.forEach(d => { if (!firstDef.has(d)) firstDef.set(d, i); }));
    const edges = new Map();
    scripts.forEach((s, i) => {
      for (const u of s.uses) {
        if (!firstDef.has(u)) { add(`UNDEFINED_GLOBAL|${page}|${s.id}|${u}`, 'UNDEFINED_GLOBAL', `${page}: ${s.id} używa ${u}, którego żaden skrypt strony nie tworzy`); continue; }
        const j = firstDef.get(u);
        if (j > i) add(`LOAD_ORDER|${page}|${s.id}|${u}`, 'LOAD_ORDER', `${page}: ${s.id} (poz. ${i + 1}) używa ${u} z ${scripts[j].id} (poz. ${j + 1}, ładowany później)`);
        if (j !== i) { if (!edges.has(s.id)) edges.set(s.id, new Set()); edges.get(s.id).add(scripts[j].id); }
        if (/^moduly\//.test(s.id) && !/^moduly\//.test(scripts[j].id) && !scripts[j].lib && !scripts[j].external)
          add(`MODULE_DEPENDS_ON_APP|${s.id}|${u}`, 'MODULE_DEPENDS_ON_APP', `${s.id} (moduł) zależy od ${u} z kodu apki (${scripts[j].id})`);
      }
    });
    for (const cyc of cycles(edges)) add(`CYCLE|${page}|${cyc.join('>')}`, 'CYCLE', `${page}: cykl ${cyc.join(' → ')} → ${cyc[0]}`);
  }
  for (const [name, files] of definers) if (files.size > 1) add(`DUPLICATE_DEFINITION|${name}`, 'DUPLICATE_DEFINITION', `${name} tworzone w: ${[...files].sort().join(', ')}`);
  // informacyjnie: pliki JS paczki, których żadna strona nie ładuje (ARCH-002: moduł PLANNED nie jest zbędny)
  const all = [...fs.readdirSync(WWW).filter(f => f.endsWith('.js')).map(f => f),
    ...(fs.existsSync(path.join(WWW, 'moduly')) ? fs.readdirSync(path.join(WWW, 'moduly')).flatMap(d => { const p = path.join(WWW, 'moduly', d); return fs.statSync(p).isDirectory() ? fs.readdirSync(p).filter(f => f.endsWith('.js')).map(f => `moduly/${d}/${f}`) : []; }) : [])];
  const notLoaded = all.filter(f => !loaded.has(f)).sort();
  return { violations: [...violations.values()].sort((a, b) => a.id.localeCompare(b.id)), pages, notLoaded };
}

// silnie spójne składowe (Tarjan), zwraca cykle >1 pliku jako posortowane, stabilne listy
function cycles(edges) {
  let idx = 0; const index = new Map(), low = new Map(), stack = [], on = new Set(), out = [];
  const nodes = new Set([...edges.keys(), ...[...edges.values()].flatMap(s => [...s])]);
  const visit = v => {
    index.set(v, idx); low.set(v, idx); idx++; stack.push(v); on.add(v);
    for (const w of edges.get(v) || []) {
      if (!index.has(w)) { visit(w); low.set(v, Math.min(low.get(v), low.get(w))); }
      else if (on.has(w)) low.set(v, Math.min(low.get(v), index.get(w)));
    }
    if (low.get(v) === index.get(v)) { const comp = []; let w; do { w = stack.pop(); on.delete(w); comp.push(w); } while (w !== v); if (comp.length > 1) out.push(comp.sort()); }
  };
  for (const v of [...nodes].sort()) if (!index.has(v)) visit(v);
  return out;
}

function main() {
  if (!fs.existsSync(path.join(WWW, 'inspekcje', 'index.html'))) { console.error('G1 NOT RUN: brak ' + rel(path.join(WWW, 'inspekcje')) + ' – najpierw `npm run copy-web` w app/.'); process.exit(2); }
  const { violations, pages, notLoaded } = analyse();
  if (process.argv.includes('--write-baseline')) {
    const entries = violations.map(v => ({ id: v.id, rule: v.rule, detail: v.detail, reason: 'Zastany stan main przy wprowadzeniu G1 (06/11/2026). Bez refaktoryzacji – do oceny w osobnym zadaniu.', owner: 'Grzegorz' }));
    fs.writeFileSync(BASELINE, JSON.stringify({ schema: 'oest.quality.baseline', version: 1, rule: 'architecture', note: 'Lista może tylko maleć. Dodanie wpisu wymaga wyraźnej zgody właściciela (QUALITY.md, QG-014).', entries }, null, 2) + '\n');
    console.log('Zapisano baseline: ' + entries.length + ' wpisów'); return;
  }
  const base = fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, 'utf8')).entries.map(e => e.id) : [];
  const now = new Set(violations.map(v => v.id)), baseSet = new Set(base);
  const fresh = violations.filter(v => !baseSet.has(v.id)), stale = base.filter(id => !now.has(id));
  const known = violations.filter(v => baseSet.has(v.id));
  const byRule = {}; for (const v of violations) byRule[v.rule] = (byRule[v.rule] || 0) + 1;
  console.log('G1 architektura: strony ' + Object.entries(pages).map(([p, s]) => `${p} (${s.length} skryptów)`).join(', '));
  console.log('Naruszenia ogółem: ' + violations.length + ' ' + JSON.stringify(byRule) + ' | w baseline: ' + known.length + ' | NOWE: ' + fresh.length + ' | nieaktualne wpisy baseline: ' + stale.length);
  if (notLoaded.length) console.log('Informacyjnie – pliki niełądowane przez żadną stronę (ARCH-002, nie błąd): ' + notLoaded.join(', '));
  for (const v of fresh) console.log('::error title=G1 nowe naruszenie (' + v.rule + ')::' + v.detail);
  for (const id of stale) console.log('::error title=G1 baseline nieaktualny::' + id + ' już nie występuje – usuń wpis z quality/baselines/architecture.json (baseline może tylko maleć).');
  const status = fresh.length || stale.length ? 'FAIL' : 'PASS';
  if (JSON_OUT) { fs.mkdirSync(path.dirname(path.resolve(JSON_OUT)), { recursive: true }); } if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify({ status, total: violations.length, byRule, baseline: known.length, fresh, stale, notLoaded, pages }, null, 2));
  console.log('G1 ' + status);
  process.exitCode = status === 'PASS' ? 0 : 1;
}
main();
