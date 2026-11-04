/* Wysyłka raportów z kolejki prosto z Gmaila + pasek stanu na dole ekranu.
   Działa na liście PPM i w inspekcjach (ta sama kolejka w IndexedDB „inspekcje”), więc raport leci dalej po powrocie do listy.
   Bez logowania Google w apce nic nie robi (wtedy inspekcje wysyłają przez „Udostępnij”). */
(function (root) {
  "use strict";
  var doc = root.document, G = function () { return root.OESTGoogle; };
  function T(pl, en) { return root.OESTT ? root.OESTT(pl, en) : pl; }
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
  // szybki test internetu (5 s): czy w ogóle dochodzimy do Google
  function reachable() {
    if (!online()) return Promise.resolve(false);
    var c = root.AbortController ? new root.AbortController() : null, t = setTimeout(function () { if (c) c.abort(); }, 5000);
    return root.fetch("https://www.gstatic.com/generate_204", { mode: "no-cors", cache: "no-store", signal: c ? c.signal : undefined })
      .then(function () { return true; }, function () { return false; }).then(function (ok) { clearTimeout(t); return ok; });
  }
  function onWifi() { var c = root.navigator.connection; return !!(c && (c.type === "wifi" || c.type === "ethernet")); } // nieznana sieć = jak komórkowa (czeka na kliknięcie)
  function myEmail() { // tylko z ustawień obecnego konta; brak adresu = raport czeka (nigdy adres innego konta)
    var c = cfg(); if (c.email) return c.email;
    try {
      var a = account() || {}, k = "oest.settings.v1." + encodeURIComponent(String(a.id || a.email || "")), st = JSON.parse(root.localStorage.getItem(k) || "null");
      return st && st.profile && st.profile.companyEmail || "";
    } catch (e) { return ""; }
  }
  // adresaci raportu (Grzegorz 04/11 11:34): Ja = adres firmowy, Inżynier / Manager = kontakty z Ustawień → Wysyłka (te same co w Handover)
  // sel: { sm, se, sg } → { list: [adresy], me, eng, man }
  function recipients(sel) {
    sel = sel || { sm: true };
    var st = null; try { var a = account() || {}; st = JSON.parse(root.localStorage.getItem("oest.settings.v1." + encodeURIComponent(String(a.id || a.email || ""))) || "null"); } catch (e) {}
    function contact(id) { var c = st && id ? (st.contacts || []).filter(function (x) { return x.id === id && x.active !== false; })[0] : null; return c && c.email || ""; }
    var mail = (st && st.mail) || {}, out = { me: myEmail(), eng: contact(mail.engineerId), man: contact(mail.managerId) };
    out.list = [sel.sm && out.me, sel.se && out.eng, sel.sg && out.man].filter(function (x, i, a) { return x && a.indexOf(x) === i; });
    return out;
  }
  function errText(e) {
    var m = e && e.message ? e.message : String(e);
    if (/GOOGLE_SETUP/.test(m)) return T("zaloguj się do Google w apce", "sign in to Google in the app");
    if (/ACCOUNT_MISMATCH/.test(m)) return T("wybrano inne konto Google niż to, na które jesteś zalogowany", "you chose a different Google account than the one you are signed in with");
    if (/HTTP_403/.test(m)) return T("Gmail odmówił", "Gmail refused") + (/has not been used|disabled/i.test(m) ? T(" – włącz Gmail API w Google Cloud", " – enable the Gmail API in Google Cloud") : /scope|insufficient/i.test(m) ? T(" – brak zgody na wysyłanie; Ustawienia → Konto → Rozłącz sesje i Ponów", " – no permission to send; Settings → Account → Disconnect sessions, then Retry") : "") + " (" + m.replace(/^.*?HTTP_403:?\s*/, "").slice(0, 120) + ")";
    if (/HTTP_401/.test(m)) return T("sesja Google wygasła, ponów", "Google session expired, retry");
    if (/GOOGLE_OFFLINE/.test(m)) return T("brak internetu", "no internet");
    if (/GOOGLE_CANCELLED/.test(m)) return T("anulowano ponowne połączenie", "reconnection cancelled");
    if (/LOGIN_TIMEOUT/.test(m)) return T("okno Google nie odpowiedziało, ponów", "the Google window did not respond, retry");
    if (/HTTP_413/.test(m)) return T("raport za duży dla Gmaila", "report too large for Gmail");
    if (/RESULT_UNCERTAIN/.test(m)) return T("nie doczekałem się odpowiedzi Gmaila (słaby zasięg albo duży raport); sprawdź „Wysłane”, zanim ponowisz", "no answer from Gmail (weak signal or large report); check Sent before retrying");
    if (/EMAIL_INVALID/.test(m)) return T("brak adresu e-mail w Ustawieniach", "no email address in Settings");
    if (/cancel/i.test(m)) return T("anulowano logowanie Google", "Google sign-in cancelled");
    return root.OESTBledy ? root.OESTBledy.text(e) : m;
  }

  // ---------- wysyłka ----------
  function files(it) {
    if (Array.isArray(it.files)) return it.files; // pliki złożone w inspekcji wg ⚙ (pusta lista = świadomie nic, nie pełny PDF)
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
    // bez kliknięcia (sieć wróciła, start apki): praca w tle, Google nie pokaże okna ponownego połączenia
    if (lock) return lock; // dwa wywołania naraz nie mogą wysłać tego samego raportu dwa razy
    if (!o.wrap && G() && G().background) { // kliknięcie = foreground (może zapytać o połączenie), reszta = tło
      var w = o.login ? G().foreground : G().background;
      if (w) return w(function () { return run(Object.assign({}, o, { wrap: true })); });
    }
    return (lock = ready.then(loadAll).then(function () {
      var me = (account().email || "").toLowerCase();
      // błędy (też „brak odpowiedzi” = mail mógł dojść) ponawia tylko przycisk Ponów; cudze raporty nigdy, stare bez konta tylko po kliknięciu
      var todo = pending().filter(function (q) {
        return q.status !== "err" && q.status !== "sending" && (q.acct ? q.acct.toLowerCase() === me : !!o.login);
      }).sort(function (a, b) { return a.created - b.created; });
      if (!todo.length || !online()) return;
      if (wifiOnly() && !onWifi() && !o.anyNet && !skipWifi) return;
      var g = G(), done = 0;
      // połączenie z Gmailem sprawdza tylko OESTGoogle.ready (cichy token, bez okna); okno logowania tylko po kliknięciu
      return (g.ready ? g.ready("gmail") : Promise.resolve(g.connected("gmail"))).then(function (ok) {
      if (!ok && !o.login) return;
      sending = true; loginErr = ""; render();
      return (ok ? Promise.resolve() : g.connect("gmail")).then(function () {
        return todo.reduce(function (p, it, i) {
          return p.then(function (stop) {
            if (stop || !online()) return true;
            if (wifiOnly() && !onWifi() && !o.anyNet && !skipWifi) return true; // zgoda na dane dotyczy tylko kliknięcia, nie zmiany sieci w trakcie
            var t0 = Date.now(); pos = { i: i + 1, n: todo.length, code: it.code }; it.status = "sending"; it.err = ""; render(); changed(it);
            return put(it).then(function () { return g.sendMail({ to: Array.isArray(it.toList) ? it.toList : it.to || myEmail(), subject: it.subject, body: it.body, files: files(it) }).then(function () {
              it.status = "sent"; it.sentAt = Date.now(); it.docx = new Uint8Array(0); it.photos = []; it.files = []; done++; // PDF zostaje w telefonie (04/11): z niego da się odtworzyć inspekcję
              if (it.ppm && window.OEST_PPM && OEST_PPM.markSent) OEST_PPM.markSent(it.ppm, it.id); // klocek PPM: W kolejce → Wysłana
              return put(it).then(function () { changed(it); return false; });
            }, function (e) {
              var m = e && e.message || "";
              if (/GOOGLE_BUSY|GOOGLE_OFFLINE/.test(m)) { it.status = "wait"; it.err = ""; return put(it).then(function () { changed(it); return true; }); } // Drive zajęty / brak sieci: spróbuję przy następnym razie
              if (!/RESULT_UNCERTAIN/.test(m)) { it.status = "err"; it.err = errText(e); return put(it).then(function () { changed(it); return true; }); }
              // „brak odpowiedzi” (04/11): błąd w pierwszych sekundach + brak internetu = wysyłka nie zdążyła ruszyć → czeka i wyjdzie sam.
              // Dłuższa próba mogła dojść do Gmaila: wtedy zostaje „niepewne” i ponawia tylko Grzegorz (bez podwójnych maili).
              var quick = Date.now() - t0 < 5000;
              return (quick ? reachable() : Promise.resolve(true)).then(function (ok) {
                if (ok) { it.status = "err"; it.err = errText(e); } else { it.status = "wait"; it.err = ""; }
                return put(it).then(function () { changed(it); return true; });
              });
            }); });
          });
        }, Promise.resolve(false));
      }, function (e) { loginErr = errText(e); }).then(function () {
        if (done) say(T("Wysłano ✓ ", "Sent ✓ ") + (done === 1 ? T("raport ", "report ") + todo[0].code : done + T(" raporty", " reports")));
      });
      });
    }).catch(function (e) { loginErr = T("błąd kolejki w telefonie: ", "phone queue error: ") + errText(e); }).then(function () {
      sending = false; pos = null; skipWifi = false; lock = null; render();
      if (opts.onIdle) try { opts.onIdle(); } catch (e) {}
      var w = idle; idle = []; w.forEach(function (f) { f(); });
    }));
  }
  function whenIdle() { return lock ? new Promise(function (r) { idle.push(r); }) : Promise.resolve(); }
  function say(t) { flash = t; clearTimeout(flashT); flashT = setTimeout(function () { flash = ""; render(); }, 4000); render(); }

  // ---------- pasek ----------
  // cienki pełny pasek przyklejony do dołu ekranu (pod appką, nieprzezroczysty); rozwinięcie otwiera się nad nim
  var css = ":root{--oest-sbar-h:calc(30px + max(env(safe-area-inset-bottom,0px),var(--safe-area-inset-bottom,0px)))}" +
    ".oest-sbar{position:fixed;left:0;right:0;bottom:0;z-index:9999;display:flex;flex-direction:column-reverse;background:rgba(14,18,40,.96);color:var(--ink,#eef1ff);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);" +
    "border-top:1px solid var(--line,rgba(255,255,255,.12));padding-bottom:max(env(safe-area-inset-bottom,0px),var(--safe-area-inset-bottom,0px));font:13px/1.2 var(--font-body,system-ui),sans-serif}" +
    ".oest-sbar .r{display:flex;align-items:center;gap:8px;height:29px;padding:0 12px;cursor:pointer;white-space:nowrap}" +
    ".oest-sbar .t{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis}.oest-sbar .r>span:last-child{opacity:.6;font-size:11px}" +
    ".oest-sbar .i{width:10px;height:10px;flex:none;border-radius:50%;box-sizing:border-box}" +
    // to samo kółko co w całej apce (moduly/ladowanie)
    ".oest-sbar.run .i{width:12px;height:12px;background:conic-gradient(from 0deg,rgba(124,132,255,0) 0deg,rgba(124,132,255,.15) 120deg,#7c84ff 300deg,#c58bff 360deg);-webkit-mask:radial-gradient(farthest-side,transparent calc(100% - 2.5px),#000 calc(100% - 2px));mask:radial-gradient(farthest-side,transparent calc(100% - 2.5px),#000 calc(100% - 2px));animation:oest-spin .9s linear infinite}" +
    ".oest-sbar.ok .i{background:#3fb27f}.oest-sbar.wait .i{background:#e3b341}.oest-sbar.err .i{background:#e5534b}" +
    ".oest-sbar .p{height:2px;background:var(--grad,linear-gradient(90deg,#5b7cff,#a35bff));transition:width .3s;align-self:flex-start}" +
    ".oest-sbar .m{display:none;padding:10px 12px 6px;gap:8px;flex-wrap:wrap;border-bottom:1px solid var(--line,rgba(255,255,255,.12))}.oest-sbar.open .m{display:flex}" +
    ".oest-sbar .m button{flex:1 1 auto;min-height:40px;border-radius:12px;border:1px solid var(--line,rgba(255,255,255,.18));background:var(--panel,rgba(255,255,255,.06));color:inherit;font:inherit;font-size:15px;font-weight:600;padding:8px 12px}" +
    ".oest-sbar .m button.go{background:var(--grad,linear-gradient(90deg,#5b7cff,#a35bff));color:#fff;border-color:transparent}.oest-sbar .m small{flex:1 1 100%;opacity:.75;font-size:12px}" +
    ".oest-sbar .n{display:flex;align-items:center;gap:5px;padding-right:8px;margin-right:2px;border-right:1px solid var(--line,rgba(255,255,255,.12));opacity:.85}" +
    // lampka sieci: moduly/znacznik (ten sam wzór co na ekranie głównym)
    "@keyframes oest-spin{to{transform:rotate(360deg)}}body.oest-sbar-on{padding-bottom:var(--oest-sbar-h)}" +
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
    var qb = b("queue", T("Pokaż kolejkę", "Show queue"));
    var cap = root.Capacitor; if (!(cap && cap.isNativePlatform && cap.isNativePlatform())) { el.hidden = true; doc.body.classList.remove("oest-sbar-on"); return; } // pasek stale w apce
    if (!active()) { cls = "err"; txt = n ? T("W kolejce: ", "Queued: ") + n + T(" · Gmail niepołączony", " · Gmail not connected") : T("Gmail niepołączony", "Gmail not connected");
      more = "<small>" + T("Żeby raporty szły same: Ustawienia → Konto → Wyloguj i zaloguj przez Google, uzupełnij firmowy e-mail w Mój profil.", "To send reports automatically: Settings → Account → Sign out and sign in with Google, then add your work email in My Profile.") + "</small>" + qb; }
    else
    if (sending) {
      cls = "run"; prog = pos ? (pos.i - 0.5) / pos.n : 0.05;
      txt = pos ? T("Wysyłam raport ", "Sending report ") + (pos.n > 1 ? pos.i + "/" + pos.n + " " : "") + "· " + pos.code + "…" : T("Łączę z Gmailem…", "Connecting to Gmail…");
      more = "<small>" + T("Możesz dalej pracować. Nie zamykaj apki, dopóki pasek nie pokaże „Wysłano”.", "You can keep working. Do not close the app until the bar shows “Sent”.") + "</small>" + qb;
    } else if (flash) { cls = "ok"; txt = flash; prog = 1; more = qb; }
    else if (!n) { cls = "ok"; txt = T("Wszystko wysłane", "All sent"); more = qb; }
    else if (err || loginErr) {
      cls = "err"; txt = T("Nie wysłano: ", "Not sent: ") + (err ? err.err : loginErr);
      more = b("retry", T("Ponów", "Retry"), true) + (opts.onShare ? b("share", T("Wyślij przez Udostępnij", "Send via Share")) : "") + qb;
    } else if (!online()) { cls = "wait"; txt = T("W kolejce: ", "Queued: ") + n + T(" · czekam na sieć", " · waiting for network"); more = "<small>" + T("Wyślę sam, gdy wróci zasięg (apka musi być otwarta).", "I will send it when the signal returns (the app must be open).") + "</small>" + qb; }
    else if (wifiOnly() && !onWifi() && !skipWifi) {
      cls = "wait"; txt = T("W kolejce: ", "Queued: ") + n + T(" · czekam na Wi‑Fi", " · waiting for Wi‑Fi");
      more = "<small>" + T("Wyślę sam po połączeniu z Wi‑Fi.", "I will send it once on Wi‑Fi.") + "</small>" + b("data", T("Wyślij teraz przez dane komórkowe", "Send now over mobile data"), true) + qb;
    } else if (!G().connected("gmail")) { cls = "wait"; txt = T("W kolejce: ", "Queued: ") + n + T(" · dotknij, aby wysłać", " · tap to send"); more = b("send", T("Wyślij teraz", "Send now"), true) + qb; }
    else { cls = "wait"; txt = T("W kolejce: ", "Queued: ") + n; more = b("send", T("Wyślij teraz", "Send now"), true) + qb; }
    el.className = "oest-sbar " + cls + (open ? " open" : "");
    el.querySelector(".t").textContent = txt;
    var net = !online() ? ["off", T("Brak sieci", "No network")] : onWifi() ? ["on", "Wi‑Fi"] : ["mid", T("Dane", "Data")]; // lampka sieci
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
  root.addEventListener("oest:lang", function () { if (el) render(); }); // zmiana języka: tylko nowy tekst paska
  root.addEventListener("online", kick); root.addEventListener("offline", render);
  if (root.navigator.connection && root.navigator.connection.addEventListener) root.navigator.connection.addEventListener("change", kick);
  doc.addEventListener("visibilitychange", function () { if (!doc.hidden) kick(); });
  setInterval(function () { if (!sending && pending().length) auto(); }, 60000);

  // Dodanie raportu do kolejki z dowolnego miejsca apki (np. Reactive): uzupełnia id, konto i status, potem wysyła w tle
  function enqueue(it) {
    var acct = ""; try { acct = (JSON.parse(root.localStorage.getItem("oest.account") || "null") || {}).email || ""; } catch (e) {}
    var rec = Object.assign({ id: (root.crypto && root.crypto.randomUUID ? root.crypto.randomUUID() : String(Date.now()) + Math.random()), created: Date.now(), acct: acct, status: "wait" }, it);
    return put(rec).then(function () { refresh(); run({ login: true }); return rec; });
  }
  root.OESTSender = { init: init, run: run, count: function () { return pending().length; }, expand: function () { open = true; render(); }, enqueue: enqueue, active: active, busy: function () { return sending || !!lock; } /* też w trakcie sprawdzania połączenia: raportu z kolejki nie da się wtedy usunąć */, whenIdle: whenIdle, refresh: refresh, render: render, _errText: errText, recipients: recipients };
})(window);
