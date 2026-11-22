// Moduł narzędzi (moduly/narzedzia) – drobne funkcje bez stanu, jedno miejsce (ZASADY R14, karta K01 21/11/2026).
// Przeniesione 1:1 z sekcji „pomocnicze” formularza inspekcji; działają tak samo jak tam.
//
//   OESTNarzedzia.pad(3)              → "03"
//   OESTNarzedzia.data(d)             → "dd/mm/rrrr"
//   OESTNarzedzia.godzina(d)          → "gg:mm"
//   OESTNarzedzia.dzienIso(d)         → "rrrr-mm-dd" (czas lokalny)
//   OESTNarzedzia.b64ToBytes(b64)     → Uint8Array;  bytesToB64(u8) → base64 (w kawałkach po 32 KB)
//   OESTNarzedzia.kb(n)               → "2 KB" / "3.0 MB"
//   OESTNarzedzia.esc(s)              → tekst bezpieczny w HTML (& < > " ' → encje; null/undefined → "")
// esc: jedno miejsce dla całej apki (audyt nr 53, 22/11/2026) – zastąpiła 27 kopii w ekranach i modułach.
(function (w) {
  "use strict";
  function pad(n) { return String(n).padStart(2, "0"); }
  function data(d) { return pad(d.getDate()) + "/" + pad(d.getMonth() + 1) + "/" + d.getFullYear(); }
  function godzina(d) { return pad(d.getHours()) + ":" + pad(d.getMinutes()); }
  function dzienIso(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function b64ToBytes(b64) { var s = atob(b64), a = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); return a; }
  function bytesToB64(u8) { var s = "", C = 0x8000; for (var i = 0; i < u8.length; i += C) s += String.fromCharCode.apply(null, u8.subarray(i, i + C)); return btoa(s); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function kb(n) { return n < 1024 * 1024 ? Math.round(n / 1024) + " KB" : (n / 1048576).toFixed(1) + " MB"; }
  w.OESTNarzedzia = { pad: pad, data: data, godzina: godzina, dzienIso: dzienIso, b64ToBytes: b64ToBytes, bytesToB64: bytesToB64, kb: kb, esc: esc };
})(typeof window !== "undefined" ? window : globalThis);
