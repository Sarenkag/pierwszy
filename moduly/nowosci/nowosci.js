// Moduł nowości firm (moduly/nowosci, Grzegorz 18/11/2026): nagłówki trzech firm związanych z One Eastside –
// PIC (Pension Insurance Corporation, właściciel budynku), Savills (zarządca) i Smart Managed Solutions (pracodawca).
// Filtry (Grzegorz 18/11/2026 20:32): PIC i Savills – TYLKO wiadomości o One Eastside; Smart – wszystkie wiadomości firmy
// (kontrakty, rozwój) + oferty pracy (strona kariery Teamtailor, RSS bez logowania; Birmingham/Midlands na górze).
// Źródło wiadomości: Google News RSS (Smart nie ma działu newsów na stronie, LinkedIn wymaga logowania).
// Pobiera raz na dobę, tylko gdy jest sieć (najpierw sprawdza połączenie), bez sieci pokazuje ostatnio zapisane.
// Na telefonie zapytanie idzie natywnie (CapacitorHttp – bez blokady CORS).
//
//   OESTNowosci.load(force)   → Promise<{ t, items:[{ src, title, pub, url, date, oes, praca }], jobs:{ n, url } } | null>
//   OESTNowosci.cache()       → ostatnio zapisane (albo null)
//   OESTNowosci.top(n)        → n pozycji: One Eastside, potem oferty pracy Smart w Birmingham/Midlands, potem najnowsze
//   OESTNowosci.jobs()        → { n, url } – wszystkie oferty pracy Smart (wiersz zbiorczy w okienku) albo null
//   OESTNowosci.unread()      → ile nowych od ostatniego otwarcia okienka
//   OESTNowosci.seen()        → oznacz wszystkie jako przeczytane
//   OESTNowosci.FIRMY         → { pic, savills, smart } (skrót i nazwa)
//   OESTNowosci.parse(xml, kanal) → pozycje z jednego kanału RSS (do testów)
(function (w) {
  "use strict";
  var KEY = "oest.news", SEEN = "oest.news.seen", AGE = 86400000, MAX_DAYS = 365;
  var FIRMY = {
    pic: { skrot: "PIC", nazwa: "Pension Insurance Corporation" },
    savills: { skrot: "Savills", nazwa: "Savills" },
    smart: { skrot: "Smart", nazwa: "Smart Managed Solutions" }
  };
  // kanały (zmiana listy = zmiana tylko tutaj). oes: true = zapytanie wymaga „One Eastside”, więc każda pozycja dotyczy budynku.
  var KARIERA = "https://smartmanagedsolutions-1734694596.teamtailor.com/jobs";
  var KANALY = [
    { src: "pic", q: '"One Eastside" (PIC OR "Pension Insurance Corporation")', oes: true },
    { src: "savills", q: '"One Eastside" Savills', oes: true },
    { src: "smart", q: '"Smart Managed Solutions"' },
    { src: "smart", url: KARIERA + ".rss", praca: true }
  ];
  var MIDLANDS = /birmingham|solihull|coventry|wolverhampton|west bromwich|walsall|dudley|sutton coldfield|midlands/i;
  function url(k) { if (k.url) return k.url; var q = k.q; return "https://news.google.com/rss/search?q=" + encodeURIComponent(q) + "&hl=en-GB&gl=GB&ceid=GB:en"; }
  function txt(el, tag) { var x = el.getElementsByTagName(tag)[0]; return x ? (x.textContent || "").trim() : ""; }
  function isOes(s) { return /one\s*eastside/i.test(s); }
  function parse(xml, k) {
    k = typeof k === "string" ? { src: k } : (k || {});
    var doc = new w.DOMParser().parseFromString(String(xml || ""), "text/xml"), out = [];
    var items = doc.getElementsByTagName("item");
    for (var i = 0; i < items.length; i++) {
      var it = items[i], title = txt(it, "title").replace(/\s+/g, " "), pub = txt(it, "source"), link = txt(it, "link"), dt = Date.parse(txt(it, "pubDate"));
      if (!title || !/^https:\/\//.test(link)) continue;
      if (k.praca) {
        var miasto = txt(it, "tt:city") || txt(it, "tt:name");
        out.push({ src: k.src, title: title, pub: miasto, url: link, date: isNaN(dt) ? 0 : dt, oes: false, praca: true, blisko: MIDLANDS.test(miasto) });
        continue;
      }
      // Google dokleja „ - Wydawca” na końcu tytułu – wydawca idzie osobno
      if (pub && title.slice(-(pub.length + 3)) === " - " + pub) title = title.slice(0, -(pub.length + 3));
      out.push({ src: k.src, title: title, pub: pub, url: link, date: isNaN(dt) ? 0 : dt, oes: !!k.oes || isOes(title) });
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
    loading = Promise.all(KANALY.map(function (k) { return get(url(k)).then(function (x) { return parse(x, k); }, function () { return null; }); }))
      .then(function (lists) {
        if (lists.every(function (l) { return l === null; })) return c; // nic nie przyszło – nie kasuj zapisanych
        var seen = {}, items = [], old = Date.now() - MAX_DAYS * 86400000, jobs = null;
        lists.forEach(function (l, i) {
          if (KANALY[i].praca) { // oferty pracy: wiersz zbiorczy + tylko te z Birmingham/Midlands jako osobne pozycje
            if (l) jobs = { n: l.length, url: KARIERA }; else if (c && c.jobs) jobs = c.jobs;
            l = (l || []).filter(function (x) { return x.blisko; });
          }
          (l || []).forEach(function (x) {
          var k = x.title.toLowerCase().replace(/\W+/g, "");
          if (seen[k]) { if (x.oes) seen[k].oes = true; return; }
          if (x.date && x.date < old) return;
          seen[k] = x; items.push(x);
        }); });
        items.sort(function (a, b) { return rank(b) - rank(a) || (b.date - a.date); }); // One Eastside i praca w Birmingham przed obcięciem do 40 – nigdy nie wypadają
        var out = { t: Date.now(), items: items.slice(0, 40), jobs: jobs };
        try { w.localStorage.setItem(KEY, JSON.stringify(out)); } catch (e) {}
        return out;
      }).finally(function () { loading = null; });
    return loading;
  }
  function rank(x) { return x.oes ? 2 : x.praca ? 1 : 0; }
  function top(n) {
    var c = cache(), it = ((c && c.items) || []).slice();
    it.sort(function (a, b) { return rank(b) - rank(a) || (b.date - a.date); });
    return it.slice(0, n || 5);
  }
  function jobs() { var c = cache(); return (c && c.jobs && c.jobs.n) ? c.jobs : null; }
  function seenAt() { try { return +w.localStorage.getItem(SEEN) || 0; } catch (e) { return 0; } }
  function unread() { var s = seenAt(); return top(5).filter(function (x) { return x.date > s; }).length; }
  function markSeen() {
    var c = cache(), m = 0; ((c && c.items) || []).forEach(function (x) { if (x.date > m) m = x.date; });
    if (!m || m <= seenAt()) return; // nic nie pobrane jeszcze – nie przesuwaj granicy (późniejsze nagłówki dostaną znaczek)
    try { w.localStorage.setItem(SEEN, String(m)); } catch (e) {}
  }
  w.OESTNowosci = { load: load, cache: cache, top: top, jobs: jobs, unread: unread, seen: markSeen, parse: parse, FIRMY: FIRMY, KANALY: KANALY };
})(window);
