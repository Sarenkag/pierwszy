// Zapis „Zbadaj” (Grzegorz 10/11/2026): wstrzykiwany przez VantifyActivity do stron Vantify otwartych w apce.
// Zapisuje, jakie adresy Vantify wywołuje i jaki KSZTAŁT mają odpowiedzi (klucze, liczby, typy), żeby ustalić,
// jak apka może sama pobierać zlecenia. NIE zapisuje: haseł, tokenów, nagłówków z wartościami, treści wysyłanych
// formularzy (tylko nazwy pól), e-maili, telefonów ani danych osób. Zapis zostaje w telefonie, dopóki Grzegorz go nie udostępni.
// W przeglądarce (testy) eksportuje funkcje czyszczące przez module.exports.
(function (g) {
  var SECRET = /pass|token|secret|auth|session|cookie|sig|key|code|otp|csrf/i;
  var PERSON = /name|email|mail|phone|mobile|tel|contact|reporter|operative|approver|user|person|address|signature|search|query|^q$|text|comment|note|desc/i;
  // Lista dozwolonych (przegląd Codex #132): zapisujemy tylko to, co na pewno nie jest daną osoby ani sekretem.
  // Parametry adresu: tylko techniczne nazwy i krótkie wartości (liczby, daty, proste słowa); reszta „…”.
  var SAFE_Q = /^(page|pagesize|size|limit|offset|skip|take|top|sort|sortby|order|orderby|dir|direction|status|statuses|type|jobtype|types|from|to|start|end|date|datefrom|dateto|siteid|site|sites|buildingid|frequency|priority|view|tab|format|include|expand|fields|lang|version|v|_)$/i;
  var NUM = /^-?\d+(\.\d+)?$/, DATE = /^\d{4}-\d\d-\d\d([T ][\d:.]+Z?)?([+-]\d\d:?\d\d)?$/;
  // Wartości tekstowe: tylko liczby, daty i pola wyliczeniowe (status, typ, częstotliwość…) jako krótkie słowo.
  var ENUM_K = /^(status|state|type|jobtype|kind|frequency|priority|category|format|method|unit|currency|sortorder|order|direction)$/i;
  function word(v) { return /^[A-Za-z][A-Za-z_ -]{0,24}$/.test(v); }
  function seg(x) { return /@|%40|\s|%20/.test(x) || x.length > 40 ? "…" : x; }
  function url(u, base) {
    try {
      var x = new URL(String(u), base || (g.location && g.location.href) || "https://x/");
      var q = [];
      x.searchParams.forEach(function (v, k) { q.push(encodeURIComponent(k) + "=" + (!SECRET.test(k) && SAFE_Q.test(k) && (NUM.test(v) || DATE.test(v) || word(v) || /^[\d,]+$/.test(v)) ? encodeURIComponent(v).slice(0, 40) : "…")); });
      var h = x.hash ? x.hash.split("?")[0].split("/").map(seg).join("/") : "";
      return x.origin + x.pathname.split("/").map(seg).join("/") + (q.length ? "?" + q.join("&") : "") + h;
    } catch (e) { return "(adres)"; }
  }
  function val(v, k) {
    if (typeof v === "string") {
      if (DATE.test(v) || NUM.test(v)) return v;
      if (ENUM_K.test(k || "") && word(v)) return v;
      return "(tekst " + v.length + ")";
    }
    return typeof v === "number" || typeof v === "boolean" || v === null ? v : typeof v;
  }
  // kształt danych: klucze, długości list, liczby, daty i pola wyliczeniowe; keysOnly = bez wartości.
  // Pod polem osoby (contact, reporter…) zapisujemy tylko nazwy kluczy, bez żadnych wartości.
  function shape(o, d, keysOnly, k) {
    if (d > 4) return "…";
    if (Array.isArray(o)) return { n: o.length, item: o.length ? shape(o[0], d + 1, keysOnly, k) : null };
    if (o && typeof o === "object") {
      var r = {};
      Object.keys(o).slice(0, 80).forEach(function (c) {
        r[c] = SECRET.test(c) ? "(ukryte)" : PERSON.test(c) ? (o[c] && typeof o[c] === "object" ? shape(o[c], d + 1, true, c) : "(osoba)") : shape(o[c], d + 1, keysOnly, c);
      });
      return r;
    }
    return keysOnly ? typeof o : val(o, k);
  }
  function body(text, keysOnly) {
    if (text == null || text === "") return null;
    if (typeof text !== "string") return { type: Object.prototype.toString.call(text).slice(8, -1) };
    try { return shape(JSON.parse(text), 0, keysOnly); } catch (e) {
      if (keysOnly && /=/.test(text)) return { form: text.split("&").map(function (p) { try { return decodeURIComponent(p.split("=")[0]); } catch (x) { return "?"; } }).slice(0, 40) };
      return { text: text.length }; // nie-JSON: tylko długość, bez treści
    }
  }
  var api = { url: url, shape: shape, body: body };
  if (typeof window === "undefined" && typeof module === "object" && module.exports) { module.exports = api; return; }
  if (g.__oestRejestr) return; g.__oestRejestr = api;
  var B = g.OESTVantifyBridge;
  function send(e) { try { if (B) B.log(JSON.stringify(e)); } catch (x) {} }
  var X = g.XMLHttpRequest && g.XMLHttpRequest.prototype;
  if (X) {
    var open = X.open, sendX = X.send, setH = X.setRequestHeader;
    X.open = function (m, u) { this.__r = { m: m, u: u, h: [] }; return open.apply(this, arguments); };
    X.setRequestHeader = function (k) { if (this.__r) this.__r.h.push(k); return setH.apply(this, arguments); };
    X.send = function (b) {
      var x = this, r = x.__r;
      // jednorazowo: ten sam obiekt XHR może być użyty ponownie dla innego adresu
      if (r) x.addEventListener("loadend", function () {
        var ct = "", res = null; try { ct = x.getResponseHeader("content-type") || ""; } catch (e) {}
        try { if (!x.responseType || x.responseType === "text") res = /json/.test(ct) ? body(x.responseText, false) : { text: (x.responseText || "").length }; else if (x.responseType === "json") res = shape(x.response, 0, false); } catch (e) {}
        send({ t: Date.now(), k: "xhr", m: r.m, u: url(r.u), st: x.status, ct: ct.split(";")[0], h: r.h, req: body(b, true), res: res });
      }, { once: true });
      return sendX.apply(this, arguments);
    };
  }
  if (g.fetch) {
    var f0 = g.fetch;
    g.fetch = function (input, init) {
      var u = typeof input === "string" ? input : input && input.url, m = (init && init.method) || (input && input.method) || "GET";
      var h = []; try { var H = new Headers((init && init.headers) || (input && input.headers) || {}); H.forEach(function (v, k) { h.push(k); }); } catch (e) {}
      return f0.apply(this, arguments).then(function (resp) {
        var ct = (resp.headers.get("content-type") || "").split(";")[0];
        try { resp.clone().text().then(function (t) { send({ t: Date.now(), k: "fetch", m: m, u: url(u), st: resp.status, ct: ct, h: h, req: body(init && init.body, true), res: /json/.test(ct) ? body(t, false) : { text: t.length } }); }); } catch (e) {}
        return resp;
      });
    };
  }
  function nav() { send({ t: Date.now(), k: "nav", u: url(g.location.href) }); }
  g.addEventListener("hashchange", nav); nav();
})(typeof window !== "undefined" ? window : this);
