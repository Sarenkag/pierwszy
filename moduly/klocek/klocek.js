// Moduł klocka (moduly/klocek) – dane klocka listy wspólne dla całej apki (Grzegorz 04/11/2026).
// Klocek rysuje szkielet Ionic + Vue (moduly/szkielet/src/czesci/Klocek.vue); tu zostały tylko teksty, które liczą ekrany:
//   OESTKlocek.termin(due, left, done) → { text, date, rest, tone } – „dd/mm za 3D”, „dziś”, „jutro”, „−2D” (tone: "red" | "jutro" | "")
//   OESTKlocek.czest(f)                → częstotliwość w 3 znakach (12M = Y)
// Dawne rysowanie klocka z HTML (html, inspekcja, infoNode, przytrzymaj, CSS) usunięte 27/11/2026 – nikt go już nie wołał.
(function (w) {
  "use strict";
  function termin(due, left, done) {
    if (!due) return { text: "–", date: "", rest: "", tone: "" };
    var date = w.OESTNarzedzia.dmm(due), rest = "", tone = "";
    if (done || left == null) rest = "";
    else if (left < 0) { rest = "−" + (-left > 30 ? Math.floor(-left / 30) + "M" : -left + "D"); tone = "red"; }
    else if (left === 0) { rest = w.OESTT("dziś", "today"); tone = "red"; }
    else if (left === 1) { rest = w.OESTT("jutro", "tomorrow"); tone = "jutro"; }
    else rest = w.OESTT("za ", "in ") + (left > 30 ? Math.floor(left / 30) + "M" : left + "D");
    return { text: date + (rest ? " " + rest : ""), date: date, rest: rest, tone: tone };
  }
  function czest(f) { return f === "12M" ? "Y" : String(f || "").slice(0, 3); }
  w.OESTKlocek = { termin: termin, czest: czest };
})(typeof window !== "undefined" ? window : globalThis);
