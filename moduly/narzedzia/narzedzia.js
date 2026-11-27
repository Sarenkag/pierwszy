// Moduł narzędzi (moduly/narzedzia) – drobne funkcje bez stanu, jedno miejsce (ZASADY R14, karta K01 21/11/2026).
// Przeniesione 1:1 z sekcji „pomocnicze” formularza inspekcji; działają tak samo jak tam.
//
//   OESTNarzedzia.pad(3)              → "03"
//   OESTNarzedzia.data(d)             → "dd/mm/rrrr"
//   OESTNarzedzia.godzina(d)          → "gg:mm"
//   OESTNarzedzia.dzienIso(d)         → "rrrr-mm-dd" (czas lokalny)
//   OESTNarzedzia.dmm(d)              → "dd/mm"
//   OESTNarzedzia.dmmrrrr(iso)        → "dd/mm/rrrr" (z napisu rrrr-mm-dd)
//   OESTNarzedzia.miesiacRok(d, jezyk) → pełna nazwa miesiąca + rok ("listopad 2026" / "November 2026")
//   OESTNarzedzia.dmmrrrrhmm(iso)     → "dd/mm/rrrr gg:mm" (z napisu ISO, czas lokalny)
//   OESTNarzedzia.b64ToBytes(b64)     → Uint8Array;  bytesToB64(u8) → base64 (w kawałkach po 32 KB)
//   OESTNarzedzia.kb(n)               → "2 KB" / "3.0 MB"
//   OESTNarzedzia.blobB64(blob)      → Promise<base64 bez nagłówka data:> (FileReader)
//   OESTNarzedzia.esc(s)              → tekst bezpieczny w HTML (& < > " ' → encje; null/undefined → "")
//   OESTNarzedzia.kopiuj(tekst)      → Promise: tekst w schowku telefonu
//   OESTNarzedzia.udostepnij(tekst, tytul) → Promise: systemowe „Udostępnij” Androida (sam tekst, wtyczka ReportShare.text)
// esc: jedno miejsce dla całej apki (audyt nr 53, 22/11/2026) – zastąpiła 27 kopii w ekranach i modułach.
(function (w) {
  "use strict";
  function pad(n) { return String(n).padStart(2, "0"); }
  function data(d) { return pad(d.getDate()) + "/" + pad(d.getMonth() + 1) + "/" + d.getFullYear(); }
  function godzina(d) { return pad(d.getHours()) + ":" + pad(d.getMinutes()); }
  function dzienIso(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function dmm(d) { return pad(d.getDate()) + "/" + pad(d.getMonth() + 1); }
  function dmmrrrr(iso) { var m = /^(\d{4})-(\d\d)-(\d\d)$/.exec(String(iso || "")); return m ? m[3] + "/" + m[2] + "/" + m[1] : ""; }
  function miesiacRok(d, jezyk) { return d.toLocaleDateString(jezyk === "en" ? "en-GB" : "pl-PL", { month: "long", year: "numeric" }); }
  function dmmrrrrhmm(iso) { var d = new Date(iso); if (isNaN(d)) return ""; return dmmrrrr(dzienIso(d)) + " " + godzina(d); }
  function b64ToBytes(b64) { var s = atob(b64), a = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); return a; }
  function bytesToB64(u8) { var s = "", C = 0x8000; for (var i = 0; i < u8.length; i += C) s += String.fromCharCode.apply(null, u8.subarray(i, i + C)); return btoa(s); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function kb(n) { return n < 1024 * 1024 ? Math.round(n / 1024) + " KB" : (n / 1048576).toFixed(1) + " MB"; }
  function blobB64(blob) { return new Promise(function (res, rej) { var r = new FileReader(); r.onload = function () { res(String(r.result).split(",")[1]); }; r.onerror = rej; r.readAsDataURL(blob); }); }
  function kopiuj(t) {
    var c = w.navigator && w.navigator.clipboard;
    return c && c.writeText ? c.writeText(String(t || "")) : Promise.reject(Error("COPY_UNAVAILABLE"));
  }
  function udostepnij(t, tytul) {
    var C = w.Capacitor;
    if (!(C && C.isNativePlatform && C.isNativePlatform() && C.registerPlugin)) return Promise.reject(Error("SHARE_UNAVAILABLE"));
    return C.registerPlugin("ReportShare").text({ body: String(t || ""), subject: tytul || "OEST" });
  }
  w.OESTNarzedzia = { kopiuj: kopiuj, udostepnij: udostepnij, blobB64: blobB64, pad: pad, data: data, godzina: godzina, dzienIso: dzienIso, dmm: dmm, dmmrrrr: dmmrrrr, miesiacRok: miesiacRok, dmmrrrrhmm: dmmrrrrhmm, b64ToBytes: b64ToBytes, bytesToB64: bytesToB64, kb: kb, esc: esc };
  if (typeof module === "object" && module.exports) module.exports = w.OESTNarzedzia;
})(typeof window !== "undefined" ? window : globalThis);
