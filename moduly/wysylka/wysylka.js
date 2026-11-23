/* Wysyłka raportów z kolejki prosto z Gmaila + stan paska na dole ekranu (pasek rysuje szkielet Ionic: czesci/PasekWysylki.vue).
   Działa na liście PPM i w inspekcjach (ta sama kolejka w IndexedDB „inspekcje”), więc raport leci dalej po powrocie do listy.
   Bez logowania Google w apce nic nie robi (wtedy inspekcje wysyłają przez „Udostępnij”). */
(function (root) {
  "use strict";
  var doc = root.document, G = function () { return root.OESTGoogle; };
  var opts = { ustawienia: null, onChange: null, onQueue: null, onShare: null, queueUrl: "inspekcje/index.html#queue" };
  var sending = false, pos = null, flash = "", flashT = null, skipWifi = false, open = false, idle = [], items = [], loginErr = "", lock = null;

  // ---------- baza „inspekcje” (IndexedDB): JEDYNY właściciel w apce (karta K10, audyt 19/11/2026 nr 21–22, D4) ----------
  // magazyny: queue (kolejka raportów, klucz id) i kv (szablon, szkice, ustawienia strony inspekcji). Strona inspekcji
  // nie otwiera bazy sama – używa OESTSender.baza. Bez magazynu: odczyt = pusto, zapis = jawny błąd STORAGE_WRITE
  // (przegląd ChatGPT 09/11/2026 pkt 4, D11 – zapis NIE może udawać sukcesu).
  var dbP = new Promise(function (res) {
    try {
      var rq = root.indexedDB.open("inspekcje", 1);
      rq.onupgradeneeded = function () { var db = rq.result; db.createObjectStore("queue", { keyPath: "id" }); db.createObjectStore("kv"); };
      rq.onsuccess = function () { res(rq.result); };
      rq.onerror = function () { res(null); };
    } catch (e) { res(null); }
  });
  function sklep(store, mode, fn) {
    return dbP.then(function (db) {
      if (!db) { if (mode === "readwrite") throw Error("STORAGE_WRITE"); return undefined; }
      return new Promise(function (res, rej) {
        var t = db.transaction(store, mode), out = fn(t.objectStore(store));
        t.oncomplete = function () { res(out && out.result !== undefined ? out.result : (out && typeof out.readyState === "string" ? undefined : out)); };
        t.onerror = t.onabort = function () { rej(t.error); };
      });
    });
  }
  function tx(mode, fn) { return sklep("queue", mode, fn).then(function (r) { return r === undefined && mode === "readonly" ? null : r; }); }
  var baza = {
    dostepna: function () { return dbP.then(function (db) { return !!db; }); }, // czy telefon zapisuje dane na stałe
    kvGet: function (k) { return sklep("kv", "readonly", function (s) { return s.get(k); }); },
    kvAll: function () { return sklep("kv", "readonly", function (s) { return s.getAll(); }).then(function (a) { return a || []; }); },
    kvSet: function (k, v) { return sklep("kv", "readwrite", function (s) { s.put(v, k); }); },
    qAll: function () { return sklep("queue", "readonly", function (s) { return s.getAll(); }).then(function (a) { return a || []; }); },
    qPut: function (it) { return sklep("queue", "readwrite", function (s) { s.put(it); }); },
    qDel: function (id) { return sklep("queue", "readwrite", function (s) { s.delete(id); }); }
  };
  function loadAll() { return tx("readonly", function (s) { return s.getAll(); }).then(function (a) { items = a || []; return items; }); }
  function put(it) { return tx("readwrite", function (s) { s.put(it); }); }
  function mine(q) { var me = ((account() || {}).email || "").toLowerCase(); return !q.acct || q.acct.toLowerCase() === me; }
  function pending() { return items.filter(function (q) { return q.status !== "sent" && q.status !== "shared" && mine(q); }); }
  function unconfirmed() { return items.filter(function (q) { return q.status === "shared" && mine(q); }); } // przekazane przez Udostępnij, czekają na „Potwierdzam, wysłane”

  // ---------- warunki ----------
  function cfg() { try { return JSON.parse(root.localStorage.getItem("insp.cfg") || "{}"); } catch (e) { return {}; } }
  function wifiOnly() { return cfg().wifiOnly !== false; } // domyślnie czekamy na Wi‑Fi (Grzegorz 01/11)
  function account() { return root.OESTKonto.get(); } // moduly/konto
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
  // ustawienia obecnego konta (Mój profil, kontakty, Wysyłka) podaje strona w init({ ustawienia }) – właścicielem zapisu
  // jest settings-store.js (klucz oest.settings.v1.*), moduł nie czyta go sam
  function ustawienia() { try { return opts.ustawienia ? opts.ustawienia() : null; } catch (e) { return null; } }
  function myEmail() { // tylko z ustawień obecnego konta; brak adresu = raport czeka (nigdy adres innego konta)
    var c = cfg(); if (c.email) return c.email;
    var st = ustawienia(); return st && st.profile && st.profile.companyEmail || "";
  }
  // adresaci raportu (Grzegorz 04/11 11:34): Ja = adres firmowy, Inżynier / Manager = kontakty z Ustawień → Wysyłka (te same co w Handover)
  // Prywatny e-mail (Grzegorz 05/11): sp = mój prywatny adres z Mój profil, sm = firmowy
  // sel: { sp, sm, se, sg } → { list: [adresy], priv, me, eng, man }
  function recipients(sel) {
    sel = sel || { sm: true };
    var st = ustawienia();
    function contact(id) { var c = st && id ? (st.contacts || []).filter(function (x) { return x.id === id && x.active !== false; })[0] : null; return c && c.email || ""; }
    var mail = (st && st.mail) || {}, out = { priv: st && st.profile && st.profile.privateEmail || "", me: myEmail(), eng: contact(mail.engineerId), man: contact(mail.managerId) };
    out.list = [sel.sp && out.priv, sel.sm && out.me, sel.se && out.eng, sel.sg && out.man].filter(function (x, i, a) { return x && a.indexOf(x) === i; });
    return out;
  }
  function errText(e) {
    var m = e && e.message ? e.message : String(e);
    if (/GOOGLE_SETUP/.test(m)) return root.OESTT("zaloguj się do Google w apce", "sign in to Google in the app");
    if (/ACCOUNT_MISMATCH/.test(m)) return root.OESTT("wybrano inne konto Google niż to, na które jesteś zalogowany", "you chose a different Google account than the one you are signed in with");
    if (/HTTP_403/.test(m)) return root.OESTT("Gmail odmówił", "Gmail refused") + (/has not been used|disabled/i.test(m) ? root.OESTT(" – włącz Gmail API w Google Cloud", " – enable the Gmail API in Google Cloud") : /scope|insufficient/i.test(m) ? root.OESTT(" – brak zgody na wysyłanie; Ustawienia → Konto → Rozłącz sesje i Ponów", " – no permission to send; Settings → Account → Disconnect sessions, then Retry") : "") + " (" + m.replace(/^.*?HTTP_403:?\s*/, "").slice(0, 120) + ")";
    if (/HTTP_401/.test(m)) return root.OESTT("sesja Google wygasła, ponów", "Google session expired, retry");
    if (/GOOGLE_OFFLINE/.test(m)) return root.OESTT("brak internetu", "no internet");
    if (/GOOGLE_CANCELLED/.test(m)) return root.OESTT("anulowano ponowne połączenie", "reconnection cancelled");
    if (/LOGIN_TIMEOUT/.test(m)) return root.OESTT("okno Google nie odpowiedziało, ponów", "the Google window did not respond, retry");
    if (/HTTP_413/.test(m)) return root.OESTT("raport za duży dla Gmaila", "report too large for Gmail");
    if (/RESULT_UNCERTAIN/.test(m)) return root.OESTT("nie doczekałem się odpowiedzi Gmaila (słaby zasięg albo duży raport); sprawdź „Wysłane”, zanim ponowisz", "no answer from Gmail (weak signal or large report); check Sent before retrying");
    if (/EMAIL_INVALID/.test(m)) return root.OESTT("brak adresu e-mail w Ustawieniach", "no email address in Settings");
    if (/cancel/i.test(m)) return root.OESTT("anulowano logowanie Google", "Google sign-in cancelled");
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
  // ---------- raporty na Dysk (moduly/raporty, Grzegorz 08/11/2026) ----------
  // Mail = Word + PDF bez zmian. Po wysłaniu raport trafia do archiwum na telefonie, a Word na Dysk (OEST Raporty / budynek / rodzaj);
  // ponowna wysyłka tego samego raportu nadpisuje ten sam plik. Błąd Dysku nie psuje wysyłki maila: raport czeka na następną próbę.
  var archived = Promise.resolve();
  var DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  // Word/PDF raportu: z it.docx/it.pdf albo z listy plików złożonej wg ⚙ (formularz ze zdjęć, Flushing basic) – główny plik „nazwa.docx” ma pierwszeństwo
  function pickFile(it, ext, mime) {
    var own = ext === "docx" ? it.docx : it.pdf;
    if (own && own.length) return own;
    var list = Array.isArray(it.files) ? it.files.filter(function (f) { return f && f.bytes && (f.bytes.length || f.bytes.byteLength) && (f.mime === mime || String(f.name || "").toLowerCase().slice(-ext.length - 1) === "." + ext); }) : [];
    var main = list.filter(function (f) { return f.name === it.name + "." + ext; })[0] || list[0];
    return main ? main.bytes : null;
  }
  // Zwraca obietnicę: true = raport bezpiecznie w archiwum telefonu (dopiero wtedy wolno wyczyścić Worda z kolejki).
  function archive(it) {
    var R = root.OESTRaporty, docx = pickFile(it, "docx", DOCX_MIME), pdf = pickFile(it, "pdf", "application/pdf");
    if (!R || !docx || it.noArchive) return Promise.resolve(true); // noArchive: ponowne wysłanie z przeglądarki raportów (raport już jest w archiwum). Bez Worda nie ma czego kłaść na Dysk (np. w ⚙ zaznaczony tylko PDF)
    var rep = { key: it.key || it.name, at: it.at || it.sentAt || it.created || Date.now(), /* it.at: chwila „Update” (nowsza wersja niż wysłana) */ name: it.name, docx: docx, pdf: pdf || null, folder: Array.isArray(it.rpt) && it.rpt.length ? it.rpt : [it.type === "reactive" ? "Reactive" : "General"], // Reactive: jeden folder (bez budynku w zadaniu)
      meta: { ppm: it.ppm || it.ppmRef || "", type: it.type || "", code: it.code || "", queueId: it.id, sentAt: it.sentAt || Date.now(), card: it.card || null, job: it.job || "" }, // card: opis klocka odzyskanej (nazwa, lokalizacja, częstotliwość) od apki; ppmRef: odzyskana inspekcja (bez zmiany klocka PPM)
      snap: it.snap || null }; // dane inspekcji do „Odzyskaj do edycji” (etap 2c)
    var p = archived.then(function () { return R.save(rep); }).then(function () { return true; }, function () { return false; });
    archived = p;
    return p;
  }
  // Wysłane raporty, których archiwum się nie zapisało (np. brak miejsca, zamknięta apka): Word czeka w kolejce, ponawiamy bez ponownego maila
  function rearchive() {
    var me = ((account() || {}).email || "").toLowerCase();
    var todo = items.filter(function (q) { return q.status === "sent" && q.arch === "todo" && (!q.acct || q.acct.toLowerCase() === me); });
    return todo.reduce(function (p, it) {
      return p.then(function () { return archive(it).then(function (ok) { if (!ok) return; it.arch = ""; it.docx = new Uint8Array(0); it.files = []; return put(it); }); });
    }, Promise.resolve()).catch(function () {});
  }
  // „Update” odzyskanej inspekcji (Grzegorz 08/11/2026 12:54): nowa wersja raportu w telefonie i nadpisanie Worda na Dysku, BEZ maila.
  // Zwraca { saved, drive }: saved = zapis w telefonie się udał; drive = wynik próby wysyłki na Dysk (null = nie było jak: brak sieci / Dysku / logowania).
  function update(it) {
    if (!root.OESTRaporty || !pickFile(it, "docx", DOCX_MIME)) return Promise.reject(new Error("REPORT_DOCX")); // bez Worda nie ma czego zapisać – nie udajemy
    return archive(it).then(function (ok) {
      if (!ok) throw new Error("STORAGE_WRITE");
      return syncReports({ anyNet: true }).then(function (r) { return { saved: true, drive: r }; });
    });
  }
  function driveAdapter(g) {
    return { ensureFolder: g.ensureFolder, find: g.findFile, upload: g.uploadFile, update: g.updateFile }; // update(id, blob, nowaNazwa?)
  }
  function later(o) { setTimeout(function () { syncReports(o); }, 0); }
  // o.anyNet: raporty wolno wysłać bez Wi‑Fi (tak jak mail po kliknięciu)
  function syncReports(o) {
    o = o || {};
    var R = root.OESTRaporty, g = G();
    if (!R || !g || !g.findFile || !g.updateFile || !active()) return Promise.resolve(null);
    function allowed() { return online() && (!wifiOnly() || onWifi() || !!o.anyNet || skipWifi); }
    return rearchive().then(function () { return archived; }).then(function () {
      if (!allowed() || R.busy()) return null;
      return (g.ready ? g.ready("drive") : Promise.resolve(g.connected("drive"))).then(function (ok) {
        if (!ok) return null; // bez zgody na Dysk nic nie robimy w tle (bez okien logowania)
        var job = function () { return R.sync(driveAdapter(g), { allowed: allowed }); };
        return (g.background && !o.wrap ? g.background(job) : job());
      });
    }).catch(function () { return null; }); // GOOGLE_BUSY, brak sieci itp.: raporty czekają w telefonie na następną próbę
  }
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
              it.status = "sent"; it.sentAt = Date.now(); it.arch = "todo"; done++;
              // kopia raportu na telefonie (Word + PDF), potem Word na Dysk; Word z kolejki znika dopiero po potwierdzonym zapisie archiwum
              // (najpierw zapis „wysłany, archiwum do zrobienia”: zamknięcie apki w tym miejscu nie gubi Worda ani nie wysyła drugiego maila)
              return put(it).then(function () { return archive(it); }).then(function (ok) {
              it.arch = ok ? "" : "todo"; it.photos = [];
              if (ok) { it.docx = new Uint8Array(0); it.files = []; } // PDF zostaje w telefonie (04/11): z niego da się odtworzyć inspekcję
              if (it.ppm && window.OEST_PPM && OEST_PPM.markSent) OEST_PPM.markSent(it.ppm, it.id); // klocek PPM: W kolejce → Wysłana
              return put(it).then(function () { changed(it); return false; });
              });
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
        if (done) say(root.OESTT("Wysłano ✓ ", "Sent ✓ ") + (done === 1 ? root.OESTT("raport ", "report ") + todo[0].code : done + root.OESTT(" raporty", " reports")));
      });
      });
    }).catch(function (e) { loginErr = root.OESTT("błąd kolejki w telefonie: ", "phone queue error: ") + errText(e); }).then(function () {
      sending = false; pos = null; skipWifi = false; lock = null; render();
      // po każdej rundzie (też pustej albo bez Gmaila): zaległe raporty na Dysk, poza blokadą wysyłki maili; zgoda na dane z kliknięcia przechodzi dalej
      later({ anyNet: !!o.anyNet });
      if (opts.onIdle) try { opts.onIdle(); } catch (e) {}
      var w = idle; idle = []; w.forEach(function (f) { f(); });
    }));
  }
  function whenIdle() { return lock ? new Promise(function (r) { idle.push(r); }) : Promise.resolve(); }
  function say(t) { flash = t; clearTimeout(flashT); flashT = setTimeout(function () { flash = ""; render(); }, 4000); render(); }

  // ---------- pasek (stan dla paska na dole ekranu) ----------
  // Pasek rysuje szkielet Ionic (moduly/szkielet/src/czesci/PasekWysylki.vue w stopce ramy). Moduł podaje tylko zwykły obiekt
  // OESTSender.stan() i zdarzenie window „oest:wysylka” (detail = ten sam obiekt) po każdej zmianie; przyciski wołają OESTSender.akcja(a).
  //   { widoczny, ton: 'run'|'ok'|'wait'|'err', tekst, opis, przyciski: [{ a, tekst, glowny }], postep 0–1, siec: { stan: 'on'|'mid'|'off', tekst }, otwarty }
  var stan = { widoczny: false, ton: "", tekst: "", opis: "", przyciski: [], postep: 0, siec: { stan: "na", tekst: "" }, otwarty: false };
  function akcja(a) {
    if (a === "toggle") open = !open;
    else if (a === "data") { skipWifi = true; run({ login: true, anyNet: true }); }
    else if (a === "send") run({ login: true });
    else if (a === "retry") retry();
    else if (a === "share" && opts.onShare) opts.onShare();
    else if (a === "queue") { open = false; if (opts.onQueue) opts.onQueue(); else whenIdle().then(function () { root.location.href = opts.queueUrl; }); }
    render();
  }
  function retry() {
    loadAll().then(function () {
      return Promise.all(pending().filter(function (q) { return q.status === "err"; }).map(function (q) { q.status = "wait"; q.err = ""; changed(q); return put(q); }));
    }).then(function () { run({ login: true, anyNet: true }); }); // Ponów = świadoma decyzja, także przez dane
  }
  function render() {
    var cap = root.Capacitor;
    if (!(cap && cap.isNativePlatform && cap.isNativePlatform())) { stan = { widoczny: false, ton: "", tekst: "", opis: "", przyciski: [], postep: 0, siec: { stan: "na", tekst: "" }, otwarty: false }; emit(); return; } // pasek stale w apce
    var p = pending(), n = p.length, err = p.filter(function (q) { return q.status === "err"; })[0];
    var cls = "", txt = "", opis = "", more = [], prog = 0;
    var b = function (a, t, go) { return { a: a, tekst: t, glowny: !!go }; };
    var qb = b("queue", root.OESTT("Pokaż kolejkę", "Show queue"));
    if (!active()) { cls = "err"; txt = n ? root.OESTT("W kolejce: ", "Queued: ") + n + root.OESTT(" · Gmail niepołączony", " · Gmail not connected") : root.OESTT("Gmail niepołączony", "Gmail not connected");
      opis = root.OESTT("Żeby raporty szły same: Ustawienia → Konto → Wyloguj i zaloguj przez Google, uzupełnij firmowy e-mail w Mój profil.", "To send reports automatically: Settings → Account → Sign out and sign in with Google, then add your work email in My Profile."); more = [qb]; }
    else
    if (sending) {
      cls = "run"; prog = pos ? (pos.i - 0.5) / pos.n : 0.05;
      txt = pos ? root.OESTT("Wysyłam raport ", "Sending report ") + (pos.n > 1 ? pos.i + "/" + pos.n + " " : "") + "· " + pos.code + "…" : root.OESTT("Łączę z Gmailem…", "Connecting to Gmail…");
      opis = root.OESTT("Możesz dalej pracować. Nie zamykaj apki, dopóki pasek nie pokaże „Wysłano”.", "You can keep working. Do not close the app until the bar shows “Sent”."); more = [qb];
    } else if (flash) { cls = "ok"; txt = flash; prog = 1; more = [qb]; }
    else if (!n && unconfirmed().length) { cls = "wait"; txt = root.OESTT("Do potwierdzenia: ", "To confirm: ") + unconfirmed().length; opis = root.OESTT("Przekazane przez Udostępnij – potwierdź w kolejce, czy mail wyszedł.", "Handed over via Share – confirm in the queue whether the email went out."); more = [qb]; }
    else if (!n) { cls = "ok"; txt = root.OESTT("Wszystko wysłane", "All sent"); more = [qb]; }
    else if (err || loginErr) {
      cls = "err"; txt = root.OESTT("Nie wysłano: ", "Not sent: ") + (err ? err.err : loginErr);
      more = [b("retry", root.OESTT("Ponów", "Retry"), true)].concat(opts.onShare ? [b("share", root.OESTT("Wyślij przez Udostępnij", "Send via Share"))] : [], [qb]);
    } else if (!online()) { cls = "wait"; txt = root.OESTT("W kolejce: ", "Queued: ") + n + root.OESTT(" · czekam na sieć", " · waiting for network"); opis = root.OESTT("Wyślę sam, gdy wróci zasięg (apka musi być otwarta).", "I will send it when the signal returns (the app must be open)."); more = [qb]; }
    else if (wifiOnly() && !onWifi() && !skipWifi) {
      cls = "wait"; txt = root.OESTT("W kolejce: ", "Queued: ") + n + root.OESTT(" · czekam na Wi‑Fi", " · waiting for Wi‑Fi");
      opis = root.OESTT("Wyślę sam po połączeniu z Wi‑Fi.", "I will send it once on Wi‑Fi."); more = [b("data", root.OESTT("Wyślij teraz przez dane komórkowe", "Send now over mobile data"), true), qb];
    } else if (!G().connected("gmail")) { cls = "wait"; txt = root.OESTT("W kolejce: ", "Queued: ") + n + root.OESTT(" · dotknij, aby wysłać", " · tap to send"); more = [b("send", root.OESTT("Wyślij teraz", "Send now"), true), qb]; }
    else { cls = "wait"; txt = root.OESTT("W kolejce: ", "Queued: ") + n; more = [b("send", root.OESTT("Wyślij teraz", "Send now"), true), qb]; }
    var net = !online() ? ["off", root.OESTT("Brak sieci", "No network")] : onWifi() ? ["on", "Wi‑Fi"] : ["mid", root.OESTT("Dane", "Data")]; // lampka sieci
    stan = { widoczny: true, ton: cls, tekst: txt, opis: opis, przyciski: more, postep: prog, siec: { stan: net[0], tekst: net[1] }, otwarty: open };
    emit();
  }
  function emit() { try { root.dispatchEvent(new root.CustomEvent("oest:wysylka", { detail: stan })); } catch (e) {} }
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
  root.addEventListener("oest:lang", function () { render(); }); // zmiana języka: tylko nowy tekst paska
  root.addEventListener("online", kick); root.addEventListener("offline", render);
  if (root.navigator.connection && root.navigator.connection.addEventListener) root.navigator.connection.addEventListener("change", kick);
  doc.addEventListener("visibilitychange", function () { if (!doc.hidden) kick(); });
  setInterval(function () { if (!sending && pending().length) auto(); }, 60000);

  // Dodanie raportu do kolejki z dowolnego miejsca apki (np. Reactive): uzupełnia id, konto i status, potem wysyła w tle
  function enqueue(it) {
    var acct = (account() || {}).email || "";
    var rec = Object.assign({ id: (root.crypto && root.crypto.randomUUID ? root.crypto.randomUUID() : String(Date.now()) + Math.random()), created: Date.now(), acct: acct, status: "wait" }, it);
    return put(rec).then(function () { refresh(); run({ login: true }); return rec; });
  }
  root.OESTSender = { baza: baza, init: init, run: run, count: function () { return pending().length; }, toConfirm: function () { return unconfirmed().length; } /* „przekazano · niepotwierdzone” – nie „Wszystko wysłane” */, expand: function () { open = true; render(); }, stan: function () { return stan; }, akcja: akcja, enqueue: enqueue, active: active, busy: function () { return sending || !!lock; } /* też w trakcie sprawdzania połączenia: raportu z kolejki nie da się wtedy usunąć */, whenIdle: whenIdle, refresh: refresh, render: render, _errText: errText, recipients: recipients, myEmail: myEmail, reachable: reachable, syncReports: syncReports, update: update };
})(window);
