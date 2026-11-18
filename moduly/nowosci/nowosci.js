// Moduł nowości firm (moduly/nowosci, Grzegorz 18/11/2026): nagłówki trzech firm związanych z One Eastside –
// PIC (Pension Insurance Corporation, właściciel budynku), Savills (zarządca) i Smart Managed Solutions (pracodawca).
// Źródło: Google News RSS (jeden format dla wszystkich trzech; Smart nie ma działu newsów na stronie).
// Pobiera raz na dobę, tylko gdy jest sieć (najpierw sprawdza połączenie), bez sieci pokazuje ostatnio zapisane.
// Wiadomości o One Eastside zawsze na górze. Na telefonie zapytanie idzie natywnie (CapacitorHttp – bez blokady CORS).
//
//   OESTNowosci.load(force)   → Promise<{ t, items:[{ src, title, pub, url, date, oes }] } | null>
//   OESTNowosci.cache()       → ostatnio zapisane (albo null)
//   OESTNowosci.top(n)        → n nagłówków: One Eastside na górze, potem najnowsze
//   OESTNowosci.unread()      → ile nowych od ostatniego otwarcia okienka
//   OESTNowosci.seen()        → oznacz wszystkie jako przeczytane
//   OESTNowosci.FIRMY         → { pic, savills, smart } (skrót i nazwa)
//   OESTNowosci.parse(xml, src) → pozycje z jednego kanału RSS (do testów)
(function (w) {
  "use strict";
  var KEY = "oest.news", SEEN = "oest.news.seen", AGE = 86400000, MAX_DAYS = 365;
  var FIRMY = {
    pic: { skrot: "PIC", nazwa: "Pension Insurance Corporation" },
    savills: { skrot: "Savills", nazwa: "Savills" },
    smart: { skrot: "Smart", nazwa: "Smart Managed Solutions" }
  };
  // zapytania Google News (zmiana listy = zmiana tylko tutaj)
  var KANALY = [
    { src: "pic", q: '"Pension Insurance Corporation"' },
    { src: "savills", q: 'Savills (Birmingham OR "build to rent")' },
    { src: "smart", q: '"Smart Managed Solutions"' },
    { src: "oes", q: '"One Eastside" Birmingham' }
  ];
  function url(q) { return "https://news.google.com/rss/search?q=" + encodeURIComponent(q) + "&hl=en-GB&gl=GB&ceid=GB:en"; }
  function txt(el, tag) { var x = el.getElementsByTagName(tag)[0]; return x ? (x.textContent || "").trim() : ""; }
  function isOes(s) { return /one\s*eastside/i.test(s); }
  function firmaZ(s) {
    if (/pension insurance corporation|\bPIC\b/i.test(s)) return "pic";
    if (/savills/i.test(s)) return "savills";
    if (/smart managed solutions/i.test(s)) return "smart";
    return "";
  }
  function parse(xml, src) {
    var doc = new w.DOMParser().parseFromString(String(xml || ""), "text/xml"), out = [];
    var items = doc.getElementsByTagName("item");
    for (var i = 0; i < items.length; i++) {
      var it = items[i], title = txt(it, "title"), pub = txt(it, "source"), link = txt(it, "link"), dt = Date.parse(txt(it, "pubDate"));
      if (!title || !/^https:\/\//.test(link)) continue;
      // Google dokleja „ - Wydawca” na końcu tytułu – wydawca idzie osobno
      if (pub && title.slice(-(pub.length + 3)) === " - " + pub) title = title.slice(0, -(pub.length + 3));
      var f = src === "oes" ? (firmaZ(title) || "pic") : src; // One Eastside = budynek PIC
      out.push({ src: f, title: title, pub: pub, url: link, date: isNaN(dt) ? 0 : dt, oes: src === "oes" || isOes(title) });
    }
    return out;
  }
  function get(u) {
    var cap = w.Capacitor, h = cap && cap.isNativePlatform && cap.isNativePlatform() && cap.Plugins && cap.Plugins.CapacitorHttp;
    if (h) return h.request({ url: u, method: "GET", responseType: "text", connectTimeout: 20000, readTimeout: 20000 }).then(function (r) {
      if (r.status < 200 || r.status >= 300) throw Error("NEWS_HTTP"); return typeof r.data === "string" ? r.data : String(r.data || "");
    });
    return w.fetch(u).then(function (r) { if (!r.ok) throw Error("NEWS_HTTP"); return r.text(); });
  }
  function cache() { try { return JSON.parse(w.localStorage.getItem(KEY) || "null"); } catch (e) { return null; } }
  var loading = null;
  function load(force) {
    var c = cache();
    if (!force && c && Date.now() - c.t < AGE) return Promise.resolve(c);
    if (w.navigator.onLine === false || !w.DOMParser) return Promise.resolve(c); // najpierw połączenie; bez sieci – ostatnie zapisane
    if (loading) return loading;
    loading = Promise.all(KANALY.map(function (k) { return get(url(k.q)).then(function (x) { return parse(x, k.src); }, function () { return null; }); }))
      .then(function (lists) {
        if (lists.every(function (l) { return l === null; })) return c; // nic nie przyszło – nie kasuj zapisanych
        var seen = {}, items = [], old = Date.now() - MAX_DAYS * 86400000;
        lists.forEach(function (l) { (l || []).forEach(function (x) {
          var k = x.title.toLowerCase().replace(/\W+/g, "");
          if (seen[k]) { if (x.oes) seen[k].oes = true; return; }
          if (x.date && x.date < old) return;
          seen[k] = x; items.push(x);
        }); });
        items.sort(function (a, b) { return b.date - a.date; });
        var out = { t: Date.now(), items: items.slice(0, 40) };
        try { w.localStorage.setItem(KEY, JSON.stringify(out)); } catch (e) {}
        return out;
      }).finally(function () { loading = null; });
    return loading;
  }
  function top(n) {
    var c = cache(), it = (c && c.items) || [];
    return it.filter(function (x) { return x.oes; }).concat(it.filter(function (x) { return !x.oes; })).slice(0, n || 5);
  }
  function seenAt() { try { return +w.localStorage.getItem(SEEN) || 0; } catch (e) { return 0; } }
  function unread() { var s = seenAt(); return top(5).filter(function (x) { return x.date > s; }).length; }
  function markSeen() { var c = cache(), m = 0; ((c && c.items) || []).forEach(function (x) { if (x.date > m) m = x.date; }); try { w.localStorage.setItem(SEEN, String(m || Date.now())); } catch (e) {} }
  w.OESTNowosci = { load: load, cache: cache, top: top, unread: unread, seen: markSeen, parse: parse, FIRMY: FIRMY, KANALY: KANALY };
})(window);
