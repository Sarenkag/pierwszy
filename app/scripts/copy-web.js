// Kopiuje apkę inspekcji (../../inspekcje) do www/inspekcje, żeby była w paczce Androida.
// Uruchamiane przed `cap sync` (npm run sync) i w budowaniu na GitHubie.
const fs = require("fs");
const path = require("path");

const src = path.join(__dirname, "..", "..", "inspekcje");
const dst = path.join(__dirname, "..", "www", "inspekcje");
const skip = new Set(["Code.gs.txt", "README.md"]); // skrypt Google i instrukcja nie są częścią apki

fs.rmSync(dst, { recursive: true, force: true });
fs.mkdirSync(dst, { recursive: true });
for (const f of fs.readdirSync(src)) {
  if (skip.has(f)) continue;
  fs.copyFileSync(path.join(src, f), path.join(dst, f));
}
console.log("inspekcje → www/inspekcje");
