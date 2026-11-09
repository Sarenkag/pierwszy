// Klocek „O aplikacji” (Grzegorz 09/11/2026): numer wersji, data budowy i historia wszystkich zmian w main.
// Uruchamiane w `npm run sync` (budowa APK na GitHubie). Zapisuje www/wersja.js.
// Historia = każdy wpis w main (git log --first-parent): scalony PR (numer + tytuł) albo bezpośredni commit.
// Bez pełnej historii gita (płytka kopia) lista zmian zostaje z poprzedniego pliku – nie ucinamy jej.
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const out = process.env.OEST_WERSJA_OUT || path.join(__dirname, "..", "www", "wersja.js");
const git = (...a) => execFileSync("git", a, { cwd: path.join(__dirname, ".."), encoding: "utf8" }).trim();

function previous() {
  try { const w = {}; new Function("window", fs.readFileSync(out, "utf8"))(w); return w.OESTWersja || null; } catch (_) { return null; }
}

function history() {
  const SEP = "\u001f", END = "\u001e";
  const raw = git("log", "--first-parent", "--format=%ad" + SEP + "%s" + SEP + "%b" + END, "--date=short");
  return raw.split(END).map((r) => r.trim()).filter(Boolean).map((r) => {
    const [d, s, b] = r.split(SEP);
    const m = /^Merge pull request #(\d+) from /.exec(s);
    if (m) {
      const t = (b || "").split("\n").map((x) => x.trim()).filter(Boolean)[0] || "";
      return { d, pr: +m[1], t };
    }
    const q = /^(.*?)\s*\(#(\d+)\)$/.exec(s); // PR scalony jako squash: „Tytuł (#101)”
    if (q) return { d, pr: +q[2], t: q[1] };
    return { d, t: s };
  });
}

const prev = previous();
let shallow = true, sha = null, zmiany = prev ? prev.zmiany : [];
try {
  sha = git("rev-parse", "--short=7", "HEAD");
  shallow = git("rev-parse", "--is-shallow-repository") === "true";
  if (!shallow) zmiany = history();
} catch (_) { /* brak gita: zostaje poprzednia lista */ }

const numer = process.env.APP_VERSION_CODE || null;
const now = new Date();
const data = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0");
const v = { numer, nazwa: numer ? "0.1." + numer : null, data, sha, zmiany };
fs.writeFileSync(out, "// Plik generowany przez app/scripts/wersja.js – nie edytować ręcznie.\nwindow.OESTWersja = " + JSON.stringify(v, null, 0).replace(/},\{/g, "},\n{") + ";\n");
console.log("wersja.js: " + (v.nazwa || "bez numeru") + ", " + zmiany.length + " zmian" + (shallow ? " (płytka kopia gita – lista z poprzedniego pliku)" : ""));
