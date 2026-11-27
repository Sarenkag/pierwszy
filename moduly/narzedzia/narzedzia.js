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
//   OESTNarzedzia.b64url(u8)         → base64url bez „=” (Gmail raw)
//   OESTNarzedzia.mb(n, jezyk)        → "12,3" (pl) / "12.3" (en) – megabajty z jednym miejscem po przecinku
//   OESTNarzedzia.dzis()              → Date: dziś o północy (czas lokalny)
//   OESTNarzedzia.dataOk(s)           → true, gdy s to prawdziwa data "rrrr-mm-dd"
//   OESTNarzedzia.dodajDni(iso, n)    → "rrrr-mm-dd" przesunięte o n dni (kalendarzowo, bez stref czasu)
//   OESTNarzedzia.dodajMiesiace(iso, n) → "rrrr-mm-dd" o n miesięcy dalej; 31.01 + 1 → 28/29.02 (ostatni dzień miesiąca)
//   OESTNarzedzia.czas(ms)            → "m:ss" (długość nagrania)
//   OESTNarzedzia.email(s)            → true, gdy s to jeden poprawny adres e-mail
//   OESTNarzedzia.nazwaPliku(s, max)  → nazwa bezpieczna dla Androida i Dysku (bez / \ : * ? " < > | i znaków sterujących)
//   OESTNarzedzia.online() / wifi()   → stan sieci (jedno miejsce; wifi: tylko Wi‑Fi/kabel, nieznany typ = nie)
//   OESTNarzedzia.poKolei()           → funkcja serial(fn): zadania jedno po drugim (błąd jednego nie blokuje następnych)
//   OESTNarzedzia.skrot(tekst)       → krótki odcisk tekstu (djb2, base36) – „czy coś się zmieniło”; zapisany w mailSig, więc bez zmian algorytmu
//   OESTNarzedzia.sha256(blob)       → Promise<skrót SHA-256 jako 64 znaki hex> (sprawdzanie zdjęć przy imporcie)
//   OESTNarzedzia.ponadLimit(lista, { wg, limit, rozmiar, zostaw }) → { usun: [id], suma } – od najstarszych (pole wg), aż suma ≤ limit;
//                                     zostaw(r) = true → nie znika (raporty i zdjęcia na telefonie / na Dysku)
//   OESTNarzedzia.folderyDysku(dysk, { id, zapomnij }) → sciezka(['Tower A', 'PPM']) → Promise<id folderu> (tworzy brakujące; folder
//                                     główny skasowany na Dysku (404) = zapomnij() i jeszcze raz) – raporty i zdjęcia
//   OESTNarzedzia.baza(indexedDB, nazwa, utworz(db), kodBledu) → db() → Promise<IDBDatabase> – jedno otwarcie bazy w telefonie
//                                     (wersja 1; utworz = magazyny przy pierwszym otwarciu; błąd = następne db() próbuje od nowa)
//   OESTNarzedzia.DOCX                → typ pliku Word (.docx)
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
  function b64url(u8) { return bytesToB64(u8).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
  function mb(n, jezyk) { return (Number(n || 0) / 1048576).toLocaleString(jezyk === "en" ? "en-GB" : "pl-PL", { minimumFractionDigits: 1, maximumFractionDigits: 1, useGrouping: false }); }
  function dzis() { var t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate()); }
  var DZIEN = 86400000;
  function dataOk(s) { return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s; }
  function dodajDni(iso, n) { return new Date(Date.parse(iso + "T00:00:00Z") + n * DZIEN).toISOString().slice(0, 10); }
  function dodajMiesiace(iso, n) {
    var d = new Date(iso + "T00:00:00Z"), dzien = d.getUTCDate();
    d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + n);
    d.setUTCDate(Math.min(dzien, new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()));
    return d.toISOString().slice(0, 10);
  }
  function czas(ms) { var s = Math.floor((ms || 0) / 1000); return Math.floor(s / 60) + ":" + pad(s % 60); }
  var EMAIL = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/; // jeden adres: bez spacji, przecinka, średnika i < > (nagłówek maila)
  function email(s) { return EMAIL.test(String(s || "")); }
  function nazwaPliku(s, max) { return String(s || "").replace(/[\\/:*?"<>|\u0000-\u001f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max || 120); }
  function online() { return !(w.navigator && w.navigator.onLine === false); }
  function wifi() { var c = w.navigator && w.navigator.connection; return !!(c && (c.type === "wifi" || c.type === "ethernet")); }
  function poKolei() { var chain = Promise.resolve(); return function (fn) { var p = chain.then(fn); chain = p.catch(function () {}); return p; }; }
  function skrot(t) { var h = 5381; for (var i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }
  function sha256(blob) { return blob.arrayBuffer().then(function (b) { return crypto.subtle.digest("SHA-256", b); }).then(function (h) { return Array.from(new Uint8Array(h), function (x) { return x.toString(16).padStart(2, "0"); }).join(""); }); }
  function ponadLimit(lista, o) {
    var suma = 0, usun = [];
    lista.forEach(function (r) { suma += o.rozmiar(r) || 0; });
    lista.slice().sort(function (a, b) { return a[o.wg] < b[o.wg] ? -1 : a[o.wg] > b[o.wg] ? 1 : 0; }).forEach(function (r) {
      if (suma <= o.limit || (o.zostaw && o.zostaw(r))) return;
      usun.push(r.id); suma -= o.rozmiar(r) || 0;
    });
    return { usun: usun, suma: suma };
  }
  function folderyDysku(dysk, korzen) {
    var znane = {}, maKorzen = false;
    function idz(czesci) {
      return Promise.resolve(korzen.id()).then(function (id) {
        maKorzen = true;
        var klucz = "", p = Promise.resolve(id);
        czesci.forEach(function (nazwa) {
          klucz += "/" + nazwa; var k = klucz;
          p = p.then(function (rodzic) { return znane[k] || Promise.resolve(dysk.ensureFolder(nazwa, rodzic)).then(function (f) { return (znane[k] = f.id); }); });
        });
        return p;
      });
    }
    return function (czesci) {
      return idz(czesci).catch(function (e) {
        if (!maKorzen || !/404/.test(String(e && e.message))) throw e;
        korzen.zapomnij(); znane = {}; maKorzen = false; return idz(czesci);
      });
    };
  }
  function baza(idb, nazwa, utworz, kod) {
    var p = null;
    return function () {
      if (!p) p = new Promise(function (ok, zle) {
        if (!idb) return zle(Error(kod || "INDEXEDDB_UNAVAILABLE"));
        var r = idb.open(nazwa, 1);
        r.onupgradeneeded = function () { utworz(r.result); };
        r.onsuccess = function () { ok(r.result); };
        r.onerror = function () { zle(r.error || Error(kod || "INDEXEDDB_UNAVAILABLE")); };
        r.onblocked = function () { zle(Error("INDEXEDDB_BLOCKED")); };
      }).catch(function (e) { p = null; throw e; });
      return p;
    };
  }
  var DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
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
  w.OESTNarzedzia = { kopiuj: kopiuj, udostepnij: udostepnij, blobB64: blobB64, pad: pad, data: data, godzina: godzina, dzienIso: dzienIso, dmm: dmm, dmmrrrr: dmmrrrr, miesiacRok: miesiacRok, dmmrrrrhmm: dmmrrrrhmm, b64ToBytes: b64ToBytes, bytesToB64: bytesToB64, b64url: b64url, kb: kb, mb: mb, esc: esc,
    dzis: dzis, dataOk: dataOk, dodajDni: dodajDni, dodajMiesiace: dodajMiesiace, czas: czas, email: email, nazwaPliku: nazwaPliku,
    online: online, wifi: wifi, poKolei: poKolei, baza: baza, ponadLimit: ponadLimit, folderyDysku: folderyDysku, skrot: skrot, sha256: sha256, DOCX: DOCX };
  if (typeof module === "object" && module.exports) module.exports = w.OESTNarzedzia;
})(typeof window !== "undefined" ? window : globalThis);
