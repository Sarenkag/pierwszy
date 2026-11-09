// Klocek „O aplikacji” (Grzegorz 09/11/2026): numer apki i historia wszystkich zmian z main.
const test = require("node:test"), assert = require("node:assert/strict");
const fs = require("fs"), os = require("os"), path = require("path"), { execFileSync } = require("child_process");
const load = (f) => { const w = {}; new Function("window", fs.readFileSync(f, "utf8"))(w); return w.OESTWersja; };

test("plik w apce ma historię zmian z numerami PR i datami", () => {
  const v = load(path.join(__dirname, "..", "www", "wersja.js"));
  assert.ok(v.zmiany.length >= 100, "za mało wpisów: " + v.zmiany.length);
  for (const z of v.zmiany) { assert.match(z.d, /^\d{4}-\d\d-\d\d$/); assert.ok(z.t && z.t.length > 3, JSON.stringify(z)); }
  assert.ok(v.zmiany.some((z) => z.pr === 101 && !/\(#101\)/.test(z.t)), "PR scalony jako squash ma numer bez „(#101)” w tytule");
  assert.ok(v.zmiany.some((z) => z.pr === 1), "pierwszy PR jest na liście");
});

test("generator: numer z budowy GitHuba, lista nie ginie bez pełnej historii", () => {
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "wersja-")), "wersja.js");
  fs.copyFileSync(path.join(__dirname, "..", "www", "wersja.js"), out);
  const before = load(out).zmiany.length;
  execFileSync(process.execPath, [path.join(__dirname, "..", "scripts", "wersja.js")], { env: { ...process.env, OEST_WERSJA_OUT: out, APP_VERSION_CODE: "321" } });
  const v = load(out);
  assert.equal(v.numer, "321"); assert.equal(v.nazwa, "0.1.321");
  assert.ok(v.zmiany.length >= before, "lista zmian nie może się skrócić");
});
