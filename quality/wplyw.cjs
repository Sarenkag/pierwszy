#!/usr/bin/env node
// Analiza wpływu zmian dla Quality Gate OEST (krok 2, zgoda Grzegorza 07/11/2026).
// Porównuje zmienione pliki z gałęzią bazową (wspólny przodek z main), ustala, które strony apki je wczytują,
// i wybiera testy przeglądarkowe (G2), które te strony sprawdzają. Wynik: JSON + powód dla każdego testu.
// TRYB „tylko-raport” (quality/wplyw.json): niczego nie pomija – bramka nadal uruchamia wszystkie testy,
// a podsumowanie pokazuje, co BY pominęła i dlaczego. Włączenie pomijania wymaga osobnej zgody właściciela.
// Zasady bezpieczeństwa:
//   - push na main, merge_group, wywołanie z Android APK (wydanie) i ręczne uruchomienie = zawsze pełna bramka,
//   - plik spoza reguł, plik apki, którego żadna strona nie wczytuje, usunięty plik apki = pełna regresja,
//   - zmiana samej bramki (quality/**, workflow, lista testów, ta mapa) = pełna regresja,
//   - nie ma flagi, etykiety ani zmiennej, która oznacza zmianę jako bezpieczną.
// Testy Node (G0) i G1 zawsze uruchamiają się w całości (kosztują kilkanaście sekund).
// Użycie: node quality/wplyw.cjs --base <sha|origin/main> [--event pull_request] [--www app/www] [--json out.json]
'use strict';
const fs = require('node:fs'), path = require('node:path'), { execFileSync } = require('node:child_process');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = path.resolve(arg('--root', path.resolve(__dirname, '..'))); // --root: tylko do testów samej bramki
const WWW = path.resolve(ROOT, arg('--www', 'app/www'));
const BASE = arg('--base', 'origin/main'), EVENT = arg('--event', process.env.GITHUB_EVENT_NAME || 'pull_request'), JSON_OUT = arg('--json', '');
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'quality', 'wplyw.json'), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'quality', 'required-tests.json'), 'utf8'));
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 << 20 });

