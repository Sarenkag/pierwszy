// Plan audytu 19/11/2026, punkt 1.7 (ustalenie nr 113): kontrakt wtyczek telefonu JS ↔ Java/Kotlin.
// Źródło prawdy = kod natywny (@CapacitorPlugin, @PluginMethod w app/android) i definicje wtyczek z node_modules (.d.ts: App, SocialLogin,
// CapacitorHttp). Sprawdza statycznie (bez telefonu):
//  - niezarejestrowana:<Wtyczka> – klasa @CapacitorPlugin nie jest dodana w MainActivity (registerPlugin) – na telefonie jej nie ma,
//  - wywolanie:<Wtyczka>.<metoda> – apka (moduly/, inspekcje/, app/www) woła metodę, której wtyczka nie ma,
//  - parametr:<Wtyczka>.<metoda>:<klucz> – apka przekazuje pole, którego kod natywny tej metody (z jej funkcjami pomocniczymi) nie czyta,
//  - atrapa-nieznana:<Wtyczka> – test podstawia w Capacitor.Plugins wtyczkę, której nie ma,
//  - atrapa-metoda:<Wtyczka>.<metoda> – atrapa w teście ma metodę, której prawdziwa wtyczka nie ma (test sprawdza coś, czego nie ma),
//  - atrapa-zwrot:<Wtyczka>.<metoda>:<klucz> – atrapa zwraca pole, którego kod natywny tej metody nigdy nie zwraca (put("klucz")).
// Rozbieżności zastane: quality/baselines/wtyczki-kontrakt.json (lista może tylko maleć): nowa = FAIL, nieaktualny wpis = FAIL.
// NIE sprawdza typów wartości ani tego, czy wtyczka działa na Pixelu – to telefon.
'use strict';
const test = require('node:test'), assert = require('node:assert'), fs = require('node:fs'), path = require('node:path');
const REPO = path.resolve(__dirname, '../..'), BASELINE = path.join(REPO, 'quality/baselines/wtyczki-kontrakt.json');
const czytaj = p => fs.readFileSync(path.join(REPO, p), 'utf8');
const pliki = (dir, re) => { const out = []; const idz = d => { for (const e of fs.readdirSync(path.join(REPO, d), { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) { if (!/^(node_modules|lib|build)$/.test(e.name)) idz(p); } else if (re.test(e.name)) out.push(p); } }; idz(dir); return out; };
// fragment od otwierającego nawiasu do pasującego zamykającego (z pominięciem napisów i komentarzy)
function blok(s, i) {
  const otw = s[i], zam = { '{': '}', '(': ')', '[': ']' }[otw]; let d = 0;
  for (let k = i; k < s.length; k++) {
    const c = s[k];
    if (c === '"' || c === "'" || c === '`') { const q = c; for (k++; k < s.length && s[k] !== q; k++) if (s[k] === '\\') k++; continue; }
    if (c === '/' && s[k + 1] === '/') { k = s.indexOf('\n', k); if (k < 0) break; continue; }
    if (c === '/' && s[k + 1] === '*') { k = s.indexOf('*/', k + 2) + 1; if (k <= 0) break; continue; }
    if (c === otw) d++; else if (c === zam && --d === 0) return s.slice(i, k + 1);
  }
  return s.slice(i);
}
// ten sam tekst z wyczyszczonym wnętrzem napisów i komentarzy (te same pozycje) – żeby „Vantify: …” w napisie nie było atrapą
function bezNapisow(s) {
  const t = s.split('');
  for (let k = 0; k < s.length; k++) {
    const c = s[k];
    if (c === '"' || c === "'" || c === '`') { const q = c; for (k++; k < s.length && s[k] !== q; k++) { if (s[k] === '\\') { t[k] = ' '; k++; } if (s[k] !== '\n') t[k] = ' '; } continue; }
    if (c === '/' && s[k + 1] === '/') { for (; k < s.length && s[k] !== '\n'; k++) t[k] = ' '; continue; }
    if (c === '/' && s[k + 1] === '*') { for (; k < s.length && !(s[k - 1] === '*' && s[k] === '/' && t[k - 1] === ' '); k++) if (s[k] !== '\n') t[k] = ' '; t[k] = ' '; continue; }
  }
  return t.join('');
}
// klucze obiektu {a: …, b() {…}, async c(…) {…}, 'd': …, e} na najwyższym poziomie
function klucze(obj) {
  const wn = obj.slice(1, -1), out = []; let d = 0, start = 0;
  const czesci = [];
  for (let k = 0; k < wn.length; k++) {
    const c = wn[k];
    if (c === '"' || c === "'" || c === '`') { const q = c; for (k++; k < wn.length && wn[k] !== q; k++) if (wn[k] === '\\') k++; continue; }
    if ('{(['.includes(c)) d++; else if ('})]'.includes(c)) d--; else if (c === ',' && d === 0) { czesci.push(wn.slice(start, k)); start = k + 1; }
  }
  czesci.push(wn.slice(start));
  for (const c of czesci) { const m = /^\s*(?:\/\*[\s\S]*?\*\/\s*)?(?:async\s+)?['"]?([A-Za-z_$][\w$]*)['"]?\s*(?=[:(,]|$)/.exec(c); if (m) out.push({ klucz: m[1], tresc: c.slice(m[0].length) }); }
  return out;
}

// ---------- strona natywna ----------
function natywne() {
  const wt = new Map(), main = bezNapisow(czytaj('app/android/app/src/main/java/com/oest/inspekcje/MainActivity.java')); // bez komentarzy: zakomentowana rejestracja = brak rejestracji
  for (const p of pliki('app/android/app/src/main/java', /\.(java|kt)$/)) {
    const s = czytaj(p), nm = /@CapacitorPlugin\s*\(\s*name\s*=\s*"([^"]+)"/.exec(s); if (!nm) continue;
    const klasa = (/class\s+(\w+)/.exec(s) || [])[1];
    // wszystkie funkcje klasy (nazwa → treść), żeby doliczyć funkcje pomocnicze wywoływane z metody wtyczki
    const funkcje = new Map();
    for (const m of s.matchAll(/(?:\bfun\s+(\w+)\s*\([^)]*\)[^{=\n]*|\b(?:public|private|protected|static|final|synchronized|\s)+[\w<>[\],.?\s]+?\s+(\w+)\s*\([^;{]*?\)\s*(?:throws\s+[\w.,\s]+)?)\{/g)) {
      const n = m[1] || m[2]; if (!n || /^(if|for|while|switch|catch|return|new)$/.test(n)) continue;
      const b = blok(s, m.index + m[0].length - 1); funkcje.set(n, (funkcje.get(n) || '') + b);
    }
    const metody = new Map(), wywolaniaNazwy = [...s.matchAll(/\bPluginCall\s+(\w+)|\b(\w+)\s*:\s*PluginCall\b/g)].map(x => x[1] || x[2]);
    for (const m of s.matchAll(/@PluginMethod(?:\s*\([^)]*\))?\s*(?:public\s+)?(?:void\s+|fun\s+)(\w+)\s*\(/g)) {
      const i = s.indexOf(m[1] === 'x' ? '' : '{', m.index + m[0].length), tresc = blok(s, i);
      // treść metody + funkcji pomocniczych, które woła (2 poziomy)
      let razem = tresc;
      for (let poziom = 0; poziom < 2; poziom++) for (const [n, b] of funkcje) if (n !== m[1] && new RegExp('\\b' + n + '\\s*\\(').test(razem) && !razem.includes(b)) razem += '\n' + b;
      // wynik z okna (startActivityForResult(call, …, "funkcja")) = funkcja @ActivityCallback; wywołanie przekazane innemu obiektowi
      // (new Sync(…, call, …), join(call)) = wynik może dać dowolne miejsce pliku – wtedy pola zwrotu liczone z całego pliku
      for (const cb of razem.matchAll(/startActivityForResult\(\s*call\s*,[^;]*?"(\w+)"\s*\)/g)) if (funkcje.has(cb[1])) { razem += '\n' + funkcje.get(cb[1]); for (const [n, b] of funkcje) if (new RegExp('\\b' + n + '\\s*\\(').test(funkcje.get(cb[1])) && !razem.includes(b)) razem += '\n' + b; }
      const przekazana = /new\s+\w+\s*\([^;]*\bcall\b|\.\w+\(\s*call\s*[,)]/.test(tresc.replace(/\bcall\.\w+\(/g, ''));
      // wynik zbudowany z JSON (new JSObject(tekst), fromJSONObject) – pól zwrotu nie da się odczytać z kodu, nie są sprawdzane
      // tylko to, co trafia do call.resolve(…): argument (albo zmienna z tym argumentem) zbudowany z JSON – konwersja danych wejściowych się nie liczy
      const zakres = przekazana ? s : razem, zJson = t => /new\s+JSObject\(\s*\w|fromJSONObject\(/.test(t);
      const dowolny = [...zakres.matchAll(/\.resolve\(/g)].some(r => { const arg = blok(zakres, r.index + r[0].length - 1).slice(1, -1).trim();
        if (zJson(arg)) return true; if (!/^\w+$/.test(arg)) return false;
        return [...zakres.matchAll(new RegExp('\\b' + arg + '\\s*=(?!=)([^;]*)', 'g'))].some(x => zJson(x[1])); });
      // parametry główne = odczyty z obiektu wywołania (PluginCall) albo z jego call.getData(); pola zagnieżdżonych obiektów się nie liczą
      const zrodla = new Set(['call', ...wywolaniaNazwy]); for (const d of razem.matchAll(/\b(\w+)\s*=\s*(\w+)\.getData\(\)/g)) if (zrodla.has(d[2])) zrodla.add(d[1]);
      const czyta = new Set([...razem.matchAll(/\b(\w+)\.(?:get|opt|has)\w*\(\s*"(\w+)"/g)].filter(x => zrodla.has(x[1])).map(x => x[2]));
      metody.set(m[1], { przekazana, dowolny, czyta, zwraca: new Set([...zakres.matchAll(/\bput\(\s*"(\w+)"/g)].map(x => x[1])) });
    }
    // metody, które ma każda wtyczka Capacitor (klasa bazowa Plugin): słuchacze zdarzeń i uprawnienia
    for (const b of ['addListener', 'removeListener', 'removeAllListeners', 'checkPermissions', 'requestPermissions']) if (!metody.has(b)) metody.set(b, null);
    wt.set(nm[1], { plik: p, klasa, metody, natywna: true, zarejestrowana: new RegExp('registerPlugin\\(\\s*' + klasa + '\\.class').test(main) });
  }
  // wtyczki z bibliotek: metody z interfejsu w definicjach .d.ts (bez kodu natywnego – pola nie są sprawdzane)
  const dts = (n, plik, iface) => { const s = czytaj(plik), i = s.indexOf('export interface ' + iface); assert.ok(i >= 0, 'brak interfejsu ' + iface + ' w ' + plik);
    const b = blok(s, s.indexOf('{', i)); wt.set(n, { plik, metody: new Map([...b.matchAll(/^\s{4}(\w+)\s*(?:<[^(]*>)?\s*\(/gm)].map(m => [m[1], null])), natywna: false, zarejestrowana: true }); };
  dts('App', 'app/node_modules/@capacitor/app/dist/esm/definitions.d.ts', 'AppPlugin');
  dts('SocialLogin', 'app/node_modules/@capgo/capacitor-social-login/dist/esm/definitions.d.ts', 'SocialLoginPlugin');
  dts('CapacitorHttp', 'app/node_modules/@capacitor/core/types/core-plugins.d.ts', 'CapacitorHttpPlugin');
  return wt;
}

// ---------- wywołania w apce ----------
const RE_WT = /Plugins(?:\?\.|\.)([A-Z]\w*)|Plugins\[\s*['"](\w+)['"]\s*\]|registerPlugin\(\s*['"](\w+)['"]/g;
function wywolania(wt) {
  const zrodla = [...pliki('moduly', /\.js$/), ...pliki('inspekcje', /\.(js|html)$/), ...fs.readdirSync(path.join(REPO, 'app/www')).filter(f => /\.(js|html)$/.test(f)).map(f => 'app/www/' + f)];
  const out = [];
  for (const p of zrodla) {
    // uchwyt = nazwa zmiennej/funkcji z wtyczką → [{ od, do, wtyczka }]: zmienna ważna od przypisania do następnego przypisania tej nazwy
    const s = czytaj(p), uchwyt = new Map(), dodaj = (n, w, od = 0) => { if (!wt.has(w)) return; if (!uchwyt.has(n)) uchwyt.set(n, []);
      const re = new RegExp('(?:\\b(?:var|let|const)\\s+|[,;{(\\s])' + n.replace(/\$/g, '\\$') + '\\s*=(?!=)', 'g'); re.lastIndex = od + 1; const nast = od ? re.exec(s) : null;
      uchwyt.get(n).push({ od, do: nast ? nast.index : s.length, w }); };
    const uchwytW = (n, i) => [...new Set((uchwyt.get(n) || []).filter(u => i >= u.od && i < u.do).map(u => u.w))];
    const wtyczkiW = t => [...t.matchAll(RE_WT)].map(m => m[1] || m[2] || m[3]);
    // zmienna = … Plugins.X / registerPlugin('X') (bez przecinka i średnika po drodze)
    for (const m of s.matchAll(/\b(\w+)\s*=(?!=)\s*([^;,\n]*?(?:Plugins(?:\?\.|\.)[A-Z]\w*|registerPlugin\(\s*['"]\w+['"]\)|Plugins\[\s*['"]\w+['"]\s*\])[^;,\n]*)/g)) for (const w of wtyczkiW(m[2])) dodaj(m[1], w, m.index);
    // adapter: { plugin: () => …Plugins.X } przekazany dalej i wołany jako o.plugin()
    const klucz = new Map();
    for (const m of s.matchAll(/[{,]\s*(\w+)\s*:\s*(?:\([^)]*\)|\w+)\s*=>\s*([^,}\n]*)/g)) { const w = [...new Set(wtyczkiW(m[2]))]; if (w.length === 1 && wt.has(w[0])) klucz.set(m[1], w[0]); }
    const wtyczkiZ = t => [...wtyczkiW(t), ...[...t.matchAll(/\.(\w+)\(\)/g)].filter(x => klucz.has(x[1])).map(x => klucz.get(x[1]))];
    // funkcja zwracająca wtyczkę: function x() {…} / const x = () => …
    for (const m of s.matchAll(/function\s+(\w+)\s*\([^)]*\)\s*\{|\b(\w+)\s*=\s*(?:\([^)]*\)|\w+)\s*=>\s*/g)) {
      const n = m[1] || m[2], i = m.index + m[0].length - (m[1] ? 1 : 0), t = s[i] === '{' || s[i] === '(' ? blok(s, i) : s.slice(i, s.indexOf('\n', i) < 0 ? undefined : s.indexOf('\n', i));
      const w = [...new Set(wtyczkiZ(t))]; if (w.length === 1 && /return|=>/.test(m[0] + t.slice(0, 400))) dodaj(n, w[0]);
    }
    // fabryka z nazwą w parametrze: function plugin(name) { … Plugins[name] … registerPlugin(name) } → x = plugin("Vantify")
    for (const m of s.matchAll(/function\s+(\w+)\s*\(\s*(\w+)\s*\)\s*\{/g)) {
      const t = blok(s, m.index + m[0].length - 1);
      if (!new RegExp('Plugins\\[\\s*' + m[2] + '\\s*\\]|registerPlugin\\(\\s*' + m[2] + '\\s*\\)').test(t)) continue;
      for (const c of s.matchAll(new RegExp('\\b(\\w+)\\s*=(?!=)\\s*' + m[1] + '\\(\\s*[\'"](\\w+)[\'"]\\s*\\)', 'g'))) dodaj(c[1], c[2], c.index);
    }
    // zmienna = funkcjaZWtyczką()  (np. var p = api(); p.check())
    for (const m of s.matchAll(/\b(\w+)\s*=(?!=)\s*(\w+)\(\)/g)) for (const w of uchwytW(m[2], m.index)) dodaj(m[1], w, m.index);
    const wolanie = (w, met, i) => { const j = s.slice(i).search(/\S/) + i, par = s[j] === '{' ? klucze(blok(s, j)).map(k => k.klucz) : null; out.push({ plik: p, wtyczki: w, metoda: met, par }); };
    for (const m of s.matchAll(/Plugins(?:\?\.|\.)([A-Z]\w*)\??\.(\w+)\s*\(/g)) if (wt.has(m[1])) wolanie([m[1]], m[2], m.index + m[0].length);
    for (const m of s.matchAll(/\b(\w+)(?:\(\))?\??\.(\w+)\s*\(/g)) { const u = uchwytW(m[1], m.index); if (u.length && !/^(then|catch|finally|call|apply|bind)$/.test(m[2])) wolanie(u, m[2], m.index + m[0].length); }
  }
  return out;
}

// ---------- atrapy w testach ----------
function atrapy(wt) {
  const out = [], nieznane = [];
  for (const p of pliki('app/tests', /\.cjs$/)) {
    if (/wtyczki-kontrakt/.test(p)) continue;
    const s = czytaj(p), obiekt = (i) => { const j = s.slice(i).search(/\S/) + i; return s[j] === '{' ? blok(s, j) : null; };
    const zmienna = n => { const m = new RegExp('\\b' + n + '\\s*=\\s*(?=\\{)').exec(s); return m ? blok(s, m.index + m[0].length) : null; };
    const dodaj = (w, o) => { if (!o) return; for (const k of klucze(o)) { const r = /^\s*:\s*(?:async\s*)?(?:\([^)]*\)|\w+)\s*=>\s*(?:\(|Promise\.resolve\()\s*(\{)|return\s*(?:Promise\.resolve\(\s*)?(\{)/.exec(k.tresc); out.push({ plik: p, wtyczka: w, metoda: k.klucz, zwrot: r ? klucze(blok(k.tresc, r.index + r[0].length - 1)).map(x => x.klucz) : [] }); } };
    // obiekt przypisany do nazwy wtyczki: Nazwa: {…} / .Nazwa = {…} / Nazwa: zmienna / .Nazwa = zmienna
    const kod = bezNapisow(s);
    for (const m of kod.matchAll(/(?:\b|\.)([A-Z]\w*)\s*(?::|=(?!=))\s*(?=[{\w])/g)) {
      if (!wt.has(m[1])) continue; const i = m.index + m[0].length;
      if (s[i] === '{') dodaj(m[1], blok(s, i)); else { const v = /^\w+/.exec(s.slice(i))[0]; if (!/^(new|async|function|await|null|undefined|true|false)$/.test(v)) dodaj(m[1], zmienna(v)); }
    }
    // klucze literału Plugins: {…} muszą być nazwami prawdziwych wtyczek
    for (const m of kod.matchAll(/Plugins\s*:\s*(?=\{)/g)) for (const k of klucze(obiekt(m.index + m[0].length))) if (!wt.has(k.klucz)) nieznane.push({ plik: p, wtyczka: k.klucz });
  }
  return { out, nieznane };
}

test('kontrakt wtyczek JS ↔ Java/Kotlin (plan audytu 1.7)', () => {
  const wt = natywne(), roz = new Map(), dodaj = (id, opis) => roz.set(id, roz.has(id) ? roz.get(id) + '; ' + opis : opis);
  const natywnych = [...wt.values()].filter(w => w.natywna);
  assert.ok(natywnych.length >= 11, 'znaleziono tylko ' + natywnych.length + ' wtyczek natywnych');
  for (const [n, w] of wt) { assert.ok(w.metody.size > 0, n + ': brak metod (' + w.plik + ')'); if (!w.zarejestrowana) dodaj('niezarejestrowana:' + n, w.klasa + ' nie jest w MainActivity.registerPlugin'); }
  const wyw = wywolania(wt);
  for (const n of natywnych.map(w => [...wt].find(([, x]) => x === w)[0])) if (!wyw.some(c => c.wtyczki.includes(n))) dodaj('nieuzywana:' + n, n + ': apka nie woła żadnej metody tej wtyczki (kod natywny bez użycia albo wywołanie, którego test nie rozpoznaje)');
  for (const c of wyw) {
    const zMetoda = c.wtyczki.filter(n => wt.get(n).metody.has(c.metoda));
    if (!zMetoda.length) { dodaj('wywolanie:' + c.wtyczki.join('|') + '.' + c.metoda, c.plik); continue; }
    for (const k of c.par || []) if (zMetoda.every(n => { const m = wt.get(n).metody.get(c.metoda); return m && !m.czyta.has(k); })) dodaj('parametr:' + zMetoda.join('|') + '.' + c.metoda + ':' + k, c.plik);
  }
  const { out: at, nieznane } = atrapy(wt);
  for (const a of nieznane) dodaj('atrapa-nieznana:' + a.wtyczka, a.plik);
  for (const a of at) {
    const w = wt.get(a.wtyczka), m = w.metody.get(a.metoda);
    if (!w.metody.has(a.metoda)) { dodaj('atrapa-metoda:' + a.wtyczka + '.' + a.metoda, a.plik); continue; }
    if (m && !m.dowolny) for (const k of a.zwrot) if (!m.zwraca.has(k)) dodaj('atrapa-zwrot:' + a.wtyczka + '.' + a.metoda + ':' + k, a.plik);
  }
  assert.ok(wyw.length >= 20, 'znaleziono tylko ' + wyw.length + ' wywołań wtyczek w apce');
  assert.ok(at.length >= 20, 'znaleziono tylko ' + at.length + ' metod w atrapach testów');
  console.log('kontrakt wtyczek: ' + wt.size + ' wtyczek (' + natywnych.length + ' natywnych), ' + wyw.length + ' wywołań w apce, ' + at.length + ' metod w atrapach testów, rozbieżności: ' + roz.size);
  if (process.env.OEST_DEBUG) console.log(JSON.stringify([...roz].map(([id, reason]) => ({ id, reason })), null, 1), '\nwywołań', wyw.length, 'atrap', at.length);
  const base = JSON.parse(fs.readFileSync(BASELINE, 'utf8')), known = new Set(base.entries.map(e => e.id)), bad = [];
  for (const [k, o] of roz) if (!known.has(k)) bad.push('nowa rozbieżność spoza listy ' + path.basename(BASELINE) + ': ' + k + ' – ' + o);
  for (const k of known) if (!roz.has(k)) bad.push('wpis ' + k + ' z listy ' + path.basename(BASELINE) + ' już nie występuje – usuń go (lista maleje)');
  assert.deepStrictEqual(bad, [], bad.join('\n'));
});
