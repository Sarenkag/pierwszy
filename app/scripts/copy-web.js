// Kopiuje apkę inspekcji (../../inspekcje) do www/inspekcje, żeby była w paczce Androida.
// Uruchamiane przed `cap sync` (npm run sync) i w budowaniu na GitHubie.
// Biblioteki raportu (Word/PDF) idą do paczki z node_modules zamiast z CDN, żeby raport powstawał bez internetu.
const fs = require("fs");
const path = require("path");

const src = path.join(__dirname, "..", "..", "inspekcje");
const dst = path.join(__dirname, "..", "www", "inspekcje");
const skip = new Set(["Code.gs.txt", "README.md"]); // skrypt Google i instrukcja nie są częścią apki
const libs = {
  "https://cdn.jsdelivr.net/npm/pizzip@3.3.0/dist/pizzip.min.js": "pizzip/dist/pizzip.min.js",
  "https://cdn.jsdelivr.net/npm/docxtemplater@3.71.0/build/docxtemplater.min.js": "docxtemplater/build/docxtemplater.min.js",
  "https://cdn.jsdelivr.net/npm/jspdf@4.2.1/dist/jspdf.umd.min.js": "jspdf/dist/jspdf.umd.min.js"
};

fs.rmSync(dst, { recursive: true, force: true });
fs.mkdirSync(path.join(dst, "lib"), { recursive: true });
for (const f of fs.readdirSync(src)) {
  if (skip.has(f)) continue;
  fs.copyFileSync(path.join(src, f), path.join(dst, f));
}
for (const file of Object.values(libs)) fs.copyFileSync(require.resolve(file), path.join(dst, "lib", path.basename(file)));
// strona i service worker (lista plików offline) wskazują na kopie lokalne
for (const f of ["index.html", "sw.js"]) {
  const p = path.join(dst, f);
  let txt = fs.readFileSync(p, "utf8");
  for (const [url, file] of Object.entries(libs)) {
    if (f === "index.html" && !txt.includes(url)) throw new Error("Brak " + url + " w inspekcje/index.html – zaktualizuj listę w copy-web.js");
    txt = txt.split(url).join("lib/" + path.basename(file));
  }
  fs.writeFileSync(p, txt);
}
// moduły wielokrotnego użytku (../../moduly) → www/moduly; inspekcje sięgają do nich przez ../moduly/
const modSrc = path.join(__dirname, "..", "..", "moduly"), modDst = path.join(__dirname, "..", "www", "moduly");
fs.rmSync(modDst, { recursive: true, force: true });
fs.cpSync(modSrc, modDst, { recursive: true, filter: (f) => !/\.md$/i.test(f) });
console.log("inspekcje → www/inspekcje (biblioteki raportu lokalnie), moduly → www/moduly");
