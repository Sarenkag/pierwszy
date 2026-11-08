/* Ekran główny (Grzegorz 03/11/2026, makieta „Home experience”):
 * nagłówek (logo, ONE EASTSIDE, data, pogoda, EN/PL, dzwonek, profil), lampki Wi‑Fi i Dysk,
 * pasek dni (moduly/pasek-dni: pogoda, zrobione/wszystkie, dni pracy z grafiku) i okienka:
 * prognoza 7 dni, powiadomienia, Dysk, sieć. Okienka rosną z miejsca stuknięcia i chowają się przez pomniejszenie,
 * także po stuknięciu obok i po systemowym Wstecz (OESTOverlay). Zmiana języka podmienia tylko teksty w miejscu. */
(function (w) {
  "use strict";
  var d = w.document, deps = null, pop = null, popKind = "", popClose = null;
  var $ = function (id) { return d.getElementById(id); };
  var LAT = 52.4797, LON = -1.8834; // One Eastside, Birmingham
  var WX_KEY = "oest.weather", WX_AGE = 3600000;
  function T(pl, en) { return w.OESTT ? w.OESTT(pl, en) : pl; }
  function en() { return w.OESTBledy ? w.OESTBledy.lang() === "en" : false; }
  function loc() { return en() ? "en-GB" : "pl-PL"; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function iso(x) { return x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-" + String(x.getDate()).padStart(2, "0"); }
  function today() { var t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate()); }

  // ---------- pogoda (Open-Meteo, bez klucza; bez sieci ostatnia zapisana) ----------
  function wxIcon(c) {
    if (c == null) return "";
    if (c === 0) return "☀"; if (c <= 2) return "⛅"; if (c === 3) return "☁"; if (c <= 48) return "🌫";
    if (c >= 95) return "⛈"; if ((c >= 71 && c <= 77) || c === 85 || c === 86) return "❄"; if (c >= 80) return "🌦"; return "🌧";
  }
  function wxCache() { try { return JSON.parse(w.localStorage.getItem(WX_KEY) || "null"); } catch (e) { return null; } }
  var wxLoading = null;
  function wxLoad(force) {
    var c = wxCache();
    if (!force && c && Date.now() - c.t < WX_AGE) return Promise.resolve(c);
    if (w.navigator.onLine === false || !w.fetch) return Promise.resolve(c);
    if (wxLoading) return wxLoading;
    var url = "https://api.open-meteo.com/v1/forecast?latitude=" + LAT + "&longitude=" + LON +
      "&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Europe%2FLondon&forecast_days=14";
    wxLoading = w.fetch(url).then(function (r) { if (!r.ok) throw Error("WEATHER_HTTP"); return r.json(); }).then(function (j) {
      if (!j || !j.daily || !Array.isArray(j.daily.time)) throw Error("WEATHER_DATA");
      var days = {};
      j.daily.time.forEach(function (k, i) { days[k] = { c: j.daily.weather_code[i], hi: Math.round(j.daily.temperature_2m_max[i]), lo: Math.round(j.daily.temperature_2m_min[i]) }; });
      var out = { t: Date.now(), now: j.current ? { temp: Math.round(j.current.temperature_2m), c: j.current.weather_code } : null, days: days };
      try { w.localStorage.setItem(WX_KEY, JSON.stringify(out)); } catch (e) {}
      return out;
    }).catch(function () { return c; }).finally(function () { wxLoading = null; });
    return wxLoading;
  }

  // ---------- nagłówek, lampki, pasek dni ----------
  function initials() {
    var p = {}; try { p = w.OESTSettings.get().profile || {}; } catch (e) {}
    var a = {}; try { a = JSON.parse(w.localStorage.getItem("oest.account") || "{}") || {}; } catch (e) {}
    var f = p.first || a.first || "", l = p.last || a.last || "";
    var s = (f.charAt(0) + l.charAt(0)) || (a.name || a.email || "").charAt(0);
    return (s || "?").toUpperCase();
  }
  function net() {
    if (w.navigator.onLine === false) return { k: "off", t: T("Brak sieci", "No network") };
    var c = w.navigator.connection;
    if (c && (c.type === "wifi" || c.type === "ethernet")) return { k: "on", t: "Wi‑Fi" };
    if (c && c.type && c.type !== "unknown") return { k: "mid", t: T("Dane komórkowe", "Mobile data") };
    return { k: "on", t: T("Online", "Online") };
  }
  var photo = { pending: 0, bytes: 0, phone: 0, limit: 0, warn: 0 };
  function drivePaused() { return !!(w.OESTZdjeciaUI && w.OESTZdjeciaUI.paused && w.OESTZdjeciaUI.paused()); }
  var gOk = null; // stan połączenia z Dyskiem: tylko z OESTGoogle.ready (to samo źródło co Ustawienia i wysyłka)
  function driveOn() { var G = w.OESTGoogle; return !!(G && G.connected && G.connected("drive")) || gOk === true; }
  function driveState() {
    if (gOk === false && !driveOn()) return { k: "off", t: T("HDD · brak połączenia", "HDD · not connected") };
    if (drivePaused()) return { k: "off", t: T("HDD · wstrzymany", "HDD · paused") };
    if (photo.pending) return { k: "mid", t: T("HDD · " + photo.pending + " w kolejce", "HDD · " + photo.pending + " queued") };
    return { k: "on", t: T("HDD · zsynchronizowany", "HDD · synced") };
  }
  function photoStats() {
    var G = w.OESTGoogle, g = G && G.ready ? G.ready("drive").then(function (ok) { gOk = ok; }, function () { gOk = false; }) : Promise.resolve();
    var Z = w.OESTZdjecia; if (!Z || !Z.list) return g;
    return g.then(function () { return Z.list(); }).then(function (rs) { var s = Z.stats(rs); photo = { pending: s.pending, bytes: s.pendingBytes, phone: s.phoneBytes, limit: (Z.settings().phoneLimitMB || 200) * 1048576, warn: (Z.settings().warnMB || 100) * 1048576 }; }).catch(function () {});
  }
  function lamps() {
    var n = net(), dr = driveState();
    $("hmNet").querySelector(".l").className = "l " + n.k; $("hmNet").querySelector("span").textContent = n.t;
    $("hmDrive").querySelector(".l").className = "l " + dr.k; $("hmDrive").querySelector("span").textContent = dr.t;
    // folder zdjęć OEST: ile zajmuje (Grzegorz 05/11). Kolory liczone od progu ostrzeżeń (osobne ustawienie, domyślnie 100 MB),
    // nie od limitu folderu (200 MB = bufor): <50% zielony, <75% pomarańczowy, <90% czerwony, wyżej czerwony z ⚠
    var ph = $("hmPhotos"); if (ph) {
      var mb = photo.phone / 1048576, base = photo.warn || photo.limit, f = base ? photo.phone / base : 0;
      ph.className = "hm-ph-size " + (f < 0.5 ? "ok" : f < 0.75 ? "mid" : f < 0.9 ? "hi" : "full");
      // sam licznik bez słowa „Zdjęcia”, np. 13/200MB – mieści się w jednej linii z Wi‑Fi i HDD (Grzegorz 07/11)
      ph.querySelector("span").textContent = (mb < 10 ? mb.toFixed(1) : Math.round(mb)) + "/" + Math.round(photo.limit / 1048576) + "MB";
    }
  }
  function header() {
    var t = today();
    $("hmDate").textContent = t.toLocaleDateString(loc(), { weekday: "short", day: "numeric", month: "short" });
    $("hmIni").textContent = initials();
    if (w.OESTPrzelacznik) w.OESTPrzelacznik.set($("hmLang"), en() ? "en" : "pl"); // jeden przełącznik PL/EN (moduly/przelacznik)
    var c = wxCache(), b = $("hmWx");
    if (c && c.now) { b.hidden = false; b.querySelector(".i").textContent = wxIcon(c.now.c); b.querySelector(".v").textContent = c.now.temp + "°C"; }
    else b.hidden = true;
  }
  function wxDay(k) { var c = wxCache(), dd = (c && c.days) || {}; return dd[k] ? wxIcon(dd[k].c) : ""; }
  // pasek dni: jeden moduł z listą Inspekcji (moduly/pasek-dni, Grzegorz 07/11) – wczoraj + 13 dni, dni pracy z grafiku
  function days() {
    var t = today(), s = new Date(t); s.setDate(s.getDate() - 1);
    var box = $("hmDays"), sl = box.scrollLeft, cnt = deps.dayCounts();
    w.OESTPodmien.html(box, w.OESTPasekDni.html({ start: s, days: 14, today: t, todayLabel: T("Dziś", "Today"), dayName: deps.dayName,
      isWork: deps.isWorkday, counter: function (k) { return cnt[k] || null; }, icon: wxDay }));
    box.scrollLeft = sl;
  }
  function render() {
    if (!deps) return;
    header(); lamps(); days();
    badge();
    photoStats().then(function () { lamps(); if (popKind === "drive") fillDrive(); });
    wxLoad(false).then(function () { header(); days(); if (popKind === "wx") fillWx(); });
  }
  function relang() { if (!deps || $("v-home").hidden) return; header(); lamps(); days(); badge(); if (popKind) fill(popKind); }

  // ---------- powiadomienia ----------
  var rxOpen = 0;
  function rxCount() {
    var H = w.OESTHandover; if (!H || !H.repository || !H.repository.get) return Promise.resolve();
    return H.repository.get().then(function (s) {
      rxOpen = ((s && s.jobs) || []).filter(function (j) { return j.status !== "fixed"; /* jak lista Reactive: także zadania z Handover */ }).length;
    }).catch(function () {});
  }
  function notes() {
    var k = iso(today()), insp = deps.inspToday(k), out = [];
    if (insp.today || insp.late) out.push({ ic: "insp", go: "insp", b: T("Inspekcje na dziś", "Inspections today"),
      s: T(insp.today + " do zrobienia", insp.today + " to do") + (insp.late ? T(", w tym " + insp.late + " po terminie", ", " + insp.late + " overdue") : "") });
    if (rxOpen) out.push({ ic: "rx", go: "reactive", b: "Reactive", s: T("Otwarte zadania: " + rxOpen, "Open jobs: " + rxOpen) });
    var q = w.OESTSender && w.OESTSender.count ? w.OESTSender.count() : 0;
    if (q) out.push({ ic: "mail", go: "queue", b: T("Wysyłka raportów", "Report sending"), s: T("Raporty w kolejce: " + q, "Reports queued: " + q) });
    if (photo.pending) out.push({ ic: "drive", go: "drive", b: T("Zdjęcia na Dysk", "Photos to Drive"), s: T("Czeka na wysłanie: " + photo.pending, "Waiting to upload: " + photo.pending) });
    return out;
  }
  function badge() {
    rxCount().then(function () {
      var n = notes().length, b = $("hmBell").querySelector(".hm-badge");
      b.hidden = !n; b.textContent = n;
      if (popKind === "bell") fillBell();
    });
  }
  var ICONS = {
    insp: '<rect x="5" y="3" width="14" height="18" rx="1.5"/><path d="M8.5 9l1.5 1.5 3-3M8.5 15l1.5 1.5 3-3"/>',
    rx: '<path d="M12 3l9 16H3z"/><path d="M12 10v4M12 16.5v.5"/>',
    mail: '<rect x="3" y="5.5" width="18" height="13" rx="1.5"/><path d="M3.5 6.5l8.5 6.5 8.5-6.5"/>',
    drive: '<path d="M8.5 4h7l6 10.5-3.5 6h-12L2.5 14.5z"/><path d="M8.5 4l6 10.5M2.5 14.5h12"/>'
  };
  function svg(k) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICONS[k] + "</svg>"; }

  // ---------- okienka ----------
  function fill(kind) { if (kind === "wx") fillWx(); else if (kind === "bell") fillBell(); else if (kind === "drive") fillDrive(); else if (kind === "net") fillNet(); }
  function head(title, extra) {
    return '<div class="hm-ph"><b>' + title + "</b>" + (extra ? "<span>" + extra + "</span>" : "") +
      '<button class="hm-x" type="button" data-hx aria-label="' + T("Zamknij", "Close") + '">✕</button></div>';
  }
  function body(h) { if (pop) pop.querySelector(".hm-pc").innerHTML = h; }
  function fillWx() {
    var c = wxCache(), t = today(), h = head("⛅ " + T("Prognoza 7 dni", "7-day forecast"), "Birmingham");
    if (!c || !c.days) h += '<p class="hm-note">' + T("Brak prognozy. Połącz się z internetem, a pobiorę ją sama.", "No forecast yet. Connect to the internet and it will download automatically.") + "</p>";
    else {
      h += '<div class="hm-fc">';
      for (var i = 0; i < 7; i++) {
        var x = new Date(t); x.setDate(x.getDate() + i); var f = c.days[iso(x)];
        h += "<div><small>" + (i === 0 ? T("Dziś", "Today") : esc(deps.dayName(x.getDay()))) + "</small><span>" + (f ? wxIcon(f.c) : "–") + "</span><b>" + (f ? f.hi + "°" : "") + "</b><s>" + (f ? f.lo + "°" : "") + "</s></div>";
      }
      h += '</div><p class="hm-note">' + T("Stan z ", "Updated ") + new Date(c.t).toLocaleString(loc(), { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" }) +
        (w.navigator.onLine === false ? T(" · bez sieci: ostatnia zapisana", " · offline: last saved") : "") + "</p>";
    }
    body(h);
  }
  function fillBell() {
    var list = notes(), h = head("🔔 " + T("Powiadomienia", "Notifications"));
    h += list.length ? list.map(function (n) {
      return '<button class="hm-nt" type="button" data-hgo="' + n.go + '"><span class="hm-ni">' + svg(n.ic) + "</span><span><b>" + esc(n.b) + "</b><small>" + esc(n.s) + '</small></span><span class="hm-ar">›</span></button>';
    }).join("") : '<p class="hm-note">' + T("Nic nowego. Wszystko na bieżąco.", "Nothing new. All up to date.") + "</p>";
    body(h);
  }
  function mb(b) { return (b / 1048576).toLocaleString(loc(), { maximumFractionDigits: 1 }) + " MB"; }
  function fillDrive() {
    var on = driveOn(), p = drivePaused();
    var h = head("Google Drive", on ? T("połączony", "connected") : T("niepołączony", "not connected"));
    h += '<button class="hm-op" type="button" data-hop="sync"><span>' + T("Synchronizuj teraz", "Sync now") + "</span><small>" +
      (photo.pending ? T("zdjęcia: ", "photos: ") + photo.pending + " · " + mb(photo.bytes) : T("nic do wysłania", "nothing to upload")) + "</small></button>";
    h += '<button class="hm-op" type="button" data-hop="pause"><span>' + (p ? T("Wznów automatyczną wysyłkę", "Resume automatic upload") : T("Wstrzymaj automatyczną wysyłkę", "Pause automatic upload")) + "</span><small>" + (p ? T("wstrzymana", "paused") : T("włączona", "on")) + "</small></button>";
    h += '<button class="hm-op" type="button" data-hop="reconnect"><span>' + T("Połącz ponownie", "Reconnect") + "</span><small>" + (on ? T("połączony", "connected") : T("stuknij, aby połączyć", "tap to connect")) + "</small></button>";
    h += '<button class="hm-op" type="button" data-hgo="zdjecia"><span>' + T("Zdjęcia i limity", "Photos & limits") + '</span><small>›</small></button><p class="hm-note" id="hmDrMsg"></p>';
    body(h);
  }
  function fillNet() {
    var n = net(), q = w.OESTSender && w.OESTSender.count ? w.OESTSender.count() : 0;
    var h = head(T("Połączenie", "Connection"), n.t);
    h += '<p class="hm-note">' + (n.k === "off" ? T("Brak sieci. Praca trwa dalej, a kolejka wyśle się sama po powrocie zasięgu.", "No network. You can keep working; the queue sends itself when the signal returns.")
      : n.k === "mid" ? T("Dane komórkowe. Raporty czekają na Wi‑Fi, chyba że wyślesz je ręcznie.", "Mobile data. Reports wait for Wi‑Fi unless you send them manually.")
      : T("Połączono. Kolejka wysyła się w tle.", "Connected. The queue sends in the background.")) + "</p>";
    h += '<button class="hm-op" type="button" data-hgo="queue"><span>' + T("Raporty w kolejce", "Reports queued") + "</span><small>" + q + " ›</small></button>";
    h += '<button class="hm-op" type="button" data-hgo="settings/sync"><span>' + T("Ustawienia wysyłki", "Sending settings") + "</span><small>›</small></button>";
    body(h);
  }
  function reduce() { return d.documentElement.dataset.settingsMotion === "reduce"; }
  function openPop(kind, from) {
    if (popKind && popClose) popClose(); // nie powinno się zdarzyć (tło zasłania przyciski), ale bez dwóch okien naraz
    popKind = kind;
    pop = $("hmPop"); pop.hidden = false; pop.dataset.kind = kind;
    fill(kind);
    var card = pop.querySelector(".hm-card"), r = from.getBoundingClientRect(), top = kind === "bell" ? r.bottom + 8 : $("hmDays").getBoundingClientRect().top;
    card.style.top = Math.max(8, top) + "px";
    var cr = card.getBoundingClientRect();
    card.style.transformOrigin = Math.round(r.left + r.width / 2 - cr.left) + "px " + Math.round(r.top + r.height / 2 - cr.top) + "px";
    pop.classList.remove("in"); void card.offsetWidth; pop.classList.add("in");
    from.classList.add("hm-act");
    popClose = function () { from.classList.remove("hm-act"); hide(); };
    if (w.OESTOverlay) w.OESTOverlay.open(function () { if (popClose) popClose(); });
  }
  function hide() {
    var p = pop; popKind = ""; popClose = null; if (!p) return;
    p.classList.remove("in");
    if (reduce()) { p.hidden = true; return; }
    setTimeout(function () { if (!popKind) p.hidden = true; }, 200);
  }
  // zamknięcie przyciskiem / stuknięciem obok = to samo co Wstecz (zdejmuje wpis historii)
  function closePop() {
    if (!popKind) return;
    if (w.OESTOverlay && w.OESTOverlay.stack.length) w.OESTOverlay.close(); else if (popClose) popClose();
  }
  // przejście ze źródła powiadomienia: najpierw zamknij okienko (wpis historii), potem otwórz ekran
  function goFromPop(target) {
    var after = function () {
      if (target === "queue") { if (w.OESTSender && w.OESTSender.expand) w.OESTSender.expand(); return; }
      if (target === "drive") { openPop("drive", $("hmDrive")); return; }
      if (target === "insp") { deps.openDay(iso(today())); return; }
      deps.show(target);
    };
    if (w.OESTOverlay && w.OESTOverlay.stack.length) {
      w.addEventListener("popstate", function once() { w.removeEventListener("popstate", once); setTimeout(after, 0); });
      w.OESTOverlay.close();
    } else { if (popClose) popClose(); after(); }
  }
  function driveOp(op, btn) {
    var U = w.OESTZdjeciaUI, G = w.OESTGoogle, msg = function (t) { var m = $("hmDrMsg"); if (m) m.textContent = t; };
    var job;
    if (op === "pause") { if (U && U.setPaused) U.setPaused(!drivePaused()); lamps(); fillDrive(); return; }
    if (op === "sync") job = function () { if (!U || !U.syncNow) throw Error("GOOGLE_SETUP"); return U.syncNow(true).then(function (r) { return photoStats().then(function () { lamps(); return r; }); }); };
    if (op === "reconnect") job = function () { if (!G) throw Error("GOOGLE_SETUP"); return G.connect("drive"); };
    var run = w.OESTPrzycisk ? w.OESTPrzycisk.run(btn, job) : Promise.resolve().then(job);
    Promise.resolve(run).then(function (r) {
      if (popKind !== "drive") return; // okienko zamknięte albo inne – nie nadpisuj
      fillDrive();
      if (op === "sync") msg(r && r.skipped ? T("Czekam na Wi‑Fi.", "Waiting for Wi‑Fi.") : T("Wysłano: ", "Uploaded: ") + ((r && r.sent) || 0) + ".");
      else msg(T("Połączono z Dyskiem.", "Connected to Drive."));
    }, function (e) { if (popKind !== "drive") return; fillDrive(); msg(U && U.errText ? U.errText(e) : (w.OESTBledy ? w.OESTBledy.text(e) : String(e))); });
  }

  function init(o) {
    deps = o;
    $("hmWx").addEventListener("click", function () { openPop("wx", this); wxLoad(true).then(function () { header(); days(); if (popKind === "wx") fillWx(); }); });
    $("hmBell").addEventListener("click", function () { var b = this; rxCount().then(function () { openPop("bell", b); }); });
    $("hmDrive").addEventListener("click", function () { openPop("drive", this); });
    if ($("hmPhotos")) $("hmPhotos").addEventListener("click", function () { goFromPop("zdjecia"); });
    $("hmNet").addEventListener("click", function () { openPop("net", this); });
    $("hmLang").addEventListener("click", function () {
      var next = en() ? "pl" : "en";
      try { w.OESTSettings.update(function (s) { s.appearance.language = next; }); w.OESTSettingsUI.applyTheme(); }
      catch (e) { try { w.localStorage.setItem("oest.lang", next); w.dispatchEvent(new CustomEvent("oest:lang")); } catch (e2) {} }
    });
    $("hmDays").addEventListener("click", function (e) { var b = e.target.closest("[data-day]"); if (b) deps.openDay(b.dataset.day); });
    $("hmPop").addEventListener("click", function (e) {
      if (e.target.closest("[data-hx]") || !e.target.closest(".hm-card")) { closePop(); return; }
      var g = e.target.closest("[data-hgo]"); if (g) { goFromPop(g.dataset.hgo); return; }
      var op = e.target.closest("[data-hop]"); if (op) driveOp(op.dataset.hop, op);
    });
    w.addEventListener("oest:lang", relang);
    // powrót do apki (np. następnego dnia): odśwież datę, pasek dni i liczniki, także bez sieci
    function resume() { if (!$("v-home").hidden && !d.hidden && !popKind) render(); }
    ["pageshow", "focus"].forEach(function (ev) { w.addEventListener(ev, resume); });
    d.addEventListener("visibilitychange", resume);
    ["online", "offline"].forEach(function (ev) { w.addEventListener(ev, function () { if (!$("v-home").hidden) { lamps(); if (ev === "online") render(); if (popKind === "net") fillNet(); } }); });
    if (w.navigator.connection && w.navigator.connection.addEventListener) w.navigator.connection.addEventListener("change", function () { lamps(); if (popKind === "net") fillNet(); });
    if (w.OESTZdjecia && w.OESTZdjecia.onChange) w.OESTZdjecia.onChange(function () { photoStats().then(function () { lamps(); badge(); if (popKind === "drive") fillDrive(); }); });
  }
  w.OESTHome = { init: init, render: render, close: closePop, wxDay: wxDay, _wxIcon: wxIcon };
})(window);
