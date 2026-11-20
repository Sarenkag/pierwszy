// Błąd w konsoli strony wywala test (plan architektury 19/11/2026, P0-2, punkt #33; ZASADY.md R21/R23).
// Ładowany przez run-gate.cjs (node -r) do KAŻDEGO testu przeglądarkowego – bez zmian w samych testach.
// Podpina się pod Playwright: każda strona, którą test otwiera, zgłasza tu console.error i nieobsłużone wyjątki (pageerror).
// Na końcu testu: jest choć jeden błąd → wypisuje wszystkie i kończy kodem 1 (FAIL). Bez listy wyjątków.
// Testy działają bez internetu (jak „testy nie zależą od czasu”): zapytania poza serwer testu (127.0.0.1/localhost) są
// blokowane, zanim wyjdą z przeglądarki. Własne podstawienia testu (page.route/context.route) mają pierwszeństwo, bo test
// rejestruje je później. Komunikat Chrome „Failed to load resource” o TAKIM zablokowanym adresie to skutek blokady, nie
// błąd apki, więc się nie liczy; ten sam komunikat o pliku z serwera testu (np. brak pliku, 404) liczy się jak każdy błąd.
'use strict';
const Module = require('node:module');
const bledy = [];
const MAX = 50;
const LOKALNY = /^(?:https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?\/|data:|blob:|about:|file:)/;
function note(kind, text, url) { if (bledy.length < MAX) bledy.push({ kind, text: String(text).slice(0, 400), url: url || '' }); else bledy.length++; }
function attach(page) {
  if (!page || page.__oestKonsola) return page;
  page.__oestKonsola = 1;
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const l = m.location() || {};
    if (/^Failed to load resource\b/.test(m.text()) && l.url && !LOKALNY.test(l.url)) return; // zablokowany internet (wyżej)
    note('console.error', m.text(), l.url ? l.url + ':' + l.lineNumber : page.url());
  });
  // about:blank to pusta karta przed wejściem na stronę testu – nie ma tam kodu apki (np. skrypt startowy testu bez localStorage)
  page.on('pageerror', e => { if (page.url() === 'about:blank') return; note('wyjątek', (e && (e.stack || e.message)) || e, page.url()); });
  return page;
}
async function ctx(c) {
  if (!c || c.__oestKonsola) return c;
  c.__oestKonsola = 1;
  try { c.pages().forEach(attach); } catch {}
  c.on('page', attach);
  await c.route(u => !LOKALNY.test(String(u)), r => r.abort('blockedbyclient'));
  return c;
}
function browser(b) {
  if (!b || b.__oestKonsola) return b;
  b.__oestKonsola = 1;
  const nc = b.newContext.bind(b), np = b.newPage.bind(b);
  b.newContext = async (...a) => ctx(await nc(...a));
  b.newPage = async (...a) => { const p = await np(...a); attach(p); await ctx(p.context()); return p; };
  return b;
}
function patch(pw) {
  for (const name of ['chromium', 'firefox', 'webkit']) {
    const t = pw && pw[name];
    if (!t || t.__oestKonsola) continue;
    t.__oestKonsola = 1;
    const l = t.launch.bind(t), lp = t.launchPersistentContext && t.launchPersistentContext.bind(t);
    t.launch = async (...a) => browser(await l(...a));
    if (lp) t.launchPersistentContext = async (...a) => ctx(await lp(...a));
  }
  return pw;
}
const want = new Set(['playwright', 'playwright-core', process.env.OEST_PLAYWRIGHT_PATH].filter(Boolean));
const load = Module._load;
Module._load = function (request, ...rest) {
  const m = load.call(this, request, ...rest);
  return want.has(request) ? patch(m) : m;
};
process.on('exit', code => {
  if (!bledy.length) return;
  const lista = bledy.filter(Boolean);
  console.error('\nKONSOLA FAIL: ' + bledy.length + ' błędów w konsoli strony (P0-2: każdy błąd w konsoli wywala test, bez listy wyjątków):');
  for (const b of lista) console.error('  [' + b.kind + '] ' + b.text.split('\n')[0] + (b.url ? '  @ ' + b.url : ''));
  if (bledy.length > lista.length) console.error('  … i ' + (bledy.length - lista.length) + ' więcej');
  if (!code) process.exitCode = 1;
});
