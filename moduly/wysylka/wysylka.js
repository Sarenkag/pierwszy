/* Wysyłka raportów z kolejki prosto z Gmaila + pasek stanu na dole ekranu.
   Działa na liście PPM i w inspekcjach (ta sama kolejka w IndexedDB „inspekcje”), więc raport leci dalej po powrocie do listy.
   Bez logowania Google w apce nic nie robi (wtedy inspekcje wysyłają przez „Udostępnij”). */
(function (root) {
  "use strict";
  var doc = root.document, G = function () { return root.OESTGoogle; };
  var opts = { onChange: null, onQueue: null, onShare: null, queueUrl: "inspekcje/index.html#queue" };
  var sending = false, pos = null, flash = "", flashT = null, skipWifi = false, open = false, idle = [], items = [], loginErr = "", lock = null;

  // ---------- kolejka (IndexedDB, ta sama co w inspekcje/index.html) ----------
  var dbP = new Promise(function (res) {
    try {
      var rq = root.indexedDB.open("inspekcje", 1);
      rq.onupgradeneeded = function () { var db = rq.result; db.createObjectStore("queue", { keyPath: "id" }); db.createObjectStore("kv"); };
      rq.onsuccess = function () { res(rq.result); };
      rq.onerror = function () { res(null); };
    } catch (e) { res(null); }
  });
  function tx(mode, fn) {
    return dbP.then(function (db) {
      if (!db) return null;
      return new Promise(function (res, rej) {
        var t = db.transaction("queue", mode), out = fn(t.objectStore("queue"));
        t.oncomplete = function () { res(out && out.result !== undefined ? out.result : out); };
        t.onerror = t.onabort = function () { rej(t.error); };
      });
    });
  }
  function loadAll() { return tx("readonly", function (s) { return s.getAll(); }).then(function (a) { items = a || []; return items; }); }
  function put(it) { return tx("readwrite", function (s) { s.put(it); }); }
  function pending() { var me = ((account() || {}).email || "").toLowerCase(); return items.filter(function (q) { return q.status !== "sent" && (!q.acct || q.acct.toLowerCase() === me); }); }

  // ---------- warunki ----------
  function cfg() { try { return JSON.parse(root.localStorage.getItem("insp.cfg") || "{}"); } catch (e) { return {}; } }
  function wifiOnly() { return cfg().wifiOnly !== false; } // domyślnie czekamy na Wi‑Fi (Grzegorz 01/11)
  function account() { try { return JSON.parse(root.localStorage.getItem("oest.account") || "null"); } catch (e) { return null; } }
  function active() {
    var cap = root.Capacitor, c = cfg();
    return !!(G() && cap && cap.isNativePlatform && cap.isNativePlatform() && (root.OEST_CONFIG || {}).googleWebClientId && !c.api && account() && account().email);
  }
  function online() { return root.navigator.onLine !== false; }
  function onWifi() { var c = root.navigator.connection; return !!(c && (c.type === "wifi" || c.type === "ethernet")); } // nieznana sieć = jak komórkowa (czeka na kliknięcie)
  function myEmail() { // tylko z ustawień obecnego konta; brak adresu = raport czeka (nigdy adres innego konta)
    var c = cfg(); if (c.email) return c.email;
    try {
      var a = account() || {}, k = "oest.settings.v1." + encodeURIComponent(String(a.id || a.email || "")), st = JSON.parse(root.localStorage.getItem(k) || "null");
      return st && st.profile && st.profile.companyEmail || "";
    } catch (e) { return ""; }
  }
  function errText(e) {
    var m = e && e.message ? e.message : String(e);
    if (/GOOGLE_SETUP/.test(m)) return "zaloguj się do Google w apce";
    if (/ACCOUNT_MISMATCH/.test(m)) return "wybrano inne konto Google niż to, na które jesteś zalogowany";
    if (/HTTP_403/.test(m)) return "Gmail odmówił" + (/has not been used|disabled/i.test(m) ? " – włącz Gmail API w Google Cloud" : /scope|insufficient/i.test(m) ? " – brak zgody na wysyłanie; Ustawienia → Konto → Rozłącz sesje i Ponów" : "") + " (" + m.replace(/^.*?HTTP_403:?\s*/, "").slice(0, 120) + ")";
    if (/HTTP_401/.test(m)) return "sesja Google wygasła, ponów";
    if (/HTTP_413/.test(m)) return "raport za duży dla Gmaila";
    if (/RESULT_UNCERTAIN/.test(m)) return "brak odpowiedzi; sprawdź „Wysłane” w Gmailu, zanim ponowisz";
    if (/EMAIL_INVALID/.test(m)) return "brak adresu e-mail w Ustawieniach";
    if (/cancel/i.test(m)) return "anulowano logowanie Google";
    return m;
  }

  // ---------- wysyłka ----------
  function files(it) {
    var f = [];
    if (it.pdf && it.pdf.length) f.push({ name: it.name + ".pdf", mime: "application/pdf", bytes: it.pdf });
    if (it.docx && it.docx.length) f.push({ name: it.name + ".docx", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", bytes: it.docx });
    return f;
  }
  function changed(it) { if (opts.onChange) try { opts.onChange(it); } catch (e) {} }
  // o.login: wolno pokazać okno logowania Google (tylko po kliknięciu); o.anyNet: wyślij też bez Wi‑Fi
  function run(o) {
    o = o || {};
    if (!active()) return Promise.resolve();
    if (lock) return lock; // dwa wywołania naraz nie mogą wysłać tego samego raportu dwa razy
    return (lock = ready.then(loadAll).then(function () {
      var me = (account().email || "").toLowerCase();
      // błędy (też „brak odpowiedzi” = mail mógł dojść) ponawia tylko przycisk Ponów; cudze raporty nigdy, stare bez konta tylko po kliknięciu
      var todo = pending().filter(function (q) {
        return q.status !== "err" && q.status !== "sending" && (q.acct ? q.acct.toLowerCase() === me : !!o.login);
      }).sort(function (a, b) { return a.created - b.created; });
      if (!todo.length || !online()) return;
      if (wifiOnly() && !onWifi() && !o.anyNet && !skipWifi) return;
      var g = G();
      if (!g.connected("gmail") && !o.login) return;
      sending = true; loginErr = ""; var done = 0; render();
      return (g.connected("gmail") ? Promise.resolve() : g.connect("gmail")).then(function () {
        return todo.reduce(function (p, it, i) {
          return p.then(function (stop) {
            if (stop || !online()) return true;
            if (wifiOnly() && !onWifi() && !o.anyNet && !skipWifi) return true; // zgoda na dane dotyczy tylko kliknięcia, nie zmiany sieci w trakcie
            pos = { i: i + 1, n: todo.length, code: it.code }; it.status = "sending"; it.err = ""; render(); changed(it);
            return put(it).then(function () { return g.sendMail({ to: it.to || myEmail(), subject: it.subject, body: it.body, files: files(it) }).then(function () {
              it.status = "sent"; it.sentAt = Date.now(); it.docx = new Uint8Array(0); it.pdf = new Uint8Array(0); it.photos = []; done++;
              return put(it).then(function () { changed(it); return false; });
            }, function (e) {
              if (/GOOGLE_BUSY/.test(e && e.message)) { it.status = "wait"; it.err = ""; } // Drive akurat zajęty: spróbuję przy następnym razie
              else { it.status = "err"; it.err = errText(e); }
              return put(it).then(function () { changed(it); return true; });
            }); });
          });
        }, Promise.resolve(false));
      }, function (e) { loginErr = errText(e); }).then(function () {
        if (done) say("Wysłano ✓ " + (done === 1 ? "raport " + todo[0].code : done + " raporty"));
      });
    }).catch(function (e) { loginErr = "błąd kolejki w telefonie: " + errText(e); }).then(function () {
      sending = false; pos = null; skipWifi = false; lock = null; render();
      if (opts.onIdle) try { opts.onIdle(); } catch (e) {}
      var w = idle; idle = []; w.forEach(function (f) { f(); });
    }));
  }
  function whenIdle() { return lock ? new Promise(function (r) { idle.push(r); }) : Promise.resolve(); }
  function say(t) { flash = t; clearTimeout(flashT); flashT = setTimeout(function () { flash = ""; render(); }, 4000); render(); }

  // ---------- pasek ----------
  // cienki pełny pasek przyklejony do dołu ekranu (pod appką, nieprzezroczysty); rozwinięcie otwiera się nad nim
  var css = ":root{--oest-sbar-h:calc(30px + env(safe-area-inset-bottom,0px))}" +
    ".oest-sbar{position:fixed;left:0;right:0;bottom:0;z-index:9999;display:flex;flex-direction:column-reverse;background:#151a22;color:#e8eaed;" +
    "border-top:1px solid #2a313c;padding-bottom:env(safe-area-inset-bottom,0px);font:13px/1.2 system-ui,sans-serif}" +
    ".oest-sbar .r{display:flex;align-items:center;gap:8px;height:29px;padding:0 12px;cursor:pointer;white-space:nowrap}" +
    ".oest-sbar .t{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis}.oest-sbar .r>span:last-child{opacity:.6;font-size:11px}" +
    ".oest-sbar .i{width:10px;height:10px;flex:none;border-radius:50%;box-sizing:border-box}" +
    ".oest-sbar.run .i{width:12px;height:12px;border:2px solid rgba(255,255,255,.25);border-top-color:#f0b23a;animation:oestspin .8s linear infinite}" +
    ".oest-sbar.ok .i{background:#3fb27f}.oest-sbar.wait .i{background:#e3b341}.oest-sbar.err .i{background:#e5534b}" +
    ".oest-sbar .p{height:2px;background:#f0b23a;transition:width .3s;align-self:flex-start}" +
    ".oest-sbar .m{display:none;padding:10px 12px 6px;gap:8px;flex-wrap:wrap;border-bottom:1px solid #2a313c}.oest-sbar.open .m{display:flex}" +
    ".oest-sbar .m button{flex:1 1 auto;min-height:40px;border-radius:8px;border:1px solid #3a4250;background:transparent;color:inherit;font:inherit;font-size:14px;font-weight:600;padding:8px 10px}" +
    ".oest-sbar .m button.go{background:#f0b23a;color:#1a1405;border-color:transparent}.oest-sbar .m small{flex:1 1 100%;opacity:.75;font-size:12px}" +
    ".oest-sbar .n{display:flex;align-items:center;gap:5px;padding-right:8px;margin-right:2px;border-right:1px solid #2a313c;opacity:.85}" +
    ".oest-sbar .n i{width:8px;height:8px;border-radius:50%;background:#3fb27f}.oest-sbar .n.mid i{background:#e3b341}.oest-sbar .n.off i{background:#e5534b}" +
    "@keyframes oestspin{to{transform:rotate(360deg)}}body.oest-sbar-on{padding-bottom:var(--oest-sbar-h)}" +
    "body.oest-sbar-on #v-reactive{bottom:var(--oest-sbar-h)}body.oest-sbar-on #updBanner{bottom:calc(var(--oest-sbar-h) + 8px)!important}";
  var el = null;
  function mount() {
    if (el || !doc.body) return;
    var st = doc.createElement("style"); st.textContent = css; doc.head.appendChild(st);
    el = doc.createElement("div"); el.className = "oest-sbar"; el.hidden = true; el.setAttribute("role", "status");
    el.innerHTML = '<div class="r"><span class="n"><i></i><span></span></span><span class="i"></span><span class="t"></span><span aria-hidden="true">▴</span></div><div class="p"></div><div class="m"></div>';
    doc.body.appendChild(el);
    el.querySelector(".r").addEventListener("click", function () { open = !open; render(); });
    el.querySelector(".m").addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      var a = b.getAttribute("data-a");
      if (a === "data") { skipWifi = true; run({ login: true, anyNet: true }); }
      else if (a === "send") run({ login: true });
      else if (a === "retry") retry();
      else if (a === "share" && opts.onShare) opts.onShare();
      else if (a === "queue") { open = false; if (opts.onQueue) opts.onQueue(); else whenIdle().then(function () { root.location.href = opts.queueUrl; }); }
      render();
    });
  }
  function retry() {
    loadAll().then(function () {
      return Promise.all(pending().filter(function (q) { return q.status === "err"; }).map(function (q) { q.status = "wait"; q.err = ""; changed(q); return put(q); }));
    }).then(function () { run({ login: true, anyNet: true }); }); // Ponów = świadoma decyzja, także przez dane
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function render() {
    mount(); if (!el) return;
    var p = pending(), n = p.length, err = p.filter(function (q) { return q.status === "err"; })[0];
    var cls = "", txt = "", more = "", prog = 0;
    var b = function (a, t, go) { return '<button type="button" data-a="' + a + '"' + (go ? ' class="go"' : "") + ">" + t + "</button>"; };
    var qb = b("queue", "Pokaż kolejkę");
    var cap = root.Capacitor; if (!(cap && cap.isNativePlatform && cap.isNativePlatform())) { el.hidden = true; doc.body.classList.remove("oest-sbar-on"); return; } // pasek stale w apce
    if (!active()) { cls = "err"; txt = n ? "W kolejce: " + n + " · Gmail niepołączony" : "Gmail niepołączony";
      more = "<small>Żeby raporty szły same: Ustawienia → Konto → Wyloguj i zaloguj przez Google, uzupełnij firmowy e-mail w Mój profil.</small>" + qb; }
    else
    if (sending) {
      cls = "run"; prog = pos ? (pos.i - 0.5) / pos.n : 0.05;
      txt = pos ? "Wysyłam raport " + (pos.n > 1 ? pos.i + "/" + pos.n + " " : "") + "· " + pos.code + "…" : "Łączę z Gmailem…";
      more = "<small>Możesz dalej pracować. Nie zamykaj apki, dopóki pasek nie pokaże „Wysłano”.</small>" + qb;
    } else if (flash) { cls = "ok"; txt = flash; prog = 1; more = qb; }
    else if (!n) { cls = "ok"; txt = "Wszystko wysłane"; more = qb; }
    else if (err || loginErr) {
      cls = "err"; txt = "Nie wysłano: " + (err ? err.err : loginErr);
      more = b("retry", "Ponów", true) + (opts.onShare ? b("share", "Wyślij przez Udostępnij") : "") + qb;
    } else if (!online()) { cls = "wait"; txt = "W kolejce: " + n + " · czekam na sieć"; more = "<small>Wyślę sam, gdy wróci zasięg (apka musi być otwarta).</small>" + qb; }
    else if (wifiOnly() && !onWifi() && !skipWifi) {
      cls = "wait"; txt = "W kolejce: " + n + " · czekam na Wi‑Fi";
      more = "<small>Wyślę sam po połączeniu z Wi‑Fi.</small>" + b("data", "Wyślij teraz przez dane komórkowe", true) + qb;
    } else if (!G().connected("gmail")) { cls = "wait"; txt = "W kolejce: " + n + " · dotknij, aby wysłać"; more = b("send", "Wyślij teraz", true) + qb; }
    else { cls = "wait"; txt = "W kolejce: " + n; more = b("send", "Wyślij teraz", true) + qb; }
    el.className = "oest-sbar " + cls + (open ? " open" : "");
    el.querySelector(".t").textContent = txt;
    var net = !online() ? ["off", "Brak sieci"] : onWifi() ? ["on", "Wi‑Fi"] : ["mid", "Dane"]; // lampka sieci
    var nb = el.querySelector(".n"); nb.className = "n " + net[0]; nb.lastChild.textContent = net[1];
    el.querySelector(".m").innerHTML = more;
    el.querySelector(".p").style.width = Math.round(prog * 100) + "%";
    el.hidden = false; doc.body.classList.add("oest-sbar-on");
  }
  function refresh() { return loadAll().then(render, render); }

  function auto() { return cfg().auto !== false ? run() : Promise.resolve(); } // „Wysyłaj kolejkę sama” z Ustawień inspekcji
  // raport zapisany jako „wysyłam”, a strona zamknięta w trakcie: nie wiadomo, czy doszedł, więc tylko ręczne Ponów
  function orphans() {
    return Promise.all(items.filter(function (q) { return q.status === "sending"; }).map(function (q) {
      q.status = "err"; q.err = errText(Error("EMAIL_RESULT_UNCERTAIN")); changed(q); return put(q);
    }));
  }
  var readyOk, ready = new Promise(function (r) { readyOk = r; }); // wysyłka startuje dopiero po sprzątnięciu przerwanych
  function init(o) { Object.assign(opts, o || {}); return refresh().then(orphans).catch(function () {}).then(function () { readyOk(); render(); }).then(auto); }
  var kick = function () { refresh().then(auto); };
  root.addEventListener("online", kick); root.addEventListener("offline", render);
  if (root.navigator.connection && root.navigator.connection.addEventListener) root.navigator.connection.addEventListener("change", kick);
  doc.addEventListener("visibilitychange", function () { if (!doc.hidden) kick(); });
  setInterval(function () { if (!sending && pending().length) auto(); }, 60000);

  root.OESTSender = { init: init, run: run, active: active, busy: function () { return sending; }, whenIdle: whenIdle, refresh: refresh, render: render, _errText: errText };
})(window);
