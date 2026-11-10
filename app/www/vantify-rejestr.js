// Zapis „Zbadaj” (Grzegorz 10/11/2026): wstrzykiwany przez VantifyActivity do stron Vantify otwartych w apce.
// Zapisuje, jakie adresy Vantify wywołuje i jaki KSZTAŁT mają odpowiedzi (klucze, liczby, typy), żeby ustalić,
// jak apka może sama pobierać zlecenia. NIE zapisuje: haseł, tokenów, nagłówków z wartościami, treści wysyłanych
// formularzy (tylko nazwy pól), e-maili, telefonów ani danych osób. Zapis zostaje w telefonie, dopóki Grzegorz go nie udostępni.
// W przeglądarce (testy) eksportuje funkcje czyszczące przez module.exports.
(function (g) {
  var SECRET = /pass|token|secret|auth|session|cookie|sig|key|code|otp|csrf/i;
  var PERSON = /name|email|mail|phone|mobile|tel|contact|reporter|operative|approver|user|person|address|signature/i;
  function url(u, base) {
    try {
      var x = new URL(String(u), base || (g.location && g.location.href) || "https://x/");
      var q = [];
      x.searchParams.forEach(function (v, k) { q.push(encodeURIComponent(k) + "=" + (SECRET.test(k) ? "…" : encodeURIComponent(v).slice(0, 80))); });
      return x.origin + x.pathname + (q.length ? "?" + q.join("&") : "") + (x.hash ? x.hash.split("?")[0] : "");
    } catch (e) { return String(u).slice(0, 200); }
  }
  function val(v) {
    if (typeof v === "string") {
      if (/@/.test(v)) return "(email)";
      if (/^\+?[\d\s()-]{9,}$/.test(v) && !/^\d{4}-\d\d-\d\d/.test(v)) return "(tel)";
      return v.length > 40 ? v.slice(0, 40) + "…" : v;
    }
    return typeof v === "number" || typeof v === "boolean" || v === null ? v : typeof v;
  }
  // kształt danych: klucze, długości list, przykładowe wartości (bez danych osób i sekretów); keysOnly = bez wartości
  function shape(o, d, keysOnly) {
    if (d > 4) return "…";
    if (Array.isArray(o)) return { n: o.length, item: o.length ? shape(o[0], d + 1, keysOnly) : null };
    if (o && typeof o === "object") {
      var r = {};
      Object.keys(o).slice(0, 80).forEach(function (k) {
        r[k] = SECRET.test(k) ? "(ukryte)" : keysOnly ? (o[k] && typeof o[k] === "object" ? shape(o[k], d + 1, true) : typeof o[k]) : PERSON.test(k) && typeof o[k] !== "object" ? "(osoba)" : shape(o[k], d + 1, false);
      });
      return r;
    }
    return keysOnly ? typeof o : val(o);
  }
  function body(text, keysOnly) {
    if (text == null || text === "") return null;
    if (typeof text !== "string") return { type: Object.prototype.toString.call(text).slice(8, -1) };
    try { return shape(JSON.parse(text), 0, keysOnly); } catch (e) {
      if (keysOnly && /=/.test(text)) return { form: text.split("&").map(function (p) { return decodeURIComponent(p.split("=")[0]); }).slice(0, 40) };
      return { text: text.length, head: keysOnly ? undefined : text.slice(0, 120).replace(/[^\n,]*@[^\n,]*/g, "(email)") };
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
      if (r) x.addEventListener("loadend", function () {
        var ct = "", res = null; try { ct = x.getResponseHeader("content-type") || ""; } catch (e) {}
        try { if (!x.responseType || x.responseType === "text") res = /json/.test(ct) ? body(x.responseText, false) : { text: (x.responseText || "").length }; else if (x.responseType === "json") res = shape(x.response, 0, false); } catch (e) {}
        send({ t: Date.now(), k: "xhr", m: r.m, u: url(r.u), st: x.status, ct: ct.split(";")[0], h: r.h, req: body(b, true), res: res });
      });
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