// wzorce ścieżek: ** = dowolne katalogi, * = fragment nazwy
const glob = g => new RegExp('^' + g.split('**/').map(s => s.split('**').map(t => t.split('*').map(x => x.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('[^/]*')).join('.*')).join('(?:.*/)?') + '$');
const matches = (f, list) => (list || []).some(g => glob(g).test(f));

// Pliki wczytywane przez stronę: <script src>, <link href>, <img src>, <source src> (bez <a href> – link to nie wczytanie).
function pageRefs(page) {
  const file = path.join(WWW, page), refs = new Set([page]);
  if (!fs.existsSync(file)) return null;
  const html = fs.readFileSync(file, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  for (const m of html.matchAll(/<(script|link|img|source)\b[^>]*?\b(?:src|href)\s*=\s*["']([^"'#?]+)/gi)) {
    if (/^(https?:|data:|mailto:|\/\/)/i.test(m[2])) continue;
    refs.add(path.posix.normalize(path.posix.join(path.posix.dirname(page), m[2])));
  }
  for (const [res, pages] of Object.entries(cfg.zasobyDynamiczne || {})) if (pages.includes(page)) refs.add(res);
  return refs;
}

// Plik źródłowy → ścieżka w zbudowanej paczce (app/scripts/copy-web.js: inspekcje/* → www/inspekcje, moduly/** → www/moduly).
function builtPath(f) {
  if (f.startsWith('app/www/')) return f.slice(8);
  if (/^inspekcje\/[^/]+$/.test(f) || f.startsWith('moduly/')) return f;
  return null;
}

// Dane formularzy: które inspekcje zmieniła zmiana app/www/ppm.js (porównanie wykonanej listy window.OEST_PPM, jak w app/tests/ppm-lista.cjs).
// Gdy zmieniło się cokolwiek poza danymi zadań i formularzy (np. funkcje) – null = wszystkie inspekcje.
function ppmTouched() {
  const vm = require('node:vm');
  const load = src => { const sb = { window: {}, localStorage: { getItem: () => null, setItem() {}, removeItem() {} }, console }; sb.window.localStorage = sb.localStorage; sb.self = sb.window; vm.runInNewContext(src, sb, { timeout: 5000 }); const P = sb.window.OEST_PPM; if (!P || !Array.isArray(P.tasks)) throw Error('brak OEST_PPM.tasks'); return { tasks: P.tasks, P }; };
  // Kod poza literałami danych „tasks: […]” i „forms: {…}” musi być identyczny co do znaku (także prywatne funkcje),
  // inaczej zmiana może dotyczyć każdej inspekcji. Nie da się wyciąć literałów = wszystkie.
  const skeleton = src => {
    let out = src;
    for (const key of ['tasks', 'forms']) {
      const m = new RegExp('(?:^|[{,])\\s*' + key + '\\s*:\\s*([\\[{])', 'm').exec(out); if (!m) return null;
      let i = m.index + m[0].length - 1, depth = 0, q = '';
      for (; i < out.length; i++) {
        const c = out[i];
        if (q) { if (c === '\\') i++; else if (c === q) q = ''; continue; }
        if (c === '"' || c === "'" || c === '`') q = c;
        else if (c === '/' && out[i + 1] === '/') { while (i < out.length && out[i] !== '\n') i++; }
        else if (c === '/' && out[i + 1] === '*') { i = out.indexOf('*/', i + 2); if (i < 0) return null; i++; }
        else if (c === '[' || c === '{') depth++;
        else if ((c === ']' || c === '}') && --depth === 0) break;
      }
      if (depth !== 0) return null;
      out = out.slice(0, m.index) + '\u0000' + key + '\u0000' + out.slice(i + 1);
    }
    return out;
  };
  let before, after, srcA, srcB;
  try { srcA = git('show', `${BASE}:app/www/ppm.js`); srcB = fs.readFileSync(path.join(ROOT, 'app', 'www', 'ppm.js'), 'utf8'); before = load(srcA); after = load(srcB); } catch { return null; }
  const skA = skeleton(srcA), skB = skeleton(srcB);
  if (skA === null || skB === null || skA !== skB) return null;
  const form = (P, t) => JSON.stringify(t && t.form ? (P.forms || {})[t.form] : null);
  // forms bez zadania o tej nazwie (np. plantRooms, flush) czyta strona inspekcji przy budowie formularzy – nie wiadomo których: wszystkie
  const used = new Set([...before.tasks, ...after.tasks].map(t => t.form).filter(Boolean));
  for (const k of new Set([...Object.keys(before.P.forms || {}), ...Object.keys(after.P.forms || {})]))
    if (!used.has(k) && JSON.stringify((before.P.forms || {})[k]) !== JSON.stringify((after.P.forms || {})[k])) return null;
  const ids = new Set([...before.tasks, ...after.tasks].map(t => t.id)), touched = [];
  for (const id of ids) {
    const a = before.tasks.find(t => t.id === id), b = after.tasks.find(t => t.id === id);
    if (JSON.stringify(a) !== JSON.stringify(b) || form(before.P, a) !== form(after.P, b)) touched.push(id);
  }
  return touched.sort();
}

function analyse() {
  const browserTests = [...new Set([...(manifest.browser || []).map(t => t.file), ...fs.readdirSync(path.join(ROOT, 'app', 'tests')).filter(f => f.endsWith('-ui-check.cjs')).map(f => 'app/tests/' + f)])].sort();
  const refs = {}; for (const p of cfg.strony) refs[p] = pageRefs(p);
  const deps = {}; for (const t of browserTests) deps[t] = cfg.testy[t] ? [...new Set(cfg.testy[t].flatMap(p => [...(refs[p] || [])]))].sort() : null;
  const out = { schema: 'oest.quality.wplyw-wynik', tryb: cfg.tryb, event: EVENT, base: BASE, pelna: false, powodyPelnej: [], zmiany: [], wybrane: [], pominiete: [], inspekcje: undefined, zaleznosci: deps, strony: Object.fromEntries(Object.entries(refs).map(([k, v]) => [k, v ? [...v].sort() : null])) };
  const full = r => { out.pelna = true; if (!out.powodyPelnej.includes(r)) out.powodyPelnej.push(r); };
  const need = new Map(); // test → powody wyboru
  const pick = (t, why) => { if (!need.has(t)) need.set(t, []); need.get(t).push(why); };

  if (EVENT !== 'pull_request') full(`zdarzenie ${EVENT}: push na main, merge_group, wydanie APK i ręczne uruchomienie zawsze mają pełną bramkę`);
  for (const p of cfg.strony) if (!refs[p]) full(`brak zbudowanej strony app/www/${p} (npm run copy-web)`);
  for (const t of browserTests) if (!deps[t]) { full(`test ${t} nie ma strony w quality/wplyw.json (nowy test?) – nieznane zależności`); }

  let changes = [];
  try { changes = git('diff', '--name-status', '-M', `${BASE}...HEAD`).trim().split('\n').filter(Boolean).map(l => l.split('\t')); }
  catch (e) { full('nie udało się porównać z gałęzią bazową: ' + e.message.split('\n')[0]); }
  let ppmChanged = false, otherInspekcjeChange = false;
  for (const c of changes) {
    const st = c[0][0], files = c.slice(1); // przy przeniesieniu liczą się obie ścieżki
    for (const f of files) {
      const z = { plik: f, stan: st, klasa: '', powod: '', testy: [] };
      out.zmiany.push(z);
      if (matches(f, cfg.pelnaRegresja)) { z.klasa = 'bramka/wspólne'; z.powod = 'plik bramki, zależności lub budowy paczki'; full(`${f}: ${z.powod}`); continue; }
      if (matches(f, cfg.dokumentacja)) { z.klasa = 'dokumentacja'; z.powod = 'nie trafia do apki'; continue; }
      if (matches(f, cfg.android)) { z.klasa = 'android'; z.powod = 'kod natywny – sprawdza go budowa Android APK, nie testy strony'; continue; }
      if (f.startsWith('app/tests/')) {
        if (f.endsWith('-ui-check.cjs')) { z.klasa = 'test'; z.powod = 'zmieniony test przeglądarkowy'; z.testy = [f]; pick(f, 'zmieniony plik testu'); }
        else if (f.endsWith('.test.cjs')) { z.klasa = 'test'; z.powod = 'test Node – G0 zawsze w całości'; }
        else if (!f.endsWith('.cjs')) { z.klasa = 'dane testów'; z.powod = 'dane testów – nazwy plików mogą być składane w kodzie, nie da się ustalić użytkowników'; full(`${f}: ${z.powod}`); }
        else {
          const base = path.basename(f), users = browserTests.filter(t => { try { return fs.readFileSync(path.join(ROOT, t), 'utf8').includes(base); } catch { return false; } });
          z.klasa = 'pomocnik testu';
          if (!users.length) { z.powod = 'żaden test przeglądarkowy nie wymienia go z nazwy – nieznani użytkownicy'; full(`${f}: ${z.powod}`); }
          else { z.powod = 'używają go testy przeglądarkowe'; z.testy = users; users.forEach(t => pick(t, `pomocnik ${f}`)); }
        }
        continue;
      }
      const b = builtPath(f);
      if (b === null) { z.klasa = 'nieznany'; z.powod = 'plik spoza mapy wpływu'; full(`${f}: plik spoza mapy wpływu`); continue; }
      if (st === 'D' || st === 'R' && f === files[0]) { z.klasa = 'wspólne/nieznane'; z.powod = 'usunięty lub przeniesiony plik apki'; full(`${f}: usunięty lub przeniesiony plik apki`); continue; }
      if (!fs.existsSync(path.join(WWW, b))) { z.klasa = 'poza paczką'; z.powod = 'copy-web nie kopiuje go do apki'; continue; }
      const pages = cfg.strony.filter(p => refs[p] && refs[p].has(b));
      if (!pages.length) { z.klasa = 'wspólne/nieznane'; z.powod = 'żadna strona go nie wczytuje wprost (może być ładowany dynamicznie)'; full(`${f}: ${z.powod}`); continue; }
      z.klasa = pages.length > 1 || b.startsWith('moduly/') ? 'wspólne' : b.startsWith('inspekcje/') || pages[0].startsWith('inspekcje/') ? 'inspekcje' : 'ekran apki';
      if (b === 'ppm.js') { z.klasa = 'dane formularza'; ppmChanged = true; } else if (pages.includes('inspekcje/index.html')) otherInspekcjeChange = true;
      z.powod = 'wczytuje go: ' + pages.join(', ');
      for (const t of browserTests) if (deps[t] && deps[t].includes(b)) { z.testy.push(t); pick(t, `${f} (strona ${cfg.testy[t].filter(p => pages.includes(p)).join(', ')})`); }
    }
  }
  // Dane formularza: raport-ui-check wystarczyłby dla dotkniętych inspekcji (informacja; filtr wymaga zmiany testu i osobnej zgody).
  if (ppmChanged && !otherInspekcjeChange && !out.pelna) out.inspekcje = ppmTouched();

  for (const t of browserTests) {
    if (out.pelna) { out.wybrane.push({ test: t, powod: 'pełna regresja: ' + out.powodyPelnej[0] }); continue; }
    if (need.has(t)) out.wybrane.push({ test: t, powod: need.get(t).join('; ') });
    else {
      const touched = out.zmiany.filter(z => z.klasa !== 'dokumentacja' && z.klasa !== 'android' && z.klasa !== 'poza paczką' && z.klasa !== 'test' && z.klasa !== 'pomocnik testu');
      out.pominiete.push({ test: t, powod: (changes.length ? (touched.length ? `zmiany (${touched.map(z => z.plik).join(', ')}) nie są wczytywane przez ${(cfg.testy[t] || []).join(', ')}` : 'zmiana nie dotyczy stron apki (' + [...new Set(out.zmiany.map(z => z.klasa))].join(', ') + ')') : 'brak zmian względem bazy') });
    }
  }
  return out;
}

let result;
try { result = analyse(); result.status = 'OK'; }
catch (e) { result = { schema: 'oest.quality.wplyw-wynik', tryb: cfg.tryb, status: 'BŁĄD', blad: e.message, pelna: true, powodyPelnej: ['analiza wpływu nie powiodła się – pełna regresja'], wybrane: [], pominiete: [] }; }
if (JSON_OUT) { fs.mkdirSync(path.dirname(path.resolve(JSON_OUT)), { recursive: true }); fs.writeFileSync(JSON_OUT, JSON.stringify(result, null, 2)); }
console.log(`Wpływ zmian (${result.tryb}): ${result.pelna ? 'PEŁNA REGRESJA – ' + result.powodyPelnej.join(' | ') : `wybrane ${result.wybrane.length}, do pominięcia ${result.pominiete.length}`}`);
for (const w of result.wybrane || []) console.log(`  uruchomić: ${w.test} – ${w.powod}`);
for (const p of result.pominiete || []) console.log(`  pominąć:   ${p.test} – ${p.powod}`);
if (result.inspekcje !== undefined) console.log('  raport-ui-check – dotknięte inspekcje: ' + (result.inspekcje ? result.inspekcje.join(', ') || '(brak)' : 'wszystkie'));
